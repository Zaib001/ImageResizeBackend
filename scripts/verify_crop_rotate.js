const ImageService = require('../src/services/ImageService');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('--- Crop & Rotate Verification ---');

    // Create a 100x50 test image
    // Left half red, right half blue
    const inputPath = path.join(__dirname, 'crop_test_input.png');
    await sharp({
        create: {
            width: 100,
            height: 50,
            channels: 3,
            background: { r: 255, g: 0, b: 0 } // Red
        }
    })
        .composite([{
            input: {
                create: {
                    width: 50,
                    height: 50,
                    channels: 3,
                    background: { r: 0, g: 0, b: 255 } // Blue
                }
            },
            left: 50,
            top: 0
        }])
        .png()
        .toFile(inputPath);

    try {
        // Test 1: Rotate 90 deg. Should become 50x100.
        // Top half red, bottom half blue.
        console.log('\nTest 1: Rotate 90');
        const buffer1 = await ImageService.processImage(inputPath, {
            width: 50,
            height: 100,
            mode: 'stretch',
            rotate: 90
        });
        const meta1 = await sharp(buffer1).metadata();
        console.log(`Dims: ${meta1.width}x${meta1.height}`);
        if (meta1.width === 50 && meta1.height === 100) {
            console.log('PASS: Rotation dimensions correct');
        } else {
            console.error('FAIL: Rotation dimensions incorrect');
        }

        // Test 2: Rotate 90 + Crop Top 10x10.
        // Rotated image is 50x100. Top is Red.
        // Crop 0,0,10,10 should be Red.
        console.log('\nTest 2: Rotate 90 + Crop Top-Left');
        const buffer2 = await ImageService.processImage(inputPath, {
            width: 10,
            height: 10,
            mode: 'stretch',
            rotate: 90,
            crop: { x: 0, y: 0, width: 10, height: 10 }
        });
        const meta2 = await sharp(buffer2).metadata();
        const stats2 = await sharp(buffer2).stats();
        console.log(`Dims: ${meta2.width}x${meta2.height}`);
        console.log(`Color: R=${stats2.channels[0].mean.toFixed(0)}, B=${stats2.channels[2].mean.toFixed(0)}`);

        if (meta2.width === 10 && stats2.channels[0].mean > 200) {
            console.log('PASS: Cropped Red region from rotated image');
        } else {
            console.error('FAIL: cropped wrong region or color');
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
}

runTests();
