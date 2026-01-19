const express = require('express');
const router = express.Router();
const multer = require('multer');
const ImageController = require('../controllers/ImageController');

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

router.post('/process', upload.single('image'), (req, res) => ImageController.process(req, res));

module.exports = router;
