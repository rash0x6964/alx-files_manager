const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  /**
   * should return status 200, if redis isAlive()-> true, and dbisAlive()->true
   */
  static getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    res.status(200).send(status);
  }

  /**
   * should return number of file and users in db, with status code 200
   */
  static async getStats(req, res) {
    const stats = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    res.status(200).send(stats);
  }
}
module.exports = AppController;
