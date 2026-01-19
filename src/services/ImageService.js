// services/ImageService.js
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

class ImageService {
    async processImage(input, options) {
        console.log('ImageService.processImage called with options:', options);

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

        try {
            // Convert units if needed
            let targetWidth = width;
            let targetHeight = height;

            if (unit === 'in') {
                targetWidth = Math.round(width * 96); // 96 DPI
                targetHeight = Math.round(height * 96);
            } else if (unit === 'cm') {
                targetWidth = Math.round(width * 37.8); // 37.8 pixels per cm
                targetHeight = Math.round(height * 37.8);
            } else if (unit === 'mm') {
                targetWidth = Math.round(width * 3.78); // 3.78 pixels per mm
                targetHeight = Math.round(height * 3.78);
            }

            // Validate dimensions
            if (targetWidth <= 0 || targetHeight <= 0) {
                throw new Error('Width and height must be positive numbers');
            }

            if (targetWidth > 10000 || targetHeight > 10000) {
                throw new Error('Maximum dimensions exceeded (10000px)');
            }

            // For previews, limit size
            if (isPreview) {
                const maxPreviewDim = 1200;
                if (targetWidth > maxPreviewDim || targetHeight > maxPreviewDim) {
                    const ratio = Math.min(maxPreviewDim / targetWidth, maxPreviewDim / targetHeight);
                    targetWidth = Math.round(targetWidth * ratio);
                    targetHeight = Math.round(targetHeight * ratio);
                }
            }

            console.log('Target dimensions:', { targetWidth, targetHeight });

            // Process based on mode
            let processedBuffer;
            const image = sharp(input);

            switch (mode) {
                case 'stretch':
                    processedBuffer = await image
                        .resize(targetWidth, targetHeight, { fit: 'fill' })
                        .toBuffer();
                    break;

                case 'color':
                    processedBuffer = await image
                        .resize(targetWidth, targetHeight, {
                            fit: 'contain',
                            background: backgroundColor
                        })
                        .flatten({ background: backgroundColor })
                        .toBuffer();
                    break;

                default: // 'contain' or any other
                    processedBuffer = await image
                        .resize(targetWidth, targetHeight, { fit: 'contain' })
                        .toBuffer();
                    break;
            }

            // Handle PDF format
            if (format.toLowerCase() === 'pdf') {
                return await this.generatePDF(processedBuffer, targetWidth, targetHeight);
            }

            // Handle image formats
            return await this.convertToFormat(processedBuffer, format, quality, maxSizeKB);

        } catch (error) {
            console.error('ImageService error:', error);
            throw new Error(`Image processing failed: ${error.message}`);
        }
    }

    async convertToFormat(buffer, format, quality, maxSizeKB) {
        const formatLower = format.toLowerCase();
        let outputBuffer = buffer;

        // For simple conversion without size optimization
        if (!maxSizeKB) {
            const sharpFormat = formatLower === 'jpg' ? 'jpeg' : formatLower;
            return await sharp(buffer)
                .toFormat(sharpFormat, { quality })
                .toBuffer();
        }

        // With size optimization
        let currentQuality = quality;
        const targetBytes = maxSizeKB * 1024;

        for (let i = 0; i < 5; i++) {
            const sharpFormat = formatLower === 'jpg' ? 'jpeg' : formatLower;
            outputBuffer = await sharp(buffer)
                .toFormat(sharpFormat, { quality: currentQuality })
                .toBuffer();

            if (outputBuffer.length <= targetBytes) {
                return outputBuffer;
            }

            currentQuality = Math.max(10, currentQuality - 20);
        }

        return outputBuffer;
    }

    async generatePDF(imageBuffer, width, height) {
        try {
            // Convert image to JPEG for PDF embedding
            const jpegBuffer = await sharp(imageBuffer)
                .jpeg({ quality: 90 })
                .toBuffer();

            // Create PDF
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
        } catch (error) {
            console.error('PDF generation error:', error);
            throw new Error(`PDF generation failed: ${error.message}`);
        }
    }
}

module.exports = new ImageService();