const ImageService = require('../services/ImageService');
const ValidationService = require('../services/ValidationService');
const TempFileManager = require('../utils/TempFileManager');

class ImageController {
    async process(req, res) {
        let inputPath = null;

        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image file uploaded.' });
            }

            inputPath = req.file.path;
            TempFileManager.registerCleanup(res, inputPath);

            await ValidationService.validateImage(inputPath);
            ValidationService.validateSize(req.file.size);

            const options = {
                width: Number(req.body.width),
                height: Number(req.body.height),
                unit: req.body.unit || 'px',
                mode: req.body.mode || 'stretch',
                format: req.body.format || 'jpeg',
                backgroundColor: req.body.backgroundColor || '#FFFFFF',
                maxSizeKB: req.body.maxSizeKB ? Number(req.body.maxSizeKB) : null,
                quality: req.body.quality ? Number(req.body.quality) : 90
            };

            if (!options.width || !options.height) {
                return res.status(400).json({ error: 'Width and height are required.' });
            }

            const outputBuffer = await ImageService.processImage(inputPath, options);

            const mimeType = this.getMimeType(options.format);
            const ext = options.format.toLowerCase() === 'pdf' ? 'pdf' : options.format.toLowerCase();
            const filename = `processed-${Date.now()}.${ext}`;

            res.set({
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': outputBuffer.length,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            });

            res.send(outputBuffer);

        } catch (err) {
            const status = err.status || 400;
            res.status(status).json({
                error: err.message || 'Image processing failed',
                code: err.code || 'PROCESSING_ERROR'
            });
        }
    }

    getMimeType(format) {
        const fmt = format.toLowerCase();
        const mimeMap = {
            'pdf': 'application/pdf',
            'png': 'image/png',
            'webp': 'image/webp',
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg'
        };
        return mimeMap[fmt] || 'image/jpeg';
    }
}

module.exports = new ImageController();
