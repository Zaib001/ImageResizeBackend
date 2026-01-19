// services/ValidationService.js
const sharp = require('sharp');

class ValidationService {
    async validateImage(input) {
        try {
            // First, check if it's a valid buffer
            if (!Buffer.isBuffer(input)) {
                throw new Error('Input must be a buffer');
            }

            if (input.length === 0) {
                throw new Error('Empty image file');
            }

            // Try to get metadata using sharp
            const metadata = await sharp(input).metadata();
            const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];

            if (!metadata.format || !allowedFormats.includes(metadata.format.toLowerCase())) {
                throw new Error(`Invalid file format. Supported: JPG, PNG, WEBP`);
            }

            // Check dimensions
            if (metadata.width > 10000 || metadata.height > 10000) {
                throw new Error('Image dimensions too large (max: 10000x10000)');
            }

            return metadata;
        } catch (err) {
            console.error('Image validation error:', err);
            if (err.message.includes('Input buffer contains unsupported image format')) {
                throw new Error('Invalid image file. Please upload a valid JPG, PNG, or WEBP image.');
            }
            throw new Error(`Image validation failed: ${err.message}`);
        }
    }

    validateSize(sizeBytes, limitMB = 10) {
        const maxBytes = limitMB * 1024 * 1024;
        if (sizeBytes > maxBytes) {
            throw new Error(`File too large. Maximum size is ${limitMB}MB`);
        }

        if (sizeBytes === 0) {
            throw new Error('File is empty');
        }
    }
}

module.exports = new ValidationService();