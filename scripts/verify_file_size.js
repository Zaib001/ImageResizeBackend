const ImageService = require('../src/services/ImageService');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('--- File Size Limit Verification ---');

    // Create a large, high-frequency noise image (hard to compress)
    const inputPath = path.join(__dirname, 'size_test_input.png');

    // 2000x2000 random noise
    const width = 2000;
    const height = 2000;
    const channels = 3;
    const buffer = Buffer.alloc(width * height * channels);
    for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
    }

    await sharp(buffer, { raw: { width, height, channels } })
        .png()
        .toFile(inputPath);

    const inputFileSize = (fs.statSync(inputPath).size / 1024).toFixed(2);
    console.log(`Input image created: ${inputFileSize} KB`);

    try {
        const TARGET_SIZE_KB = 100; // Aggressive target for a noisy 2000x2000 image
        console.log(`\nTest: Compress 2000x2000 noise image to ${TARGET_SIZE_KB} KB`);

        const startTime = Date.now();
        const resultBuffer = await ImageService.processImage(fs.readFileSync(inputPath), {
            width: 1000,
            height: 1000,
            mode: 'stretch',
            format: 'jpeg',
            quality: 90,
            maxSizeKB: TARGET_SIZE_KB
        });
        const Duration = Date.now() - startTime;

        const resultSizeKB = (resultBuffer.length / 1024).toFixed(2);
        console.log(`Result Size: ${resultSizeKB} KB`);
        console.log(`Time taken: ${Duration}ms`);

        if (parseFloat(resultSizeKB) <= TARGET_SIZE_KB) {
            console.log('PASS: File size is within limit.');
        } else {
            console.error(`FAIL: File size ${resultSizeKB} KB exceeds limit ${TARGET_SIZE_KB} KB`);
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
}

runTests();
