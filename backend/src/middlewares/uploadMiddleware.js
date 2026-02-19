const fs = require('fs');
const path = require('path');
const multer = require('multer');

const feedUploadDir = path.join(__dirname, '../../uploads/feed');

const ensureFeedDir = () => {
    if (!fs.existsSync(feedUploadDir)) {
        fs.mkdirSync(feedUploadDir, { recursive: true });
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureFeedDir();
        cb(null, feedUploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const base = path.basename(file.originalname || 'media', ext).replace(/[^a-zA-Z0-9_-]/g, '');
        cb(null, `${Date.now()}-${base || 'media'}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (mime.startsWith('image/') || mime.startsWith('video/')) {
        cb(null, true);
        return;
    }
    cb(new Error('Only image/video files are allowed'));
};

const uploadFeedMedia = multer({
    storage,
    fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 },
});

module.exports = {
    uploadFeedMedia,
};
