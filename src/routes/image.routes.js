// routes/image.routes.js
const express = require('express');
const multer = require('multer');
const ImageController = require('../controllers/ImageController');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to only accept images
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'), false);
    }
};

// Configure upload with limits
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});

// Process image endpoint
router.post('/process', upload.single('image'), ImageController.process);

// Test endpoint
router.post('/test', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        res.json({
            success: true,
            message: 'File received successfully',
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;