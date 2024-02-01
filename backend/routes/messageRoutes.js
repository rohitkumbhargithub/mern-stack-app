const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protectedRoute');
const messageController = require('../controllers/messageController');


router.get('/:id', protectedRoute, messageController.getMessage);
router.post('/send/:id', protectedRoute , messageController.sendMessage);


module.exports = router;