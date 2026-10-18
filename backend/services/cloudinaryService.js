const cloudinary = require('cloudinary').v2;

/**
 * Configure Cloudinary with environment variables
 */
const configureCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
            cloud_name: cloudName.trim(),
            api_key: apiKey.trim(),
            api_secret: apiSecret.trim(),
            secure: true,
        });
        return true;
    }

    if (process.env.CLOUDINARY_URL) {
        cloudinary.config({
            cloudinary_url: process.env.CLOUDINARY_URL.trim(),
            secure: true,
        });
        return true;
    }

    return false;
};

/**
 * Determine attachment type from MIME type and filename
 */
const getAttachmentType = (mimetype = '', filename = '') => {
    const mime = mimetype.toLowerCase();
    const name = filename.toLowerCase();

    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (name.match(/\.(mp4|mov|avi|mkv)$/i)) return 'video';
    if (name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) return 'audio';
    if (name.endsWith('.webm')) {
        return mime.includes('video') ? 'video' : 'audio';
    }
    return 'document';
};

/**
 * Upload a file buffer to Cloudinary
 *
 * @param {Object} params
 * @param {Buffer} params.buffer - File buffer from Multer
 * @param {string} params.originalname - Original filename
 * @param {string} params.mimetype - MIME type
 * @param {string} params.folder - Optional Cloudinary folder
 * @param {number} params.duration - Optional audio duration in seconds
 */
const uploadBufferToCloudinary = async ({ buffer, originalname, mimetype, folder = 'sendchat', duration }) => {
    const isConfigured = configureCloudinary();
    const type = getAttachmentType(mimetype, originalname);

    // If Cloudinary credentials are not configured, fallback to data URI for dev mode
    if (!isConfigured) {
        console.warn('⚠️ Cloudinary is not configured in .env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).');
        console.warn('   Using Data URI fallback for development.');
        const base64 = buffer.toString('base64');
        const dataUri = `data:${mimetype || 'application/octet-stream'};base64,${base64}`;
        return {
            url: dataUri,
            publicId: `dev_${Date.now()}`,
            type,
            name: originalname || 'file',
            size: buffer.length,
            duration: Number(duration) || 0,
            isDevFallback: true,
        };
    }

    // Cloudinary resource_type:
    // - images -> 'image'
    // - audio/video -> 'video' (Cloudinary treats audio under 'video' API endpoint)
    // - pdfs/documents -> 'raw'
    let resourceType = 'auto';
    if (type === 'image') resourceType = 'image';
    else if (type === 'audio' || type === 'video') resourceType = 'video';
    else if (type === 'pdf' || type === 'document') resourceType = 'raw';

    return new Promise((resolve, reject) => {
        const cleanName = (originalname || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
                filename_override: cleanName,
                use_filename: true,
                unique_filename: true,
            },
            (error, result) => {
                if (error) {
                    console.error('❌ Cloudinary upload error:', error);
                    return reject(new Error(error.message || 'Failed to upload file to Cloudinary'));
                }

                resolve({
                    url: result.secure_url || result.url,
                    publicId: result.public_id,
                    type,
                    name: originalname || cleanName,
                    size: result.bytes || buffer.length,
                    duration: result.duration || Number(duration) || 0,
                    width: result.width || undefined,
                    height: result.height || undefined,
                    format: result.format || undefined,
                });
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Delete asset from Cloudinary
 */
const deleteCloudinaryAsset = async (publicId, resourceType = 'image') => {
    if (!publicId || publicId.startsWith('dev_')) return false;
    const isConfigured = configureCloudinary();
    if (!isConfigured) return false;

    try {
        const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        return res.result === 'ok';
    } catch (err) {
        console.error('Cloudinary delete error:', err);
        return false;
    }
};

module.exports = {
    configureCloudinary,
    getAttachmentType,
    uploadBufferToCloudinary,
    deleteCloudinaryAsset,
};
