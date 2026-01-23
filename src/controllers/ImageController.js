// src/controllers/ImageController.js
const ImageService = require('../services/ImageService');
const ValidationService = require('../services/ValidationService');
const UnitConverter = require('../utils/UnitConverter');

class ImageController {
    async process(req, res) {
        const startTime = Date.now();

        try {
            console.log('Processing request from origin:', req.headers.origin);

            // Check if file exists
            if (!req.file) {
                console.error('No file uploaded');
                return res.status(400).json({
                    error: 'No image file provided. Please upload an image.',
                    code: 'NO_FILE'
                });
            }

            console.log('File received:', {
                name: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            });

            // Validate the uploaded file
            console.log('Validating image...');
            await ValidationService.validateImage(req.file.buffer);
            ValidationService.validateSize(req.file.size);

            // Parse and validate request parameters
            const options = {
                width: parseFloat(req.body.width),
                height: parseFloat(req.body.height),
                unit: (req.body.unit || 'px').toLowerCase(),
                mode: (req.body.mode || 'stretch').toLowerCase(),
                format: (req.body.format || 'jpeg').toLowerCase(),
                backgroundColor: req.body.backgroundColor || '#FFFFFF',
                quality: parseInt(req.body.quality, 10) || 90,
                maxSizeKB: req.body.maxSizeKB ? parseFloat(req.body.maxSizeKB) : null,
                isPreview: req.body.isPreview === 'true',
                resolutionMode: (req.body.resolutionMode || 'auto').toLowerCase(),
                dpi: parseInt(req.body.dpi, 10) || 96,
                rotate: parseInt(req.body.rotate, 10) || 0,
                crop: req.body.crop ? JSON.parse(req.body.crop) : null
            };

            console.log('Parsed options:', options);

            // Validate required parameters
            if (!options.width || !options.height ||
                isNaN(options.width) || isNaN(options.height) ||
                options.width <= 0 || options.height <= 0) {
                return res.status(400).json({
                    error: 'Valid width and height parameters are required.',
                    code: 'INVALID_DIMENSIONS'
                });
            }

            // Validate unit
            const validUnits = ['px', 'pixel', 'pixels', 'in', 'inch', 'inches', 'cm', 'centimeter', 'centimeters', 'mm', 'millimeter', 'millimeters'];
            if (!validUnits.includes(options.unit)) {
                return res.status(400).json({
                    error: `Invalid unit: ${options.unit}. Supported units: px, in, cm, mm`,
                    code: 'INVALID_UNIT'
                });
            }

            // Validate mode
            const validModes = ['stretch', 'fill', 'contain', 'cover', 'color', 'blur'];
            if (!validModes.includes(options.mode)) {
                return res.status(400).json({
                    error: `Invalid mode: ${options.mode}. Supported modes: ${validModes.join(', ')}`,
                    code: 'INVALID_MODE'
                });
            }

            // Validate format
            const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'pdf'];
            if (!validFormats.includes(options.format)) {
                return res.status(400).json({
                    error: `Invalid format: ${options.format}. Supported formats: ${validFormats.join(', ')}`,
                    code: 'INVALID_FORMAT'
                });
            }

            // Validate quality
            if (options.quality < 1 || options.quality > 100) {
                return res.status(400).json({
                    error: 'Quality must be between 1 and 100',
                    code: 'INVALID_QUALITY'
                });
            }

            // Validate crop
            if (options.crop) {
                const { x, y, left, top, width: cw, height: ch } = options.crop;
                const cropX = left !== undefined ? left : x;
                const cropY = top !== undefined ? top : y;

                if (typeof cropX !== 'number' || typeof cropY !== 'number' || typeof cw !== 'number' || typeof ch !== 'number') {
                    return res.status(400).json({
                        error: 'Invalid crop parameters',
                        code: 'INVALID_CROP'
                    });
                }
            }

            // Determine DPI for validation
            let effectiveDpi = 96;
            if (options.resolutionMode === 'auto') {
                if (['in', 'cm', 'mm', 'inch', 'centimeter', 'millimeter'].includes(options.unit)) {
                    effectiveDpi = 300;
                }
            } else if (options.resolutionMode === 'fixed') {
                effectiveDpi = options.dpi;
            }

            // Convert to pixels to check dimensions
            try {
                const pixelWidth = UnitConverter.toPixels(options.width, options.unit, effectiveDpi);
                const pixelHeight = UnitConverter.toPixels(options.height, options.unit, effectiveDpi);
                UnitConverter.validateDimensions(pixelWidth, pixelHeight);
            } catch (dimError) {
                return res.status(400).json({
                    error: dimError.message,
                    code: 'INVALID_DIMENSIONS'
                });
            }

            // Process the image
            console.log('Processing image with validated options...');
            const outputBuffer = await ImageService.processImage(req.file.buffer, options);

            // Set response headers
            const mimeType = this.getMimeType(options.format);
            const extension = this.getExtension(options.format);
            const filename = `resized-${Date.now()}.${extension}`;

            console.log('Sending response...', {
                mimeType,
                filename,
                size: outputBuffer.length,
                processingTime: Date.now() - startTime
            });

            res.set({
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': outputBuffer.length,
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Processing-Time': `${Date.now() - startTime}ms`,
                'X-Filename': filename
            });

            // Send the processed image
            res.send(outputBuffer);

        } catch (error) {
            console.error('Image processing error:', error);

            const status = error.status || 500;
            const response = {
                error: error.message || 'Image processing failed',
                code: error.code || 'PROCESSING_ERROR',
                timestamp: new Date().toISOString(),
                processingTime: `${Date.now() - startTime}ms`
            };

            if (error.code && error.code.startsWith('ERR_')) {
                response.code = 'INTERNAL_ERROR';
            }

            res.status(status).json(response);
        }
    }

    getMimeType(format) {
        const mimeTypes = {
            'pdf': 'application/pdf',
            'png': 'image/png',
            'webp': 'image/webp',
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg'
        };

        return mimeTypes[format] || 'image/jpeg';
    }

    getExtension(format) {
        const extensions = {
            'pdf': 'pdf',
            'png': 'png',
            'webp': 'webp',
            'jpeg': 'jpg',
            'jpg': 'jpg'
        };

        return extensions[format] || 'jpg';
    }
}

module.exports = new ImageController();