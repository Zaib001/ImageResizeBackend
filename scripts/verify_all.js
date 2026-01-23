const ImageService = require('../src/services/ImageService');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('--- Final QA: Comprehensive Regression Test ---');

    // Create a 500x500 test image suitable for crop/rotate checks
    // Quadrants: TL=Red, TR=Green, BL=Blue, BR=Yellow
    const inputPath = path.join(__dirname, 'qa_test_input.png');

    // Create base 500x500 white
    await sharp({
        create: { width: 500, height: 500, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
        .composite([
            { input: { create: { width: 250, height: 250, channels: 3, background: { r: 255, g: 0, b: 0 } } }, left: 0, top: 0 }, // Red TL
            { input: { create: { width: 250, height: 250, channels: 3, background: { r: 0, g: 255, b: 0 } } }, left: 250, top: 0 }, // Green TR
            { input: { create: { width: 250, height: 250, channels: 3, background: { r: 0, g: 0, b: 255 } } }, left: 0, top: 250 }, // Blue BL
            { input: { create: { width: 250, height: 250, channels: 3, background: { r: 255, g: 255, b: 0 } } }, left: 250, top: 250 } // Yellow BR
        ])
        .png()
        .toFile(inputPath);

    const inputBuffer = fs.readFileSync(inputPath);

    try {
        // Scenario 1: Complex Transformation + Size Limit
        // Rotate 90 deg -> Green becomes BR, Red becomes TR, Yellow becomes BL, Blue becomes TL.
        // Wait:
        // Original:
        // R G
        // B Y
        // Rotate 90 deg clockwise:
        // B R
        // Y G

        // We want to crop the NEW Top-Left (which was Blue).
        // Resize to 100x100.
        // Limit size to 5KB.
        // Format: JPEG.

        console.log('\nTest 1: Rotate 90 + Crop TL + Resize + 5KB Limit (JPEG)');
        const buffer1 = await ImageService.processImage(inputBuffer, {
            rotate: 90,
            crop: { x: 0, y: 0, width: 250, height: 250 }, // Should be the Blue quadrant
            width: 100,
            height: 100,
            unit: 'px',
            mode: 'stretch',
            format: 'jpeg',
            maxSizeKB: 5,
            quality: 90
        });

        const meta1 = await sharp(buffer1).metadata();
        const stats1 = await sharp(buffer1).stats();

        console.log(`Dims: ${meta1.width}x${meta1.height}`);
        console.log(`Size: ${(buffer1.length / 1024).toFixed(2)} KB (Limit: 5KB)`);
        console.log(`Color: Blue_Mean=${stats1.channels[2].mean.toFixed(0)}`);

        if (buffer1.length < 5 * 1024 && meta1.width === 100 && stats1.channels[2].mean > 200) {
            console.log('PASS: Size limit respected, correct crop region (Blue), correct dimensions.');
        } else {
            console.error('FAIL: Combined transformation failed.');
        }


        // Scenario 2: PNG Transparency + Resize
        console.log('\nTest 2: PNG Resize (Transparency Check)');
        // Just checking it runs without error and output is PNG
        const buffer2 = await ImageService.processImage(inputBuffer, {
            width: 50,
            height: 50,
            format: 'png',
            mode: 'contain',
            backgroundColor: 'rgba(0,0,0,0)'
        });
        const meta2 = await sharp(buffer2).metadata();
        if (meta2.format === 'png') {
            console.log('PASS: PNG generated successfully.');
        } else {
            console.error('FAIL: Expected PNG.');
        }


        // Scenario 3: PDF Generation
        console.log('\nTest 3: PDF Generation');
        const buffer3 = await ImageService.processImage(inputBuffer, {
            width: 100,
            height: 100,
            format: 'pdf',
            mode: 'stretch'
        });
        // PDF starting signature
        if (buffer3.toString('utf8', 0, 4) === '%PDF') {
            console.log('PASS: PDF generated successfully.');
        } else {
            console.error('FAIL: Invalid PDF header.');
        }

    } catch (err) {
        console.error('QA Test Error:', err);
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
}

runTests();
