const ImageService = require('../src/services/ImageService');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('--- Performance & UX Optimization Verification ---');

    const inputPath = path.join(__dirname, 'perf_test_input.png');
    // Create large test image (2000x2000)
    await sharp({
        create: {
            width: 2000,
            height: 2000,
            channels: 3,
            background: { r: 100, g: 100, b: 100 }
        }
    }).png().toFile(inputPath);

    // Read buffer once to simulate upload
    const inputBuffer = fs.readFileSync(inputPath);

    try {
        // Test 1: Standard Full Process (Reference)
        const start1 = performance.now();
        await ImageService.processImage(inputBuffer, {
            width: 1000,
            height: 1000,
            unit: 'px',
            mode: 'stretch',
            format: 'png',
            quality: 90,
            isPreview: false
        });
        const end1 = performance.now();
        console.log(`Reference (PNG, q90, full): ${(end1 - start1).toFixed(2)} ms`);

        // Test 2: Preview Mode (Optimized)
        const start2 = performance.now();
        const bufferPreview = await ImageService.processImage(inputBuffer, {
            width: 1000,
            height: 1000,
            unit: 'px',
            mode: 'stretch',
            format: 'png', // Requested PNG
            quality: 90,
            isPreview: true // But isPreview should force JPEG & faster settings
        });
        const end2 = performance.now();
        console.log(`Preview (Requested PNG -> Forces JPEG, q50): ${(end2 - start2).toFixed(2)} ms`);

        // Verify Output Format
        const meta = await sharp(bufferPreview).metadata();
        console.log(`Preview Output Format: ${meta.format} (Expected: jpeg)`);

        if (meta.format === 'jpeg' && (end2 - start2) < (end1 - start1)) {
            console.log('PASS: Preview is faster and forced to JPEG');
        } else {
            console.error('FAIL: Optimization not effective');
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
}

runTests();
