const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const protectedRoute = require('../middleware/protectedRoute');

// Public — frontend needs this key before user is subscribed
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Protected — must be logged in
router.post('/subscribe',   protectedRoute, pushController.subscribe);
router.delete('/unsubscribe', protectedRoute, pushController.unsubscribe);

module.exports = router;
