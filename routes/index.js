const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const FilesController = require('../controllers/FilesController');

const router = express.Router();
// AppController routes:

// Get status when redis and DB is ALive:
router.get('/status', AppController.getStatus);

// Get all stats (users and files in DB):
router.get('/stats', AppController.getStats);

// Create a new user in DB
router.post('/users', UsersController.postNew);

// Create a new file in DB and in disk
router.post('/files', FilesController.postUpload);

// Retrieve the file document based on the ID
router.get('/files/:id', FilesController.getShow);

// retrieve all users file documents for a specific parentId
// and with pagination
router.get('/files', FilesController.getIndex);

module.exports = router;
