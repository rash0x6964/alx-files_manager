const express = require('express');
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController');
const AuthController = require('../controllers/AuthController');

const router = express.Router();
/**  AppController routes: */

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);

/** Authenticate a user routes: */

router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.Disconnect);
router.get('/me', UsersController.getMe);

module.exports = router;
