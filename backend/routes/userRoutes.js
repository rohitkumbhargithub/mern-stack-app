const express = require('express');
const protectRoute = require('../middleware/protectedRoute');
const router = express.Router();
const userController = require('../controllers/userControllers');

router.get('/', protectRoute , userController.getUsersSildeBar);
router.get('/search', protectRoute , userController.searchUsers);
router.put('/update', protectRoute, userController.updateProfile);



module.exports = router;