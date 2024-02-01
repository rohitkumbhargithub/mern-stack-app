const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');

router.post('/login', authController.login);
router.post('/signup', authController.singup);
router.post('/logout', authController.logout);



module.exports = router;