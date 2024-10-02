const fs = require('fs');
const Bull = require('bull');
const { ObjectId } = require('mongodb');
const imageThumbnail = require('image-thumbnail');
const dbClient = require('./utils/db');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.db
    .collection('files')
    .findOne({ _id: ObjectId(fileId), userId });
  if (!file) throw new Error('File not found');

  try {
    const sizes = [500, 250, 100];
    const thumbnailPromises = sizes.map(async (size) => {
      const thumbnail = await imageThumbnail(file.localPath, { width: size });
      return fs.promises.writeFile(`${file.localPath}_${size}`, thumbnail);
    });

    await Promise.all(thumbnailPromises);
    done();
  } catch (error) {
    done(error);
  }
});

module.exports = fileQueue;
