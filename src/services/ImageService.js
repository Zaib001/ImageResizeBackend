// src/services/ImageService.js
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const UnitConverter = require('../utils/UnitConverter');

class ImageService {
    async processImage(inputBuffer, options) {
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
            console.log('Processing image with options:', {
                width,
                height,
                unit,
                mode,
                format,
                isPreview
            });

            // Convert units to pixels using your UnitConverter
            const targetWidth = UnitConverter.toPixels(width, unit);
            const targetHeight = UnitConverter.toPixels(height, unit);

            console.log(`Converted dimensions: ${width}${unit} x ${height}${unit} -> ${targetWidth}px x ${targetHeight}px`);

            // Validate dimensions using your UnitConverter
            UnitConverter.validateDimensions(targetWidth, targetHeight);

            // For previews, limit dimensions
            let finalWidth = targetWidth;
            let finalHeight = targetHeight;

            if (isPreview) {
                const MAX_PREVIEW_DIM = 1200;
                if (targetWidth > MAX_PREVIEW_DIM || targetHeight > MAX_PREVIEW_DIM) {
                    const ratio = Math.min(MAX_PREVIEW_DIM / targetWidth, MAX_PREVIEW_DIM / targetHeight);
                    finalWidth = Math.round(targetWidth * ratio);
                    finalHeight = Math.round(targetHeight * ratio);
                    console.log(`Preview scaled down to: ${finalWidth}px x ${finalHeight}px`);
                }
            }

            console.log(`Final dimensions: ${finalWidth}px x ${finalHeight}px`);

            // Process based on mode
            let processedBuffer;
            const image = sharp(inputBuffer);

            switch (mode.toLowerCase()) {
                case 'stretch':
                case 'fill':
                    processedBuffer = await image
                        .resize(finalWidth, finalHeight, { fit: 'fill' })
                        .toBuffer();
                    break;

                case 'contain':
                    processedBuffer = await image
                        .resize(finalWidth, finalHeight, {
                            fit: 'contain',
                            background: backgroundColor
                        })
                        .toBuffer();
                    break;

                case 'cover':
                    processedBuffer = await image
                        .resize(finalWidth, finalHeight, { fit: 'cover' })
                        .toBuffer();
                    break;

                case 'blur':
                    const background = await sharp(inputBuffer)
                        .resize(finalWidth, finalHeight, { fit: 'cover' })
                        .blur(20)
                        .modulate({ brightness: 0.7 })
                        .toBuffer();

                    const foreground = await sharp(inputBuffer)
                        .resize(finalWidth, finalHeight, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .toBuffer();

                    processedBuffer = await sharp(background)
                        .composite([{ input: foreground }])
                        .toBuffer();
                    break;

                case 'color':
                    processedBuffer = await sharp(inputBuffer)
                        .resize(finalWidth, finalHeight, {
                            fit: 'contain',
                            background: backgroundColor
                        })
                        .flatten({ background: backgroundColor })
                        .toBuffer();
                    break;

                default:
                    throw new Error(`Unsupported resize mode: ${mode}`);
            }

            // Handle PDF format
            if (format.toLowerCase() === 'pdf') {
                console.log('Converting to PDF format');
                return await this.convertToPDF(processedBuffer, finalWidth, finalHeight);
            }

            // Handle image formats
            console.log(`Converting to ${format} format [Preview: ${isPreview}]`);
            const targetQuality = isPreview ? 60 : quality;
            const targetSizeLimit = isPreview ? null : maxSizeKB;

            return await this.convertToFormat(processedBuffer, format, targetQuality, targetSizeLimit);

        } catch (error) {
            console.error('ImageService error:', error);
            throw new Error(`Failed to process image: ${error.message}`);
        }
    }

    async convertToFormat(buffer, format, quality, maxSizeKB) {
        const formatLower = format.toLowerCase();
        const sharpFormat = formatLower === 'jpg' ? 'jpeg' : formatLower;

        console.log(`Format conversion: ${sharpFormat}, quality: ${quality}, maxSizeKB: ${maxSizeKB}`);

        // If no size limit, just convert
        if (!maxSizeKB) {
            const result = await sharp(buffer)
                .toFormat(sharpFormat, {
                    quality: Math.min(Math.max(quality, 1), 100)
                })
                .toBuffer();
            console.log(`Converted without size limit: ${result.length} bytes`);
            return result;
        }

        // With size optimization
        const targetBytes = maxSizeKB * 1024;
        let currentQuality = Math.min(Math.max(quality, 1), 100);
        let outputBuffer;
        let attempts = 0;

        console.log(`Target size: ${targetBytes} bytes, starting quality: ${currentQuality}`);

        while (attempts < 5) {
            outputBuffer = await sharp(buffer)
                .toFormat(sharpFormat, { quality: currentQuality })
                .toBuffer();

            console.log(`Attempt ${attempts + 1}: quality ${currentQuality}, size ${outputBuffer.length} bytes`);

            if (outputBuffer.length <= targetBytes || currentQuality <= 10) {
                console.log(`Final quality: ${currentQuality}, final size: ${outputBuffer.length} bytes`);
                return outputBuffer;
            }

            currentQuality = Math.max(10, currentQuality - 15);
            attempts++;
        }

        console.log(`Using lowest quality (10), size: ${outputBuffer.length} bytes`);
        return outputBuffer;
    }

    async convertToPDF(imageBuffer, width, height) {
        try {
            console.log('Creating PDF document');

            // Convert image to JPEG for PDF embedding
            const jpegBuffer = await sharp(imageBuffer)
                .jpeg({ quality: 90 })
                .toBuffer();

            console.log(`JPEG for PDF: ${jpegBuffer.length} bytes`);

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
            const pdfBuffer = Buffer.from(pdfBytes);

            console.log(`PDF created: ${pdfBuffer.length} bytes`);
            return pdfBuffer;
        } catch (error) {
            console.error('PDF conversion error:', error);
            throw new Error(`Failed to create PDF: ${error.message}`);
        }
    }
}

module.exports = new ImageService();