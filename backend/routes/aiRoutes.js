const express = require('express');
const protectRoute = require('../middleware/protectedRoute');
const aiController = require('../controllers/aiController');

const router = express.Router();

router.post('/chat', protectRoute, aiController.chatWithAI);
router.post('/suggestions', protectRoute, aiController.getSmartReplies);
router.post('/rewrite', protectRoute, aiController.rewriteDraft);
router.post('/summarize', protectRoute, aiController.summarizeThread);
router.post('/translate', protectRoute, aiController.translateMessage);

module.exports = router;
