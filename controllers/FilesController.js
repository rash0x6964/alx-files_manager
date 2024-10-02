const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const { isValidMongodbId } = require('../utils/utils');
const fileQueue = require('../worker');

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId) {
      const parentFile = await dbClient.db
        .collection('files')
        .findOne(ObjectId(parentId));
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const relativPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (type === 'folder') {
      const newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId,
      };

      const file = await dbClient.db.collection('files').insertOne(newFile);
      return res.status(201).json({
        id: file.insertedId,
        userId: newFile.userId,
        name: newFile.name,
        type: newFile.type,
        isPublic: newFile.isPublic,
        parentId: newFile.parentId,
      });
    }

    const fileId = uuidv4();
    const localPath = path.join(relativPath, fileId);

    fs.mkdirSync(relativPath, { recursive: true });

    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(localPath, buffer);

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath,
    };

    const result = await dbClient.db.collection('files').insertOne(newFile);

    if (newFile.type === 'image') {
      fileQueue.add({
        userId: newFile.userId,
        fileId: result.insertedId,
      });
    }

    return res.status(201).json({
      id: result.insertedId,
      userId: newFile.userId,
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
    });
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id || '';
    if (!isValidMongodbId(fileId)) {
      return res.status(404).send({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });
    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }

    return res.status(200).send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;

    const aggData = [
      { $match: parentId === 0 ? {} : { parentId: ObjectId(parentId) } },
      { $skip: page * pageSize },
      { $limit: pageSize },
    ];

    const result = await dbClient.db
      .collection('files')
      .aggregate(aggData)
      .toArray();

    const files = [];
    result.forEach((file) => {
      const fileObj = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      };
      files.push(fileObj);
    });

    return res.send(files);
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const { size } = req.query;

    if (!isValidMongodbId(fileId)) {
      return res.status(404).send({ error: 'Not found' });
    }

    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(fileId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!file.isPublic) {
      if (file.userId.toString() !== userId) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let filePath = file.localPath;
    if (size && [100, 250, 500].includes(parseInt(size, 10))) {
      filePath = `${filePath}_${size}`;
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name);
    res.setHeader('Content-Type', mimeType);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    return new Promise((resolve, reject) => {
      fileStream.on('end', resolve);
      fileStream.on('error', (err) => {
        res.status(500).json({ error: 'Internal Server Error' });
        reject(err);
      });
    });
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const fileId = req.params.id || '';
    if (!isValidMongodbId(fileId)) {
      return res.status(404).send({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });
    if (!file) return res.status(404).send({ error: 'Not found' });

    const updatedFile = await dbClient.db
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId: ObjectId(userId) },
        { $set: { isPublic: true } },
        { returnDocument: 'after' },
      );

    return res.status(200).json({
      id: updatedFile.value._id,
      userId: updatedFile.value.userId,
      name: updatedFile.value.name,
      type: updatedFile.value.type,
      isPublic: updatedFile.value.isPublic,
      parentId: updatedFile.value.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const fileId = req.params.id || '';
    if (!isValidMongodbId(fileId)) {
      return res.status(404).send({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });
    if (!file) return res.status(404).send({ error: 'Not found' });

    const updatedFile = await dbClient.db
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId: ObjectId(userId) },
        { $set: { isPublic: false } },
        { returnDocument: 'after' },
      );

    return res.status(200).json({
      id: updatedFile.value._id,
      userId: updatedFile.value.userId,
      name: updatedFile.value.name,
      type: updatedFile.value.type,
      isPublic: updatedFile.value.isPublic,
      parentId: updatedFile.value.parentId,
    });
  }
}

module.exports = FilesController;
