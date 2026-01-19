// controllers/ImageController.js
const ImageService = require('../services/ImageService');
const ValidationService = require('../services/ValidationService');

class ImageController {
    async process(req, res) {
        console.log('Processing request...');

        try {
            // Log request info for debugging
            console.log('Headers:', req.headers);
            console.log('Body keys:', Object.keys(req.body));
            console.log('File exists:', !!req.file);

            if (!req.file) {
                console.error('No file uploaded');
                return res.status(400).json({
                    error: 'No image file uploaded. Please select an image.'
                });
            }

            console.log('File received:', {
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            });

            // Validate image
            console.log('Validating image...');
            await ValidationService.validateImage(req.file.buffer);
            ValidationService.validateSize(req.file.size);

            // Parse options with defaults
            const options = {
                width: req.body.width ? Number(req.body.width) : null,
                height: req.body.height ? Number(req.body.height) : null,
                unit: req.body.unit || 'px',
                mode: req.body.mode || 'stretch',
                format: req.body.format || 'jpeg',
                backgroundColor: req.body.backgroundColor || '#FFFFFF',
                maxSizeKB: req.body.maxSizeKB ? Number(req.body.maxSizeKB) : null,
                quality: req.body.quality ? Number(req.body.quality) : 90,
                isPreview: req.body.isPreview === 'true'
            };

            console.log('Processing options:', options);

            // Validate required parameters
            if (!options.width || !options.height) {
                return res.status(400).json({
                    error: 'Width and height are required.'
                });
            }

            // Process image
            console.log('Starting image processing...');
            const outputBuffer = await ImageService.processImage(req.file.buffer, options);
            console.log('Image processed successfully, buffer size:', outputBuffer.length);

            // Determine MIME type
            const mimeType = this.getMimeType(options.format);
            const ext = options.format.toLowerCase() === 'pdf' ? 'pdf' : options.format.toLowerCase();
            const filename = `processed-${Date.now()}.${ext}`;

            // Set response headers
            res.set({
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': outputBuffer.length,
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            // Send the processed image
            console.log('Sending response...');
            res.send(outputBuffer);
            console.log('Response sent successfully');

        } catch (err) {
            console.error('Image processing error:', err);
            const status = err.status || 500;

            res.status(status).json({
                error: err.message || 'Image processing failed',
                code: err.code || 'INTERNAL_ERROR',
                timestamp: new Date().toISOString()
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