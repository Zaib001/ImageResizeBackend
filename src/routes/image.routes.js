// src/routes/image.routes.js
const express = require('express');
const multer = require('multer');
const ImageController = require('../controllers/ImageController');

const router = express.Router();

// Memory storage for Vercel serverless functions
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 4 * 1024 * 1024 // 4MB limit (matching Vercel serverless constraints)
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString(),
        cors: 'enabled',
        origin: req.headers.origin
    });
});

// Test upload endpoint
router.post('/test-upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                bufferSize: req.file.buffer.length
            },
            cors: {
                origin: req.headers.origin,
                allowed: true
            }
        });
    } catch (error) {
        console.error('Test upload error:', error);
        res.status(500).json({
            error: error.message,
            cors: {
                origin: req.headers.origin,
                allowed: true
            }
        });
    }
});

// Main processing endpoint
router.post('/process', upload.single('image'), (req, res) => ImageController.process(req, res));

module.exports = router;