const express = require('express');
const router = express.Router();
const multer = require('multer');
const ImageController = require('../controllers/ImageController');
const TempFileManager = require('../utils/TempFileManager');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TempFileManager.baseDir);
    },
    filename: (req, file, cb) => {
        const ext = '.' + file.originalname.split('.').pop();
        const filename = TempFileManager.generatePath(ext).split(/[\\/]/).pop();
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

router.post('/process', upload.single('image'), (req, res) => ImageController.process(req, res));

module.exports = router;
