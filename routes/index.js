const express = require('express');
const AppController = require('../controllers/AppController');

const router = express.Router();
// AppController routes:

// get status when redis and DB is ALive:
router.get('/status', AppController.getStatus);

// get all stats (users and files in DB):
router.get('/stats', AppController.getStats);

module.exports = router;
