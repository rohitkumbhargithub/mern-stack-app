const express = require('express');
const protectRoute = require('../middleware/protectedRoute');
const router = express.Router();
const userController = require('../controllers/userControllers');

router.get('/', protectRoute , userController.getUsersSildeBar);



module.exports = router;