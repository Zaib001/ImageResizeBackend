const sharp = require('sharp');

class ValidationService {
    async validateImage(input) {
        try {
            const metadata = await sharp(input).metadata();
            const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];

            if (!allowedFormats.includes(metadata.format)) {
                throw new Error(`Invalid file format: ${metadata.format}. Supported: JPG, PNG, WEBP`);
            }
            return metadata;
        } catch (err) {
            throw new Error(`Validation failed: ${err.message}`);
        }
    }

    validateSize(sizeBytes, limitMB = 10) {
        const maxBytes = limitMB * 1024 * 1024;
        if (sizeBytes > maxBytes) {
            throw new Error(`File too large. Limit is ${limitMB}MB`);
        }
    }
}

module.exports = new ValidationService();
