const express = require('express');
const router = express.Router();
const protectedRoute = require('../middleware/protectedRoute');
const messageController = require('../controllers/messageController');


const upload = require('../middleware/uploadMiddleware');

router.post('/upload', protectedRoute, upload.array('files', 5), messageController.uploadFiles);
router.post('/upload-voice', protectedRoute, upload.single('audio'), messageController.uploadVoiceNote);
router.get('/link-preview/info', protectedRoute, messageController.getLinkPreview);
router.post('/link-preview', protectedRoute, messageController.getLinkPreview);
router.get('/:id', protectedRoute, messageController.getMessage);
router.post('/send/:id', protectedRoute , messageController.sendMessage);
router.post('/react/:id', protectedRoute, messageController.reactMessage);
router.post('/vote/:id', protectedRoute, messageController.votePoll);
router.delete('/delete/:id', protectedRoute, messageController.deleteMessage);

module.exports = router;