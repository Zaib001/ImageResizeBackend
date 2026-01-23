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
            isPreview = false,
            resolutionMode = 'auto',
            dpi = 96,
            rotate = 0,
            crop = null
        } = options;

        try {
            console.log('=== IMAGE PROCESSING START ===');
            console.log('Processing image with options:', {
                width,
                height,
                unit,
                mode,
                format,
                isPreview,
                resolutionMode,
                dpi,
                rotate,
                crop: crop ? 'YES' : 'NO'
            });

            // Get original image metadata
            const originalMetadata = await sharp(inputBuffer).metadata();
            console.log('Original image metadata:', {
                width: originalMetadata.width,
                height: originalMetadata.height,
                format: originalMetadata.format
            });

            // Determine effective DPI
            let effectiveDpi = 96;
            if (resolutionMode === 'auto') {
                if (['in', 'cm', 'mm', 'inch', 'centimeter', 'millimeter'].includes(unit.toLowerCase())) {
                    effectiveDpi = 300;
                }
            } else if (resolutionMode === 'fixed') {
                effectiveDpi = dpi;
            }

            // Convert units to pixels using UnitConverter
            const targetWidth = UnitConverter.toPixels(width, unit, effectiveDpi);
            const targetHeight = UnitConverter.toPixels(height, unit, effectiveDpi);

            console.log(`Converted dimensions (DPI: ${effectiveDpi}): ${width}${unit} x ${height}${unit} -> ${targetWidth}px x ${targetHeight}px`);

            // Validate dimensions
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

            // Start processing image
            let image = sharp(inputBuffer);

            // === APPLY ROTATION FIRST ===
            // This ensures that the crop coordinates match what the user saw on the rotated image
            if (rotate && rotate !== 0) {
                console.log(`Applying initial rotation: ${rotate} degrees`);
                image = image.rotate(rotate);

                // Refresh metadata if we rotated, as dimensions might have swapped
                const rotatedMetadata = await image.metadata();
                originalMetadata.width = rotatedMetadata.width;
                originalMetadata.height = rotatedMetadata.height;
            }

            // === APPLY CROP ===
            if (crop && crop.width > 0 && crop.height > 0) {
                console.log('=== CROP PROCESSING ===');

                let cropObj = crop;
                if (typeof crop === 'string') {
                    try {
                        cropObj = JSON.parse(crop);
                    } catch (e) {
                        console.error('Failed to parse crop JSON:', e);
                    }
                }

                console.log('Crop parameters:', cropObj);

                let left, top, width_c, height_c;

                // Handle percentage-based cropping
                if (cropObj.unit === '%' || (cropObj.width <= 100 && cropObj.height <= 100 && !cropObj.left && !cropObj.top)) {
                    console.log('Detected percentage-based crop coordinates');
                    left = Math.round((originalMetadata.width * (cropObj.x || cropObj.left || 0)) / 100);
                    top = Math.round((originalMetadata.height * (cropObj.y || cropObj.top || 0)) / 100);
                    width_c = Math.round((originalMetadata.width * cropObj.width) / 100);
                    height_c = Math.round((originalMetadata.height * cropObj.height) / 100);
                } else {
                    // Handle pixel-based cropping
                    left = Math.round(cropObj.left || cropObj.x || 0);
                    top = Math.round(cropObj.top || cropObj.y || 0);
                    width_c = Math.round(cropObj.width);
                    height_c = Math.round(cropObj.height);
                }

                // Ensure coordinates are within bounds
                left = Math.max(0, Math.min(left, originalMetadata.width - 1));
                top = Math.max(0, Math.min(top, originalMetadata.height - 1));
                width_c = Math.min(width_c, originalMetadata.width - left);
                height_c = Math.min(height_c, originalMetadata.height - top);

                console.log(`Resolved Absolute Dimensions: left=${left}, top=${top}, width=${width_c}, height=${height_c}`);

                try {
                    image = image.extract({
                        left,
                        top,
                        width: width_c,
                        height: height_c
                    });
                    console.log('✅ Crop applied successfully');
                } catch (error) {
                    console.error('❌ Crop failed:', error);
                    throw new Error(`Crop failed: ${error.message}`);
                }
                console.log('=== END CROP PROCESSING ===');
            } else {
                console.log('No crop to apply');
            }

            // === APPLY RESIZE MODE ===
            console.log(`Applying final resize mode: ${mode}`);
            let processedBuffer;

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
                    const backgroundBuffer = await sharp(inputBuffer)
                        .resize(finalWidth, finalHeight, { fit: 'cover' })
                        .blur(20)
                        .modulate({ brightness: 0.7 })
                        .toBuffer();

                    const foregroundBuffer = await image
                        .ensureAlpha()
                        .resize(finalWidth, finalHeight, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .png()
                        .toBuffer();

                    processedBuffer = await sharp(backgroundBuffer)
                        .composite([{ input: foregroundBuffer }])
                        .toBuffer();
                    break;

                case 'color':
                    processedBuffer = await image
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

            // === CONVERT FORMAT ===
            if (format.toLowerCase() === 'pdf' && !isPreview) {
                console.log('Converting to PDF format');
                const pdfBuffer = await this.convertToPDF(processedBuffer, finalWidth, finalHeight);
                console.log('=== IMAGE PROCESSING COMPLETE ===');
                return pdfBuffer;
            }

            const outputFormat = isPreview ? 'jpeg' : format;
            console.log(`Converting to ${outputFormat} format [Preview: ${isPreview}]`);

            const targetQuality = isPreview ? 50 : quality;
            const targetSizeLimit = isPreview ? null : maxSizeKB;

            const resultBuffer = await this.convertToFormat(
                processedBuffer,
                outputFormat,
                targetQuality,
                targetSizeLimit,
                effectiveDpi
            );

            console.log(`Final output size: ${Math.round(resultBuffer.length / 1024)} KB`);
            console.log('=== IMAGE PROCESSING COMPLETE ===');
            return resultBuffer;

        } catch (error) {
            console.error('❌ ImageService error:', error);
            throw new Error(`Failed to process image: ${error.message}`);
        }
    }

    async convertToFormat(buffer, format, quality, maxSizeKB, dpi = 96) {
        const formatLower = format.toLowerCase();
        const sharpFormat = formatLower === 'jpg' ? 'jpeg' : formatLower;

        console.log(`=== FORMAT CONVERSION ===`);
        console.log(`Target: ${sharpFormat}, quality: ${quality}%, maxSize: ${maxSizeKB}KB, DPI: ${dpi}`);

        // If no size limit, just convert
        if (!maxSizeKB) {
            const result = await sharp(buffer)
                .withMetadata({ density: dpi })
                .toFormat(sharpFormat, {
                    quality: Math.min(Math.max(quality, 1), 100)
                })
                .toBuffer();

            const sizeKB = Math.round(result.length / 1024);
            console.log(`Converted without size limit: ${sizeKB} KB`);
            return result;
        }

        const targetBytes = maxSizeKB * 1024;
        console.log(`Target size: ${targetBytes} bytes (${maxSizeKB} KB)`);

        // If image is already small enough, return as is
        const initialSize = buffer.length;
        if (initialSize <= targetBytes) {
            console.log(`Image already meets size requirement: ${Math.round(initialSize / 1024)} KB`);
            return buffer;
        }

        // Optimize for size
        let currentQuality = Math.min(Math.max(quality, 1), 100);
        let outputBuffer;
        let attempts = 0;
        const maxAttempts = 15;

        console.log(`Starting size optimization, initial quality: ${currentQuality}%`);

        while (attempts < maxAttempts) {
            outputBuffer = await sharp(buffer)
                .withMetadata({ density: dpi })
                .toFormat(sharpFormat, {
                    quality: currentQuality,
                    ...(sharpFormat === 'png' ? { compressionLevel: 9 } : {}),
                    ...(sharpFormat === 'webp' ? { lossless: false } : {})
                })
                .toBuffer();

            const currentSize = outputBuffer.length;
            const currentSizeKB = Math.round(currentSize / 1024);
            console.log(`Attempt ${attempts + 1}: quality ${currentQuality}%, size ${currentSizeKB} KB`);

            if (currentSize <= targetBytes) {
                console.log(`✅ Target achieved: ${currentSizeKB} KB at quality ${currentQuality}%`);
                return outputBuffer;
            }

            // Calculate how much to reduce quality
            const oversizeRatio = currentSize / targetBytes;
            let qualityReduction;

            if (oversizeRatio > 3) {
                qualityReduction = 40;
            } else if (oversizeRatio > 2) {
                qualityReduction = 25;
            } else if (oversizeRatio > 1.5) {
                qualityReduction = 15;
            } else if (oversizeRatio > 1.2) {
                qualityReduction = 10;
            } else {
                qualityReduction = 5;
            }

            currentQuality = Math.max(1, currentQuality - qualityReduction);

            // If we hit minimum quality, try without metadata
            if (currentQuality <= 10 && attempts > 5) {
                console.log('Trying without metadata...');
                outputBuffer = await sharp(buffer)
                    .toFormat(sharpFormat, {
                        quality: 1,
                        ...(sharpFormat === 'png' ? { compressionLevel: 9 } : {}),
                        ...(sharpFormat === 'webp' ? { lossless: false } : {})
                    })
                    .toBuffer();

                const finalSizeKB = Math.round(outputBuffer.length / 1024);
                if (outputBuffer.length <= targetBytes) {
                    console.log(`✅ Achieved with minimum quality: ${finalSizeKB} KB`);
                    return outputBuffer;
                }
                console.log(`Minimum quality still too large: ${finalSizeKB} KB`);
            }

            attempts++;
        }

        console.log(`Max attempts reached. Returning best effort: ${Math.round(outputBuffer.length / 1024)} KB`);
        return outputBuffer;
    }

    async convertToPDF(imageBuffer, width, height) {
        try {
            console.log('Creating PDF document');

            // Convert image to JPEG for PDF embedding
            const jpegBuffer = await sharp(imageBuffer)
                .jpeg({ quality: 90 })
                .toBuffer();

            console.log(`JPEG for PDF: ${Math.round(jpegBuffer.length / 1024)} KB`);

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

            console.log(`PDF created: ${Math.round(pdfBuffer.length / 1024)} KB`);
            return pdfBuffer;
        } catch (error) {
            console.error('PDF conversion error:', error);
            throw new Error(`Failed to create PDF: ${error.message}`);
        }
    }
}

module.exports = new ImageService();