const express = require('express');
const protectRoute = require('../middleware/protectedRoute');
const router = express.Router();
const userController = require('../controllers/userControllers');

router.get('/', protectRoute , userController.getUsersSildeBar);
router.get('/search', protectRoute , userController.searchUsers);
router.post('/group', protectRoute, userController.createGroupConversation);
router.post('/group/:id/exit', protectRoute, userController.exitGroup);
router.delete('/conversation/:id', protectRoute, userController.deleteConversation);
router.put('/update', protectRoute, userController.updateProfile);

module.exports = router;