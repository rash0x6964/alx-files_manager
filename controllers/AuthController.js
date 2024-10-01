const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AuthController {
  static async getConnect(request, response) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
      const [email, pass] = auth.split(':');

      if (!email || !pass) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.db.collection('users').findOne({
        email,
        password: sha1(pass),
      });

      if (!user) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const key = `auth_${token}`;
      const duration = 60 * 60 * 24;
      await redisClient.set(key, user._id.toString(), duration);

      return response.status(200).json({ token });
    } catch (err) {
      console.log(err);
      return response.status(500).json({ error: 'Server error' });
    }
  }

  static async getDisconnect(request, response) {
    try {
      const userToken = request.header('X-Token');
      const userKey = await redisClient.get(`auth_${userToken}`);
      if (!userKey) {
        return response.status(401).json({ error: 'Unauthorized' });
      }
      await redisClient.del(`auth_${userToken}`);
      return response.status(204).send();
    } catch (err) {
      console.log(err);
      return response.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = AuthController;
