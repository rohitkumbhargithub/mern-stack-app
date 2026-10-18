const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const emailService = require('../backend/services/emailService');

describe('Email Service - Brevo Integration & Provider Fallback Suite', () => {
    const originalEnv = { ...process.env };
    const originalFetch = global.fetch;

    beforeEach(() => {
        // Reset process.env before each test
        process.env = { ...originalEnv };
        delete process.env.BREVO_API_KEY;
        delete process.env.RESEND_API_KEY;
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;
        delete process.env.GMAIL_USER;
        delete process.env.GMAIL_PASS;
        delete process.env.EMAIL_PROVIDER;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        global.fetch = originalFetch;
    });

    describe('sendViaBrevo (HTTP REST API)', () => {
        it('should return null when BREVO_API_KEY is not set', async () => {
            const result = await emailService.sendViaBrevo({
                email: 'test@example.com',
                name: 'Test User',
                otp: '123456',
                htmlContent: '<p>Code: 123456</p>'
            });
            assert.strictEqual(result, null);
        });

        it('should send email successfully with Brevo API key and return messageId', async () => {
            process.env.BREVO_API_KEY = 'xkeysib-mock-valid-key-12345';
            process.env.BREVO_SENDER_EMAIL = 'verified@sendchat.app';
            process.env.BREVO_SENDER_NAME = 'SendChat Team';

            let capturedUrl = '';
            let capturedOptions = {};

            global.fetch = async (url, options) => {
                capturedUrl = url;
                capturedOptions = options;
                return {
                    ok: true,
                    status: 201,
                    text: async () => JSON.stringify({ messageId: '<20261018.brevo.test@smtp-relay.brevo.com>' })
                };
            };

            const result = await emailService.sendViaBrevo({
                email: 'recipient@example.com',
                name: 'Recipient Name',
                otp: '849201',
                htmlContent: '<p>849201</p>'
            });

            // Verify API endpoint
            assert.strictEqual(capturedUrl, 'https://api.brevo.com/v3/smtp/email');
            assert.strictEqual(capturedOptions.method, 'POST');

            // Verify Headers
            assert.strictEqual(capturedOptions.headers['api-key'], 'xkeysib-mock-valid-key-12345');
            assert.strictEqual(capturedOptions.headers['Content-Type'], 'application/json');
            assert.strictEqual(capturedOptions.headers['accept'], 'application/json');

            // Verify Payload
            const body = JSON.parse(capturedOptions.body);
            assert.deepStrictEqual(body.sender, { name: 'SendChat Team', email: 'verified@sendchat.app' });
            assert.deepStrictEqual(body.to, [{ email: 'recipient@example.com', name: 'Recipient Name' }]);
            assert.strictEqual(body.subject, '🔐 849201 is your SendChat verification code');
            assert.match(body.textContent, /849201/);
            assert.strictEqual(body.htmlContent, '<p>849201</p>');

            // Verify returned messageId
            assert.strictEqual(result.messageId, '<20261018.brevo.test@smtp-relay.brevo.com>');
        });

        it('should handle Brevo 401 Unauthorized (Invalid API Key) error', async () => {
            process.env.BREVO_API_KEY = 'invalid_key';

            global.fetch = async () => ({
                ok: false,
                status: 401,
                text: async () => JSON.stringify({ code: 'unauthorized', message: 'Key not found' })
            });

            await assert.rejects(
                async () => {
                    await emailService.sendViaBrevo({
                        email: 'recipient@example.com',
                        name: 'Recipient',
                        otp: '123456',
                        htmlContent: '<p>123456</p>'
                    });
                },
                /Key not found/
            );
        });

        it('should handle Brevo 400 Bad Request (Sender not confirmed) error', async () => {
            process.env.BREVO_API_KEY = 'valid_key';

            global.fetch = async () => ({
                ok: false,
                status: 400,
                text: async () => JSON.stringify({ code: 'invalid_parameter', message: 'Sender is not registered or not confirmed' })
            });

            await assert.rejects(
                async () => {
                    await emailService.sendViaBrevo({
                        email: 'recipient@example.com',
                        name: 'Recipient',
                        otp: '123456',
                        htmlContent: '<p>123456</p>'
                    });
                },
                /Sender is not registered or not confirmed/
            );
        });

        it('should handle Brevo 402 Payment Required (Quota Exceeded) error', async () => {
            process.env.BREVO_API_KEY = 'valid_key';

            global.fetch = async () => ({
                ok: false,
                status: 402,
                text: async () => JSON.stringify({ code: 'payment_required', message: 'Account limit exceeded: 300 free credits exhausted' })
            });

            await assert.rejects(
                async () => {
                    await emailService.sendViaBrevo({
                        email: 'recipient@example.com',
                        name: 'Recipient',
                        otp: '123456',
                        htmlContent: '<p>123456</p>'
                    });
                },
                /Account limit exceeded/
            );
        });

        it('should handle non-JSON / HTML error responses gracefully without syntax error', async () => {
            process.env.BREVO_API_KEY = 'valid_key';

            global.fetch = async () => ({
                ok: false,
                status: 502,
                text: async () => '<html><body>502 Bad Gateway</body></html>'
            });

            await assert.rejects(
                async () => {
                    await emailService.sendViaBrevo({
                        email: 'recipient@example.com',
                        name: 'Recipient',
                        otp: '123456',
                        htmlContent: '<p>123456</p>'
                    });
                },
                /502 Bad Gateway/
            );
        });

        it('should default sender to robitkumbhar956@gmail.com when custom sender is omitted', async () => {
            process.env.BREVO_API_KEY = 'valid_key';
            delete process.env.BREVO_SENDER_EMAIL;
            delete process.env.BREVO_SENDER;
            delete process.env.SMTP_USER;

            let capturedBody = null;
            global.fetch = async (url, options) => {
                capturedBody = JSON.parse(options.body);
                return {
                    ok: true,
                    status: 201,
                    text: async () => JSON.stringify({ messageId: 'msg-1' })
                };
            };

            await emailService.sendViaBrevo({
                email: 'test@example.com',
                name: 'User',
                otp: '111222',
                htmlContent: '<p>111222</p>'
            });

            assert.strictEqual(capturedBody.sender.email, 'robitkumbhar956@gmail.com');
            assert.strictEqual(capturedBody.sender.name, 'SendChat Security');
        });
    });

    describe('sendViaResend (HTTP REST API)', () => {
        it('should return null when RESEND_API_KEY is not set', async () => {
            const result = await emailService.sendViaResend({
                email: 'test@example.com',
                name: 'Test',
                otp: '123456',
                htmlContent: '<p>OTP</p>'
            });
            assert.strictEqual(result, null);
        });

        it('should send email successfully via Resend API and return id', async () => {
            process.env.RESEND_API_KEY = 're_test_key_123';

            global.fetch = async (url, options) => {
                assert.strictEqual(url, 'https://api.resend.com/emails');
                assert.strictEqual(options.headers['Authorization'], 'Bearer re_test_key_123');
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({ id: 'resend_email_id_999' })
                };
            };

            const result = await emailService.sendViaResend({
                email: 'recipient@example.com',
                name: 'Recipient',
                otp: '654321',
                htmlContent: '<p>654321</p>'
            });

            assert.strictEqual(result.id, 'resend_email_id_999');
        });

        it('should throw error when Resend API returns an error response', async () => {
            process.env.RESEND_API_KEY = 're_test_key_123';

            global.fetch = async () => ({
                ok: false,
                status: 403,
                text: async () => JSON.stringify({ message: 'You can only send testing emails to your own email address' })
            });

            await assert.rejects(
                async () => {
                    await emailService.sendViaResend({
                        email: 'other@example.com',
                        name: 'Other',
                        otp: '654321',
                        htmlContent: '<p>654321</p>'
                    });
                },
                /only send testing emails/
            );
        });
    });

    describe('createTransporter (SMTP Configuration)', () => {
        it('should return null if credentials are empty', () => {
            const transporter = emailService.createTransporter();
            assert.strictEqual(transporter, null);
        });

        it('should configure Brevo standard SMTP when SMTP_HOST=smtp-relay.brevo.com', () => {
            process.env.SMTP_HOST = 'smtp-relay.brevo.com';
            process.env.SMTP_PORT = '587';
            process.env.SMTP_USER = 'robitkumbhar956@gmail.com';
            process.env.SMTP_PASS = 'brevo_master_password_123';

            const transporter = emailService.createTransporter();
            assert.ok(transporter !== null);
            assert.strictEqual(transporter.options.host, 'smtp-relay.brevo.com');
            assert.strictEqual(transporter.options.port, 587);
            assert.strictEqual(transporter.options.secure, false);
            assert.strictEqual(transporter.options.auth.user, 'robitkumbhar956@gmail.com');
            assert.strictEqual(transporter.options.auth.pass, 'brevo_master_password_123');
        });

        it('should configure Gmail service profile when host includes gmail', () => {
            process.env.SMTP_HOST = 'smtp.gmail.com';
            process.env.SMTP_PORT = '587';
            process.env.SMTP_USER = 'test@gmail.com';
            process.env.SMTP_PASS = 'abcd efgh ijkl mnop'; // App password with spaces

            const transporter = emailService.createTransporter();
            assert.ok(transporter !== null);
            // Verify password spaces were stripped
            assert.strictEqual(transporter.options.auth.pass, 'abcdefghijklmnop');
            assert.strictEqual(transporter.options.service, 'gmail');
        });
    });

    describe('sendSignupOtpEmail (Cascading Fallback & Priority)', () => {
        it('should prioritize Brevo HTTP API by default when BREVO_API_KEY is present', async () => {
            process.env.BREVO_API_KEY = 'xkeysib-brevo-active';
            process.env.RESEND_API_KEY = 're_resend_active';

            let calledProvider = null;
            global.fetch = async (url) => {
                if (url.includes('brevo.com')) {
                    calledProvider = 'brevo';
                    return {
                        ok: true,
                        status: 201,
                        text: async () => JSON.stringify({ messageId: 'brevo-msg-001' })
                    };
                }
                if (url.includes('resend.com')) {
                    calledProvider = 'resend';
                    return {
                        ok: true,
                        status: 200,
                        text: async () => JSON.stringify({ id: 'resend-msg-001' })
                    };
                }
                throw new Error('Unknown URL: ' + url);
            };

            const result = await emailService.sendSignupOtpEmail({
                email: 'test@example.com',
                name: 'Alex',
                otp: '777888'
            });

            assert.strictEqual(calledProvider, 'brevo');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.provider, 'brevo');
            assert.strictEqual(result.messageId, 'brevo-msg-001');
        });

        it('should fall back to Resend API if Brevo API fails', async () => {
            process.env.BREVO_API_KEY = 'xkeysib-failing-key';
            process.env.RESEND_API_KEY = 're_fallback_key';

            let brevoAttempted = false;
            let resendAttempted = false;

            global.fetch = async (url) => {
                if (url.includes('brevo.com')) {
                    brevoAttempted = true;
                    return {
                        ok: false,
                        status: 401,
                        text: async () => JSON.stringify({ message: 'Key not found' })
                    };
                }
                if (url.includes('resend.com')) {
                    resendAttempted = true;
                    return {
                        ok: true,
                        status: 200,
                        text: async () => JSON.stringify({ id: 'resend-fallback-id' })
                    };
                }
                throw new Error('Unknown URL: ' + url);
            };

            const result = await emailService.sendSignupOtpEmail({
                email: 'test@example.com',
                name: 'Alex',
                otp: '777888'
            });

            assert.strictEqual(brevoAttempted, true);
            assert.strictEqual(resendAttempted, true);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.provider, 'resend');
            assert.strictEqual(result.messageId, 'resend-fallback-id');
        });

        it('should respect EMAIL_PROVIDER=resend override when explicitly set', async () => {
            process.env.EMAIL_PROVIDER = 'resend';
            process.env.BREVO_API_KEY = 'xkeysib-brevo-active';
            process.env.RESEND_API_KEY = 're_resend_active';

            let firstCalled = null;
            global.fetch = async (url) => {
                if (!firstCalled) {
                    firstCalled = url.includes('resend.com') ? 'resend' : 'brevo';
                }
                return {
                    ok: true,
                    status: 200,
                    text: async () => JSON.stringify({ id: 'resend-explicit-id', messageId: 'msg-id' })
                };
            };

            const result = await emailService.sendSignupOtpEmail({
                email: 'test@example.com',
                name: 'Alex',
                otp: '777888'
            });

            assert.strictEqual(firstCalled, 'resend');
            assert.strictEqual(result.provider, 'resend');
        });

        it('should fall back to console devMode if all providers fail or are unconfigured', async () => {
            // No keys or hosts configured
            const result = await emailService.sendSignupOtpEmail({
                email: 'offline@example.com',
                name: 'Offline Dev',
                otp: '999111'
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.devMode, true);
            assert.strictEqual(result.otp, '999111');
        });

        it('should alias sendLoginOtpEmail to sendSignupOtpEmail', () => {
            assert.strictEqual(emailService.sendLoginOtpEmail, emailService.sendSignupOtpEmail);
        });
    });
});
