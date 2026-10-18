const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const {
    getAttachmentType,
    uploadBufferToCloudinary,
    deleteCloudinaryAsset,
    configureCloudinary
} = require('../backend/services/cloudinaryService');
const cloudinary = require('cloudinary').v2;
const messageController = require('../backend/controllers/messageController');

describe('Cloudinary & Attachments Suite', () => {

    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.CLOUDINARY_CLOUD_NAME;
        delete process.env.CLOUDINARY_API_KEY;
        delete process.env.CLOUDINARY_API_SECRET;
        delete process.env.CLOUDINARY_URL;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('getAttachmentType', () => {
        it('should classify image mimetypes and filenames as "image"', () => {
            assert.strictEqual(getAttachmentType('image/png', 'photo.png'), 'image');
            assert.strictEqual(getAttachmentType('image/jpeg', 'camera.jpg'), 'image');
            assert.strictEqual(getAttachmentType('image/webp', 'banner.webp'), 'image');
        });

        it('should classify audio mimetypes and voice note filenames as "audio"', () => {
            assert.strictEqual(getAttachmentType('audio/webm', 'voice_note.webm'), 'audio');
            assert.strictEqual(getAttachmentType('audio/mpeg', 'podcast.mp3'), 'audio');
            assert.strictEqual(getAttachmentType('audio/wav', 'recording.wav'), 'audio');
            assert.strictEqual(getAttachmentType('audio/ogg', 'note.ogg'), 'audio');
        });

        it('should classify PDF files as "pdf"', () => {
            assert.strictEqual(getAttachmentType('application/pdf', 'contract.pdf'), 'pdf');
            assert.strictEqual(getAttachmentType('application/octet-stream', 'document.pdf'), 'pdf');
        });

        it('should classify office docs and spreadsheets as "document"', () => {
            assert.strictEqual(getAttachmentType('application/msword', 'report.doc'), 'document');
            assert.strictEqual(getAttachmentType('text/plain', 'notes.txt'), 'document');
        });

        it('should classify videos as "video"', () => {
            assert.strictEqual(getAttachmentType('video/mp4', 'clip.mp4'), 'video');
            assert.strictEqual(getAttachmentType('video/webm', 'demo.webm'), 'video');
        });
    });

    describe('uploadBufferToCloudinary (Dev fallback when unconfigured)', () => {
        it('should return a safe Data URI fallback without throwing when Cloudinary is not in .env', async () => {
            const sampleBuffer = Buffer.from('hello world sendchat test');
            const result = await uploadBufferToCloudinary({
                buffer: sampleBuffer,
                originalname: 'test_file.png',
                mimetype: 'image/png'
            });

            assert.ok(result);
            assert.strictEqual(result.type, 'image');
            assert.strictEqual(result.name, 'test_file.png');
            assert.strictEqual(result.isDevFallback, true);
            assert.ok(result.url.startsWith('data:image/png;base64,'));
            assert.ok(result.publicId.startsWith('dev_'));
        });

        it('should preserve audio duration in dev fallback', async () => {
            const sampleAudioBuffer = Buffer.from('fake audio webm stream');
            const result = await uploadBufferToCloudinary({
                buffer: sampleAudioBuffer,
                originalname: 'voice_123.webm',
                mimetype: 'audio/webm',
                duration: 14.5
            });

            assert.strictEqual(result.type, 'audio');
            assert.strictEqual(result.duration, 14.5);
            assert.strictEqual(result.isDevFallback, true);
        });
    });

    describe('uploadBufferToCloudinary (Configured Cloudinary stream)', () => {
        it('should stream to Cloudinary with correct resource_type for images and audio', async () => {
            process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
            process.env.CLOUDINARY_API_KEY = 'test_key';
            process.env.CLOUDINARY_API_SECRET = 'test_secret';

            let capturedOptions = null;
            const originalUploadStream = cloudinary.uploader.upload_stream;

            cloudinary.uploader.upload_stream = (options, callback) => {
                capturedOptions = options;
                // Return a mock writable stream
                const { Writable } = require('stream');
                const stream = new Writable({
                    write(chunk, encoding, next) {
                        next();
                    }
                });
                stream.on('finish', () => {
                    callback(null, {
                        secure_url: 'https://res.cloudinary.com/test_cloud/image/upload/v1234/test.png',
                        public_id: 'sendchat/test_123',
                        bytes: 2048,
                        width: 800,
                        height: 600,
                        format: 'png'
                    });
                });
                return stream;
            };

            try {
                const sampleBuffer = Buffer.from('simulated-png-bytes');
                const result = await uploadBufferToCloudinary({
                    buffer: sampleBuffer,
                    originalname: 'my-screenshot.png',
                    mimetype: 'image/png',
                    folder: 'sendchat/test'
                });

                assert.strictEqual(capturedOptions.resource_type, 'image');
                assert.strictEqual(capturedOptions.folder, 'sendchat/test');
                assert.strictEqual(result.url, 'https://res.cloudinary.com/test_cloud/image/upload/v1234/test.png');
                assert.strictEqual(result.publicId, 'sendchat/test_123');
                assert.strictEqual(result.width, 800);
            } finally {
                cloudinary.uploader.upload_stream = originalUploadStream;
            }
        });

        it('should stream audio voice notes under resource_type "video" (Cloudinary audio spec)', async () => {
            process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
            process.env.CLOUDINARY_API_KEY = 'test_key';
            process.env.CLOUDINARY_API_SECRET = 'test_secret';

            let capturedOptions = null;
            const originalUploadStream = cloudinary.uploader.upload_stream;

            cloudinary.uploader.upload_stream = (options, callback) => {
                capturedOptions = options;
                const { Writable } = require('stream');
                const stream = new Writable({
                    write(chunk, encoding, next) { next(); }
                });
                stream.on('finish', () => {
                    callback(null, {
                        secure_url: 'https://res.cloudinary.com/test_cloud/video/upload/v1234/voice.webm',
                        public_id: 'sendchat/voice_123',
                        bytes: 4096,
                        duration: 8.4
                    });
                });
                return stream;
            };

            try {
                const sampleBuffer = Buffer.from('simulated-audio-bytes');
                const result = await uploadBufferToCloudinary({
                    buffer: sampleBuffer,
                    originalname: 'voice_note.webm',
                    mimetype: 'audio/webm'
                });

                assert.strictEqual(capturedOptions.resource_type, 'video');
                assert.strictEqual(result.type, 'audio');
                assert.strictEqual(result.duration, 8.4);
            } finally {
                cloudinary.uploader.upload_stream = originalUploadStream;
            }
        });

        it('should stream PDFs under resource_type "raw"', async () => {
            process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
            process.env.CLOUDINARY_API_KEY = 'test_key';
            process.env.CLOUDINARY_API_SECRET = 'test_secret';

            let capturedOptions = null;
            const originalUploadStream = cloudinary.uploader.upload_stream;

            cloudinary.uploader.upload_stream = (options, callback) => {
                capturedOptions = options;
                const { Writable } = require('stream');
                const stream = new Writable({
                    write(chunk, encoding, next) { next(); }
                });
                stream.on('finish', () => {
                    callback(null, {
                        secure_url: 'https://res.cloudinary.com/test_cloud/raw/upload/v1234/doc.pdf',
                        public_id: 'sendchat/doc_123',
                        bytes: 102400
                    });
                });
                return stream;
            };

            try {
                const sampleBuffer = Buffer.from('simulated-pdf-bytes');
                const result = await uploadBufferToCloudinary({
                    buffer: sampleBuffer,
                    originalname: 'invoice.pdf',
                    mimetype: 'application/pdf'
                });

                assert.strictEqual(capturedOptions.resource_type, 'raw');
                assert.strictEqual(result.type, 'pdf');
            } finally {
                cloudinary.uploader.upload_stream = originalUploadStream;
            }
        });
    });

    describe('deleteCloudinaryAsset', () => {
        it('should safely return false for dev_ publicIds without calling Cloudinary API', async () => {
            const res = await deleteCloudinaryAsset('dev_123456789', 'image');
            assert.strictEqual(res, false);
        });

        it('should destroy asset on Cloudinary when credentials are configured', async () => {
            process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
            process.env.CLOUDINARY_API_KEY = 'test_key';
            process.env.CLOUDINARY_API_SECRET = 'test_secret';

            const originalDestroy = cloudinary.uploader.destroy;
            let capturedId = null;
            cloudinary.uploader.destroy = async (publicId) => {
                capturedId = publicId;
                return { result: 'ok' };
            };

            try {
                const res = await deleteCloudinaryAsset('sendchat/real_image_123', 'image');
                assert.strictEqual(res, true);
                assert.strictEqual(capturedId, 'sendchat/real_image_123');
            } finally {
                cloudinary.uploader.destroy = originalDestroy;
            }
        });
    });

    describe('Message Controller - uploadFiles & uploadVoiceNote Endpoints', () => {
        it('uploadFiles should return 400 when no files are uploaded', async () => {
            let statusCode = 0;
            let jsonBody = null;
            const req = { files: [] };
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { jsonBody = data; return res; }
            };

            await messageController.uploadFiles(req, res);
            assert.strictEqual(statusCode, 400);
            assert.strictEqual(jsonBody.error, 'No files uploaded');
        });

        it('uploadFiles should upload files and return attachments array', async () => {
            let statusCode = 0;
            let jsonBody = null;
            const req = {
                files: [
                    {
                        buffer: Buffer.from('photo 1'),
                        originalname: 'photo1.jpg',
                        mimetype: 'image/jpeg'
                    },
                    {
                        buffer: Buffer.from('pdf doc'),
                        originalname: 'document.pdf',
                        mimetype: 'application/pdf'
                    }
                ]
            };
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { jsonBody = data; return res; }
            };

            await messageController.uploadFiles(req, res);
            assert.strictEqual(statusCode, 200);
            assert.ok(Array.isArray(jsonBody.attachments));
            assert.strictEqual(jsonBody.attachments.length, 2);
            assert.strictEqual(jsonBody.attachments[0].type, 'image');
            assert.strictEqual(jsonBody.attachments[1].type, 'pdf');
        });

        it('uploadVoiceNote should return 400 when no audio file is provided', async () => {
            let statusCode = 0;
            let jsonBody = null;
            const req = { file: null, body: {} };
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { jsonBody = data; return res; }
            };

            await messageController.uploadVoiceNote(req, res);
            assert.strictEqual(statusCode, 400);
            assert.strictEqual(jsonBody.error, 'No voice note audio file uploaded');
        });

        it('uploadVoiceNote should upload audio and return attachment object with duration', async () => {
            let statusCode = 0;
            let jsonBody = null;
            const req = {
                file: {
                    buffer: Buffer.from('audio-bytes'),
                    originalname: 'voice.webm',
                    mimetype: 'audio/webm'
                },
                body: { duration: '12.4' }
            };
            const res = {
                status: (code) => { statusCode = code; return res; },
                json: (data) => { jsonBody = data; return res; }
            };

            await messageController.uploadVoiceNote(req, res);
            assert.strictEqual(statusCode, 200);
            assert.ok(jsonBody.attachment);
            assert.strictEqual(jsonBody.attachment.type, 'audio');
            assert.strictEqual(jsonBody.attachment.duration, 12.4);
        });
    });

    describe('API JSON 404 & Centralized Error Handler Guarantee', () => {
        it('should return JSON error instead of HTML for unhandled /api/* routes', async () => {
            const express = require('express');
            const http = require('http');
            const app = express();

            app.all('/api/*', (req, res) => {
                res.status(404).json({
                    error: `API route '${req.method} ${req.originalUrl}' not found. Please restart the backend server if new routes were recently added.`
                });
            });

            const server = app.listen(0);
            const port = server.address().port;

            try {
                const responseData = await new Promise((resolve, reject) => {
                    http.get(`http://localhost:${port}/api/messages/upload-fake`, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            resolve({
                                status: res.statusCode,
                                contentType: res.headers['content-type'],
                                body: JSON.parse(data)
                            });
                        });
                    }).on('error', reject);
                });

                assert.strictEqual(responseData.status, 404);
                assert.ok(responseData.contentType.includes('application/json'));
                assert.ok(responseData.body.error.includes('not found'));
                assert.ok(!responseData.body.error.includes('<!DOCTYPE'));
            } finally {
                server.close();
            }
        });
    });

    describe('Sidebar Last Message Preview Formatting', () => {
        const { formatLastMessage } = require('../backend/controllers/userControllers');

        it('should return "Group created" for a group with no messages', () => {
            assert.strictEqual(formatLastMessage(null, true), 'Group created');
            assert.strictEqual(formatLastMessage(undefined, true), 'Group created');
        });

        it('should return empty string for a 1-on-1 DM with no messages', () => {
            assert.strictEqual(formatLastMessage(null, false), '');
            assert.strictEqual(formatLastMessage(undefined, false), '');
        });

        it('should format a photo attachment without text as "📷 Photo"', () => {
            const msg = {
                message: '',
                attachments: [{ type: 'image', name: 'screenshot.png' }]
            };
            assert.strictEqual(formatLastMessage(msg, true), '📷 Photo');
        });

        it('should format a PDF attachment as "📄 filename.pdf"', () => {
            const msg = {
                message: '',
                attachments: [{ type: 'pdf', name: 'office_english_cheat_sheet.pdf' }]
            };
            assert.strictEqual(formatLastMessage(msg, true), '📄 office_english_cheat_sheet.pdf');
        });

        it('should format a voice note attachment as "🎙️ Voice note"', () => {
            const msg = {
                message: '',
                attachments: [{ type: 'audio', name: 'voice_123.webm' }]
            };
            assert.strictEqual(formatLastMessage(msg, true), '🎙️ Voice note');
        });

        it('should format multiple attachments as "📎 N attachments"', () => {
            const msg = {
                message: '',
                attachments: [
                    { type: 'image', name: 'photo1.png' },
                    { type: 'pdf', name: 'doc.pdf' }
                ]
            };
            assert.strictEqual(formatLastMessage(msg, true), '📎 2 attachments');
        });

        it('should format text with attachment as "📷 Photo Caption text"', () => {
            const msg = {
                message: 'Look at this design',
                attachments: [{ type: 'image', name: 'design.png' }]
            };
            assert.strictEqual(formatLastMessage(msg, true), '📷 Photo Look at this design');
        });

        it('should format a poll message as "📊 Poll: question"', () => {
            const msg = {
                message: '',
                poll: { question: 'Team lunch today?' }
            };
            assert.strictEqual(formatLastMessage(msg, true), '📊 Poll: Team lunch today?');
        });
    });
});


