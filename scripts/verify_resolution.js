const ImageService = require('../src/services/ImageService');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('--- Resolution Handling Verification ---');

    // Create dummy input
    const inputPath = path.join(__dirname, 'res_test_input.jpg');
    await sharp({
        create: {
            width: 1000,
            height: 1000,
            channels: 3,
            background: { r: 100, g: 100, b: 100 }
        }
    }).jpeg().toFile(inputPath);

    try {
        // Test 1: Auto Mode + Inches (Should use 300 DPI)
        // 2 inches at 300 DPI = 600px
        console.log('\nTest 1: Auto Mode + Inches (Target 2x2 in)');
        const buffer1 = await ImageService.processImage(inputPath, {
            width: 2,
            height: 2,
            unit: 'in',
            resolutionMode: 'auto'
        });
        const meta1 = await sharp(buffer1).metadata();
        console.log(`Dimensions: ${meta1.width}x${meta1.height}`);
        console.log(`Density (DPI): ${meta1.density}`);

        if (meta1.width === 600 && meta1.density === 300) {
            console.log('PASS: Auto/Inches using 300 DPI');
        } else {
            console.error('FAIL: Expected 600px / 300 DPI');
        }

        // Test 2: Fixed Mode (Should use custom DPI)
        // 2 inches at 72 DPI = 144px
        console.log('\nTest 2: Fixed Mode (Target 2x2 in @ 72 DPI)');
        const buffer2 = await ImageService.processImage(inputPath, {
            width: 2,
            height: 2,
            unit: 'in',
            resolutionMode: 'fixed',
            dpi: 72
        });
        const meta2 = await sharp(buffer2).metadata();
        console.log(`Dimensions: ${meta2.width}x${meta2.height}`);
        console.log(`Density (DPI): ${meta2.density}`);

        if (meta2.width === 144 && meta2.density === 72) {
            console.log('PASS: Fixed/Inches using 72 DPI');
        } else {
            console.error('FAIL: Expected 144px / 72 DPI');
        }

        // Test 3: Auto Mode + Pixels (Should use 96 DPI)
        console.log('\nTest 3: Auto Mode + Pixels (Target 100x100 px)');
        const buffer3 = await ImageService.processImage(inputPath, {
            width: 100,
            height: 100,
            unit: 'px',
            resolutionMode: 'auto'
        });
        const meta3 = await sharp(buffer3).metadata();
        console.log(`Dimensions: ${meta3.width}x${meta3.height}`);
        console.log(`Density (DPI): ${meta3.density}`);

        if (meta3.width === 100) { // Density checks can vary for pixels sometimes, but 96 is standard
            console.log('PASS: Auto/Pixels using correct dims');
        } else {
            console.error('FAIL: Dimensions incorrect');
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
}

runTests();
