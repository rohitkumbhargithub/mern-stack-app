const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protectedRoute');
const messageController = require('../controllers/messageController');


router.get('/:id', protectedRoute, messageController.getMessage);
router.post('/send/:id', protectedRoute , messageController.sendMessage);
router.post('/react/:id', protectedRoute, messageController.reactMessage);
router.post('/vote/:id', protectedRoute, messageController.votePoll);
router.delete('/delete/:id', protectedRoute, messageController.deleteMessage);


module.exports = router;