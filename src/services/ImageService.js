const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const UnitConverter = require('../utils/UnitConverter');

class ImageService {
    async processImage(input, options) {
        const {
            width,
            height,
            unit = 'px',
            mode = 'stretch',
            format = 'jpeg',
            backgroundColor = '#FFFFFF',
            maxSizeKB = null,
            quality = 90,
            isPreview = false
        } = options;

        let targetWidth = UnitConverter.toPixels(width, unit);
        let targetHeight = UnitConverter.toPixels(height, unit);

        // Optimization: For previews, cap the resolution to save CPU/Bandwidth
        if (isPreview) {
            const maxPreviewDim = 1200;
            if (targetWidth > maxPreviewDim || targetHeight > maxPreviewDim) {
                const ratio = Math.min(maxPreviewDim / targetWidth, maxPreviewDim / targetHeight);
                targetWidth = Math.round(targetWidth * ratio);
                targetHeight = Math.round(targetHeight * ratio);
            }
        }

        UnitConverter.validateDimensions(targetWidth, targetHeight);

        let processedBuffer = await this.applyResize(input, targetWidth, targetHeight, mode, backgroundColor);

        if (format.toLowerCase() === 'pdf') {
            return await this.generatePDF(processedBuffer, targetWidth, targetHeight, maxSizeKB, quality);
        }

        // Optimization: For previews, skip iterative compression and use lower quality
        return await this.optimizeOutput(processedBuffer, format, isPreview ? null : maxSizeKB, isPreview ? 60 : quality);
    }

    async applyResize(input, width, height, mode, backgroundColor) {
        const image = sharp(input);

        if (mode === 'stretch') {
            return await image
                .resize(width, height, { fit: 'fill' })
                .toBuffer();
        }

        if (mode === 'color') {
            return await image
                .resize(width, height, {
                    fit: 'contain',
                    background: backgroundColor || '#FFFFFF'
                })
                .flatten({ background: backgroundColor || '#FFFFFF' })
                .toBuffer();
        }

        if (mode === 'blur') {
            const background = await sharp(inputPath)
                .resize(width, height, { fit: 'cover' })
                .blur(20)
                .modulate({ brightness: 0.7 })
                .toBuffer();

            const foreground = await sharp(inputPath)
                .ensureAlpha()
                .resize(width, height, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toBuffer();

            return await sharp(background)
                .composite([{ input: foreground }])
                .toBuffer();
        }

        return await image
            .resize(width, height, { fit: 'contain' })
            .toBuffer();
    }

    async optimizeOutput(buffer, format, maxSizeKB, startQuality = 90) {
        let quality = startQuality;
        let outputBuffer = buffer;
        const targetBytes = maxSizeKB ? maxSizeKB * 1024 : null;

        let sharpFormat = format.toLowerCase();
        if (sharpFormat === 'jpg') sharpFormat = 'jpeg';

        const sharpFormats = ['jpeg', 'png', 'webp'];
        if (!sharpFormats.includes(sharpFormat)) {
            return sharp(buffer).toFormat(sharpFormat).toBuffer();
        }

        let attempts = 0;
        while (attempts < 5) {
            const options = { quality };
            if (sharpFormat === 'png') {
                options.palette = true;
            }

            outputBuffer = await sharp(buffer)
                .toFormat(sharpFormat, options)
                .toBuffer();

            if (!targetBytes || outputBuffer.length <= targetBytes) {
                return outputBuffer;
            }

            quality -= 15;
            if (quality < 10) break;
            attempts++;
        }

        return outputBuffer;
    }

    async generatePDF(imageBuffer, width, height, maxSizeKB, quality) {
        const jpegBuffer = await this.optimizeOutput(imageBuffer, 'jpeg', maxSizeKB, quality);

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([width, height]);

        const embeddedImage = await pdfDoc.embedJpg(jpegBuffer);

        page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: width,
            height: height,
        });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }
}

module.exports = new ImageService();
