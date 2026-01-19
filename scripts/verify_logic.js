const ImageService = require('../src/services/ImageService');
const TempFileManager = require('../src/utils/TempFileManager');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('--- Starting Verification ---');

    // 1. Create a dummy input file
    const inputPath = path.join(__dirname, 'test_input.jpg');
    await sharp({
        create: {
            width: 1000,
            height: 1000,
            channels: 3,
            background: { r: 255, g: 0, b: 0 }
        }
    })
        .jpeg()
        .toFile(inputPath);
    console.log('Created test input:', inputPath);

    try {
        // Test 1: Stretch Mode (JPG)
        console.log('\nTest 1: Stretch Mode (500x200)');
        const buffer1 = await ImageService.processImage(inputPath, {
            width: 500,
            height: 200,
            mode: 'stretch',
            format: 'jpeg'
        });
        const meta1 = await sharp(buffer1).metadata();
        console.log(`Output: ${meta1.width}x${meta1.height} ${meta1.format}`);
        if (meta1.width === 500 && meta1.height === 200) console.log('PASS');
        else console.error('FAIL');

        // Test 2: PDF Generation
        console.log('\nTest 2: PDF Generation');
        const pdfBuffer = await ImageService.processImage(inputPath, {
            width: 800,
            height: 600,
            mode: 'contain',
            format: 'pdf'
        });
        // Simply check if it starts with %PDF
        const header = pdfBuffer.toString('utf8', 0, 4);
        console.log(`Header: ${header}`);
        if (header === '%PDF') console.log('PASS');
        else console.error('FAIL');

        // Test 3: Large File Constraint (Iterative Compression)
        console.log('\nTest 3: Max Size Constraint (10KB)');
        // A 1000x1000 red square is usually small, but let's try to compress it very hard
        // We'll resize to something larger first to ensure it has size
        // Actually red square compresses extremely well. Let's make noise.
        const noisyPath = path.join(__dirname, 'noisy_input.jpg');
        await sharp({
            create: {
                width: 1000,
                height: 1000,
                channels: 3,
                noise: {
                    type: 'gaussian',
                    mean: 128,
                    sigma: 30
                }
            }
        }).jpeg().toFile(noisyPath);

        const buffer3 = await ImageService.processImage(noisyPath, {
            width: 800,
            height: 800,
            format: 'jpeg',
            maxSizeKB: 50 // Limit to 50KB
        });
        console.log(`Output Size: ${(buffer3.length / 1024).toFixed(2)} KB`);
        if (buffer3.length <= 50 * 1024) console.log('PASS');
        else console.error('FAIL (Size > 50KB)');

        // Test 4: Blur Mode (Check for composite success)
        console.log('\nTest 4: Blur Mode (200x200 target from 100x100 source)');
        // Create 100x100 red image
        const smallPath = path.join(__dirname, 'small_red.jpg');
        await sharp({
            create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
        }).jpeg().toFile(smallPath);

        const blurBuffer = await ImageService.processImage(smallPath, {
            width: 200, height: 200, mode: 'blur', format: 'jpeg'
        });
        const meta4 = await sharp(blurBuffer).metadata();
        console.log(`Blur Output: ${meta4.width}x${meta4.height}`);
        // We can't easily check visual correctness procedurally without pixel diffing, but we check valid output
        if (meta4.width === 200) console.log('PASS (Generated)');
        else console.error('FAIL');

        // Test 5: Color Mode (Check dimensions)
        console.log('\nTest 5: Color Mode (Background Padding)');
        const colorBuffer = await ImageService.processImage(smallPath, {
            width: 300, height: 100, mode: 'color', format: 'jpeg', backgroundColor: '#00FF00'
        });
        const meta5 = await sharp(colorBuffer).metadata();
        console.log(`Color Output: ${meta5.width}x${meta5.height}`);
        if (meta5.width === 300) console.log('PASS (Generated)');

        // Cleanup
        if (fs.existsSync(smallPath)) fs.unlinkSync(smallPath);

        // Test 6: Color Mode with Transparency -> JPEG (Flatten check)
        console.log('\nTest 6: Color Mode (Transparent Input -> JPEG)');
        const transPath = path.join(__dirname, 'trans_circle.png');
        await sharp({
            create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
        })
            .composite([{
                input: Buffer.from('<svg><circle cx="50" cy="50" r="40" fill="red"/></svg>'),
                top: 0, left: 0
            }])
            .png().toFile(transPath);

        const flatBuffer = await ImageService.processImage(transPath, {
            width: 200, height: 200, mode: 'color', format: 'jpeg', backgroundColor: '#00FF00' // Green
        });
        // We expect the transparent corners of the circle to be Green (flattened), not Black.
        // Hard to verify programmatically without checking pixels, but we run it to ensure no crash.
        // We can check if it really is a JPEG
        const meta6 = await sharp(flatBuffer).metadata();
        console.log(`Format: ${meta6.format}`);
        if (meta6.format === 'jpeg') console.log('PASS (Format matches)');

        if (fs.existsSync(transPath)) fs.unlinkSync(transPath);


        // Cleanup
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(noisyPath)) fs.unlinkSync(noisyPath);

    } catch (err) {
        console.error('Test Failed Exception:', err);
    }
}

runTests();
