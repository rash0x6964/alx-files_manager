const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const FilesController = require('../controllers/FilesController');

const router = express.Router();
// AppController routes:

// get status when redis and DB is ALive:
router.get('/status', AppController.getStatus);

// get all stats (users and files in DB):
router.get('/stats', AppController.getStats);

// create a new user in DB
router.post('/users', UsersController.postNew);

// Create a new file in DB and in disk
router.post('/files', FilesController.postUpload);

module.exports = router;
