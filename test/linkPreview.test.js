const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
    validateUrl,
    extractGoogleMeetCode,
    extractZoomId,
    extractYouTubeId,
    parseHtmlMetadata,
    getLinkPreviewData,
} = require('../backend/services/linkPreviewService');

describe('Link Preview Service Suite', () => {
    describe('validateUrl & SSRF Protection', () => {
        it('should accept valid public https URL', () => {
            const parsed = validateUrl('https://example.com/page');
            assert.strictEqual(parsed.hostname, 'example.com');
            assert.strictEqual(parsed.protocol, 'https:');
        });

        it('should accept Google Meet URL', () => {
            const parsed = validateUrl('https://meet.google.com/khh-qemj-gru');
            assert.strictEqual(parsed.hostname, 'meet.google.com');
        });

        it('should reject non-http/https protocols', () => {
            assert.throws(() => validateUrl('javascript:alert(1)'), /Only HTTP and HTTPS/);
            assert.throws(() => validateUrl('file:///etc/passwd'), /Only HTTP and HTTPS/);
        });

        it('should block localhost and loopback addresses', () => {
            assert.throws(() => validateUrl('http://localhost:8000/api'), /Access to private network/);
            assert.throws(() => validateUrl('http://127.0.0.1:27017'), /Access to private network/);
            assert.throws(() => validateUrl('http://0.0.0.0:8000'), /Access to private network/);
        });

        it('should block private RFC1918 networks and cloud metadata', () => {
            assert.throws(() => validateUrl('http://192.168.1.1/admin'), /Access to private network/);
            assert.throws(() => validateUrl('http://10.0.0.1'), /Access to private network/);
            assert.throws(() => validateUrl('http://169.254.169.254/latest/meta-data'), /Access to private network/);
        });
    });

    describe('Video Meeting Link Parsing', () => {
        it('should extract Google Meet code accurately', () => {
            const urlObj = new URL('https://meet.google.com/khh-qemj-gru?authuser=0');
            const code = extractGoogleMeetCode(urlObj);
            assert.strictEqual(code, 'khh-qemj-gru');
        });

        it('should return null for non-meet URLs', () => {
            const urlObj = new URL('https://google.com/search?q=test');
            const code = extractGoogleMeetCode(urlObj);
            assert.strictEqual(code, null);
        });

        it('should extract Zoom meeting ID', () => {
            const urlObj = new URL('https://zoom.us/j/9876543210');
            const zoomId = extractZoomId(urlObj);
            assert.strictEqual(zoomId, '9876543210');
        });

        it('should extract YouTube video ID from watch and youtu.be links', () => {
            const ytWatch = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            assert.strictEqual(extractYouTubeId(ytWatch), 'dQw4w9WgXcQ');

            const ytShort = new URL('https://youtu.be/dQw4w9WgXcQ');
            assert.strictEqual(extractYouTubeId(ytShort), 'dQw4w9WgXcQ');
        });
    });

    describe('HTML Metadata Parsing', () => {
        it('should extract og:title, og:description, and og:image', () => {
            const sampleHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fallback Title</title>
                <meta property="og:title" content="OpenGraph Super Title" />
                <meta property="og:description" content="Discover the best features here." />
                <meta property="og:image" content="https://example.com/banner.png" />
                <meta property="og:site_name" content="Example Platform" />
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body>Content</body>
            </html>
            `;

            const meta = parseHtmlMetadata(sampleHtml, 'https://example.com/article');
            assert.strictEqual(meta.title, 'OpenGraph Super Title');
            assert.strictEqual(meta.description, 'Discover the best features here.');
            assert.strictEqual(meta.image, 'https://example.com/banner.png');
            assert.strictEqual(meta.siteName, 'Example Platform');
            assert.strictEqual(meta.favicon, 'https://example.com/favicon.ico');
        });

        it('should fallback to title tag and meta description if og tags missing', () => {
            const sampleHtml = `
            <html>
            <head>
                <title>Standard Page Title</title>
                <meta name="description" content="A simple standard meta description." />
            </head>
            </html>
            `;

            const meta = parseHtmlMetadata(sampleHtml, 'https://testsite.com');
            assert.strictEqual(meta.title, 'Standard Page Title');
            assert.strictEqual(meta.description, 'A simple standard meta description.');
        });
    });

    describe('getLinkPreviewData for Meeting Links', () => {
        it('should return instant rich meeting object for Google Meet URL', async () => {
            const preview = await getLinkPreviewData('https://meet.google.com/khh-qemj-gru');
            assert.strictEqual(preview.isMeeting, true);
            assert.strictEqual(preview.meetingType, 'google_meet');
            assert.strictEqual(preview.meetingCode, 'khh-qemj-gru');
            assert.strictEqual(preview.title, 'Google Meet Video Call');
            assert.match(preview.description, /khh-qemj-gru/);
            assert.strictEqual(preview.domain, 'meet.google.com');
            assert.ok(preview.image);
            assert.ok(preview.favicon);
        });

        it('should return instant rich meeting object for Zoom URL', async () => {
            const preview = await getLinkPreviewData('https://zoom.us/j/1234567890');
            assert.strictEqual(preview.isMeeting, true);
            assert.strictEqual(preview.meetingType, 'zoom');
            assert.strictEqual(preview.meetingCode, '1234567890');
            assert.strictEqual(preview.title, 'Zoom Meeting (1234567890)');
        });
    });
});
