const sha1 = require('sha1');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const alreadyExist = await dbClient.db
      .collection('users')
      .findOne({ email });
    if (alreadyExist) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const newUser = {
      email,
      password: sha1(password),
    };

    const result = await dbClient.db.collection('users').insertOne(newUser);
    console.log(result);

    return res.status(201).json({ id: result.insertedId, email });
  }

  static async getMe(req, res) {
    try {
      const userToken = req.header('X-Token');
      const authKey = `auth_${userToken}`;
      const userID = await redisClient.get(authKey);

      if (!userID) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.db
        .collection('users')
        .findOne({ _id: ObjectId(userID) });
      return res.json({ id: user._id, email: user.email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = UsersController;
