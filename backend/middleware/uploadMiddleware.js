const multer = require('multer');

// Store files in memory buffer (100% cloud & Render compatible, no ephemeral disk leaks)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Permit common chat media: images, PDFs, audio voice notes, and office documents
    const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
        'application/pdf',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/m4a', 'audio/x-m4a',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'application/zip', 'application/x-zip-compressed'
    ];

    if (
        allowedMimes.includes(file.mimetype) ||
        file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('audio/') ||
        file.originalname.match(/\.(pdf|docx?|xlsx?|pptx?|txt|zip|mp3|wav|ogg|m4a|webm)$/i)
    ) {
        cb(null, true);
    } else {
        cb(new Error(`File type '${file.mimetype}' is not supported. Please upload an image, PDF, audio, or document.`));
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB max limit
        files: 5,                   // Maximum 5 files per message
    },
    fileFilter,
});

module.exports = upload;
