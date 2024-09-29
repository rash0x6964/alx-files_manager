const sha1 = require('sha1');
const dbClient = require('../utils/db');

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
}

module.exports = UsersController;
