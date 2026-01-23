const ImageService = require('../src/services/ImageService');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('--- Percentage Crop Verification ---');

    // Create a 200x200 test image
    // Top-left quadrant (0-50% x 0-50%) is RED
    // Rest is BLUE
    const inputPath = path.join(__dirname, 'percent_crop_test.png');
    await sharp({
        create: {
            width: 200,
            height: 200,
            channels: 3,
            background: { r: 0, g: 0, b: 255 } // Blue
        }
    })
        .composite([{
            input: {
                create: {
                    width: 100,
                    height: 100,
                    channels: 3,
                    background: { r: 255, g: 0, b: 0 } // Red
                }
            },
            left: 0,
            top: 0
        }])
        .png()
        .toFile(inputPath);

    try {
        // Test: Crop 50% width, 50% height, at 0,0 offset.
        // Should result in a 100x100 RED image.
        // We pass unit: '%' explicitly.
        console.log('\nTest: Percentage Crop (50% x 50% at 0,0)');
        const buffer = await ImageService.processImage(fs.readFileSync(inputPath), {
            width: 100, // Output width (doesn't affect crop selection)
            height: 100, // Output height
            mode: 'stretch',
            // Simulating what the frontend will now send (parsed by controller):
            crop: {
                unit: '%',
                x: 0,
                y: 0,
                width: 50,
                height: 50
            }
        });

        const meta = await sharp(buffer).metadata();
        const stats = await sharp(buffer).stats();

        console.log(`Output Dims: ${meta.width}x${meta.height}`);
        console.log(`Color Stats: R=${stats.channels[0].mean.toFixed(0)}, B=${stats.channels[2].mean.toFixed(0)}`);

        // We expect predominantly RED (R ~ 255, B ~ 0)
        if (stats.channels[0].mean > 250 && stats.channels[2].mean < 10) {
            console.log('PASS: Percentage crop correctly selected the top-left quadrant.');
        } else {
            console.error('FAIL: Percentage crop selected wrong area.');
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
}

runTests();
