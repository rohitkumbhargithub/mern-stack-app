const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');

router.post('/login', authController.login);
router.post('/signup', authController.signup || authController.requestSignupOtp || authController.singup);
router.post('/signup/verify', authController.verifySignupOtp || authController.verifyOtp);
router.post('/signup/resend', authController.resendSignupOtp || authController.resendOtp);
router.post('/logout', authController.logout);

module.exports = router;