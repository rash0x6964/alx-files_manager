const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
      const [email, pass] = auth.split(':');

      if (!email || !pass) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.db.collection('users').findOne({
        email,
        password: sha1(pass),
      });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const key = `auth_${token}`;
      const duration = 60 * 60 * 24;
      await redisClient.set(key, user._id.toString(), duration);

      return res.status(200).json({ token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getDisconnect(req, res) {
    try {
      const userToken = req.header('X-Token');
      const userKey = await redisClient.get(`auth_${userToken}`);
      if (!userKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await redisClient.del(`auth_${userToken}`);
      return res.status(204).send();
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = AuthController;
