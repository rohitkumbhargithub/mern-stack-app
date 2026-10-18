const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');

const authControllers = require('../backend/controllers/authControllers');
const User = require('../backend/models/users');
const Otp = require('../backend/models/otp');
const emailService = require('../backend/services/emailService');

const createMockRes = () => {
    const res = {
        statusCode: 200,
        headers: {},
        cookies: {},
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        },
        cookie(name, value, options) {
            this.cookies[name] = { value, options };
            return this;
        }
    };
    return res;
};

describe('Auth Controllers - Signup, Login, OTP & Brevo Email Flow', () => {
    const originalEnv = { ...process.env };
    let originalUserFindOne, originalUserCreate;
    let originalOtpFindOne, originalOtpFindOneAndUpdate, originalOtpDeleteOne;
    let originalSendSignupOtpEmail;

    beforeEach(() => {
        process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret-key-1234567890', NODE_ENV: 'test' };

        originalUserFindOne = User.findOne;
        originalUserCreate = User.create;
        originalOtpFindOne = Otp.findOne;
        originalOtpFindOneAndUpdate = Otp.findOneAndUpdate;
        originalOtpDeleteOne = Otp.deleteOne;
        originalSendSignupOtpEmail = emailService.sendSignupOtpEmail;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        User.findOne = originalUserFindOne;
        User.create = originalUserCreate;
        Otp.findOne = originalOtpFindOne;
        Otp.findOneAndUpdate = originalOtpFindOneAndUpdate;
        Otp.deleteOne = originalOtpDeleteOne;
        emailService.sendSignupOtpEmail = originalSendSignupOtpEmail;
    });

    describe('requestSignupOtp / signup', () => {
        it('should return 400 if any required field is missing', async () => {
            const req = { body: { name: 'Test', email: 'test@example.com' } };
            const res = createMockRes();

            await authControllers.requestSignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.error, 'Please fill in all fields');
        });

        it('should return 400 if password and confirmPassword do not match', async () => {
            const req = {
                body: {
                    name: 'Test',
                    email: 'test@example.com',
                    password: 'password123',
                    confirmPassword: 'password456',
                    gender: 'male'
                }
            };
            const res = createMockRes();

            await authControllers.requestSignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.error, 'Passwords do not match');
        });

        it('should return 400 if password is less than 6 characters', async () => {
            const req = {
                body: {
                    name: 'Test',
                    email: 'test@example.com',
                    password: '123',
                    confirmPassword: '123',
                    gender: 'male'
                }
            };
            const res = createMockRes();

            await authControllers.requestSignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.error, 'Password must be at least 6 characters');
        });

        it('should return 400 if user already exists', async () => {
            User.findOne = async () => ({ _id: 'existing_user_id', email: 'test@example.com' });

            const req = {
                body: {
                    name: 'Test',
                    email: 'test@example.com',
                    password: 'password123',
                    confirmPassword: 'password123',
                    gender: 'male'
                }
            };
            const res = createMockRes();

            await authControllers.requestSignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.error, 'User already exists!');
        });

        it('should return 429 if OTP was requested less than 30 seconds ago', async () => {
            User.findOne = async () => null;
            Otp.findOne = async () => ({
                email: 'test@example.com',
                lastSentAt: new Date(Date.now() - 10 * 1000) // 10 seconds ago
            });

            const req = {
                body: {
                    name: 'Test',
                    email: 'test@example.com',
                    password: 'password123',
                    confirmPassword: 'password123',
                    gender: 'male'
                }
            };
            const res = createMockRes();

            await authControllers.requestSignupOtp(req, res);
            assert.strictEqual(res.statusCode, 429);
            assert.match(res.body.error, /Please wait/);
        });

        it('should create pending OTP, dispatch Brevo email, and return 200 with requiresVerification', async () => {
            User.findOne = async () => null;
            Otp.findOne = async () => null;

            let savedOtpRecord = null;
            Otp.findOneAndUpdate = async (filter, update) => {
                savedOtpRecord = { filter, update };
                return update;
            };

            let emailDispatchedParams = null;
            emailService.sendSignupOtpEmail = async (params) => {
                emailDispatchedParams = params;
                return { success: true, messageId: '<brevo-success-id@brevo.com>', provider: 'brevo' };
            };

            const req = {
                body: {
                    name: 'Rohit User',
                    email: 'newuser@example.com',
                    password: 'securepassword',
                    confirmPassword: 'securepassword',
                    gender: 'male'
                }
            };
            const res = createMockRes();

            await authControllers.requestSignupOtp(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.body.requiresVerification, true);
            assert.strictEqual(res.body.email, 'newuser@example.com');
            assert.strictEqual(res.body.message, 'Verification code sent to your email.');
            assert.strictEqual(res.body.expiresIn, 300);

            // Verify Otp was stored with hashed password
            assert.strictEqual(savedOtpRecord.filter.email, 'newuser@example.com');
            assert.strictEqual(savedOtpRecord.update.purpose, 'signup');
            assert.strictEqual(savedOtpRecord.update.payload.name, 'Rohit User');

            // Verify email dispatch called with recipient and 6-digit OTP
            assert.strictEqual(emailDispatchedParams.email, 'newuser@example.com');
            assert.strictEqual(emailDispatchedParams.name, 'Rohit User');
            assert.match(emailDispatchedParams.otp, /^\d{6}$/);
        });
    });

    describe('verifySignupOtp', () => {
        it('should return 400 if email or otp is missing', async () => {
            const req = { body: { email: 'test@example.com' } };
            const res = createMockRes();

            await authControllers.verifySignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.error, 'Email and OTP are required');
        });

        it('should return 400 if no pending registration exists', async () => {
            Otp.findOne = async () => null;

            const req = { body: { email: 'unknown@example.com', otp: '123456' } };
            const res = createMockRes();

            await authControllers.verifySignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.match(res.body.error, /No pending registration found/);
        });

        it('should return 400 and delete record if OTP is expired', async () => {
            let deletedEmail = null;
            Otp.findOne = async () => ({
                email: 'expired@example.com',
                expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
            });
            Otp.deleteOne = async (filter) => {
                deletedEmail = filter.email;
            };

            const req = { body: { email: 'expired@example.com', otp: '123456' } };
            const res = createMockRes();

            await authControllers.verifySignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.match(res.body.error, /Verification code expired/);
            assert.strictEqual(deletedEmail, 'expired@example.com');
        });

        it('should decrement remaining attempts on invalid OTP and return 400', async () => {
            const realHashedOtp = await bcrypt.hash('654321', 10);
            let savedAttempts = 0;

            const pendingRecord = {
                email: 'user@example.com',
                otp: realHashedOtp,
                expiresAt: new Date(Date.now() + 60000),
                attempts: 1,
                payload: { name: 'User', password: 'hash', gender: 'male' },
                purpose: 'signup',
                save: async function () {
                    savedAttempts = this.attempts;
                }
            };
            Otp.findOne = async () => pendingRecord;

            const req = { body: { email: 'user@example.com', otp: '000000' } }; // Wrong OTP
            const res = createMockRes();

            await authControllers.verifySignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(savedAttempts, 2);
            assert.strictEqual(res.body.error, 'Invalid verification code. 3 attempt(s) remaining.');
        });

        it('should lock out after 5 failed attempts and delete OTP session', async () => {
            let deletedRecord = false;
            Otp.findOne = async () => ({
                email: 'locked@example.com',
                attempts: 5,
                expiresAt: new Date(Date.now() + 60000)
            });
            Otp.deleteOne = async () => { deletedRecord = true; };

            const req = { body: { email: 'locked@example.com', otp: '123456' } };
            const res = createMockRes();

            await authControllers.verifySignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.match(res.body.error, /Too many failed attempts/);
            assert.strictEqual(deletedRecord, true);
        });

        it('should create user, clear OTP, and issue JWT cookie on valid OTP', async () => {
            const plainOtp = '789123';
            const hashedOtp = await bcrypt.hash(plainOtp, 10);
            let otpDeleted = false;
            let createdUserDoc = null;

            const pendingRecord = {
                email: 'valid@example.com',
                otp: hashedOtp,
                expiresAt: new Date(Date.now() + 60000),
                attempts: 0,
                payload: { name: 'Valid User', password: 'hashed_password_123', gender: 'male' },
                purpose: 'signup'
            };

            Otp.findOne = async () => pendingRecord;
            Otp.deleteOne = async () => { otpDeleted = true; };
            User.findOne = async () => null; // No existing user
            User.create = async (doc) => {
                createdUserDoc = { ...doc, _id: 'generated_user_id_99' };
                return createdUserDoc;
            };

            const req = { body: { email: 'valid@example.com', otp: plainOtp } };
            const res = createMockRes();

            await authControllers.verifySignupOtp(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.body._id, 'generated_user_id_99');
            assert.strictEqual(res.body.name, 'Valid User');
            assert.strictEqual(res.body.email, 'valid@example.com');
            assert.strictEqual(otpDeleted, true);
            assert.ok(res.cookies['jwt']);
            assert.ok(res.cookies['jwt'].value);
        });
    });

    describe('resendSignupOtp', () => {
        it('should return 400 if email is missing', async () => {
            const req = { body: {} };
            const res = createMockRes();

            await authControllers.resendSignupOtp(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.error, 'Email is required');
        });

        it('should return 404 if no pending registration exists', async () => {
            Otp.findOne = async () => null;

            const req = { body: { email: 'nonexistent@example.com' } };
            const res = createMockRes();

            await authControllers.resendSignupOtp(req, res);
            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.body.error, 'No pending registration found for this email.');
        });

        it('should return 429 if resend is attempted within 30 seconds', async () => {
            Otp.findOne = async () => ({
                email: 'user@example.com',
                purpose: 'signup',
                payload: { name: 'User' },
                lastSentAt: new Date(Date.now() - 5000) // 5 seconds ago
            });

            const req = { body: { email: 'user@example.com' } };
            const res = createMockRes();

            await authControllers.resendSignupOtp(req, res);
            assert.strictEqual(res.statusCode, 429);
            assert.match(res.body.error, /Please wait/);
        });

        it('should generate fresh OTP, reset attempts, and resend email successfully', async () => {
            let savedRecord = false;
            let dispatchedEmail = null;

            const pendingRecord = {
                email: 'user@example.com',
                purpose: 'signup',
                payload: { name: 'Alex' },
                attempts: 3,
                lastSentAt: new Date(Date.now() - 40000), // 40s ago (allowed)
                save: async function () { savedRecord = true; }
            };

            Otp.findOne = async () => pendingRecord;
            emailService.sendSignupOtpEmail = async (params) => {
                dispatchedEmail = params;
                return { success: true, messageId: 'resend-brevo-123', provider: 'brevo' };
            };

            const req = { body: { email: 'user@example.com' } };
            const res = createMockRes();

            await authControllers.resendSignupOtp(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.body.message, 'A new verification code has been sent to your email.');
            assert.strictEqual(savedRecord, true);
            assert.strictEqual(pendingRecord.attempts, 0);
            assert.strictEqual(dispatchedEmail.email, 'user@example.com');
            assert.match(dispatchedEmail.otp, /^\d{6}$/);
        });
    });

    describe('login & logout', () => {
        it('should return 400 if email or password is missing on login', async () => {
            const req = { body: { email: 'test@example.com' } };
            const res = createMockRes();

            await authControllers.login(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.error, 'Email and password are required');
        });

        it('should return 400 if user does not exist', async () => {
            User.findOne = async () => null;

            const req = { body: { email: 'nobody@example.com', password: 'password123' } };
            const res = createMockRes();

            await authControllers.login(req, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.error, 'Invalid email or password');
        });

        it('should login successfully with valid credentials and issue JWT cookie', async () => {
            const hashedPassword = await bcrypt.hash('correctPassword123', 10);
            User.findOne = async () => ({
                _id: 'user_id_456',
                name: 'Logged In User',
                email: 'login@example.com',
                password: hashedPassword,
                profile: '',
                aiSettings: { preferredProvider: 'gemini' }
            });

            const req = { body: { email: 'login@example.com', password: 'correctPassword123' } };
            const res = createMockRes();

            await authControllers.login(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.body.name, 'Logged In User');
            assert.strictEqual(res.body.email, 'login@example.com');
            assert.ok(res.cookies['jwt']);
            assert.ok(res.cookies['jwt'].value);
        });

        it('should clear JWT cookie on logout', async () => {
            const req = {};
            const res = createMockRes();

            await authControllers.logout(req, res);

            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.cookies['jwt'].options.maxAge, 0);
        });
    });
});
