const { ObjectId } = require('mongodb');

function isValidMongodbId(id) {
  try {
    ObjectId(id);
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { isValidMongodbId };
