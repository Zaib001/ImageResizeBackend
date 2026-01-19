const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

class TempFileManager {
    constructor() {
        this.baseDir = path.join(os.tmpdir(), 'image-resize-backend');
        this.ensureDir();
        setInterval(() => this.cleanupOrphans(), 3600000);
    }

    ensureDir() {
        fs.ensureDirSync(this.baseDir);
    }

    generatePath(ext = '.tmp') {
        const id = uuidv4();
        const filename = `${Date.now()}-${id}${ext}`;
        return path.join(this.baseDir, filename);
    }

    registerCleanup(res, filePaths) {
        if (!Array.isArray(filePaths)) filePaths = [filePaths];

        let cleanupHasRun = false;

        const cleanup = async () => {
            if (cleanupHasRun) return;
            cleanupHasRun = true;

            for (const filePath of filePaths) {
                try {
                    await fs.unlink(filePath);
                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        console.error(`Cleanup failure [${filePath}]:`, err.message);
                    }
                }
            }
        };

        res.on('finish', cleanup);
        res.on('close', cleanup);
    }

    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.error(`Immediate delete failure [${filePath}]:`, err.message);
            }
        }
    }

    async cleanupOrphans() {
        try {
            const files = await fs.readdir(this.baseDir);
            const now = Date.now();
            const TTL = 3600000;

            for (const file of files) {
                const filePath = path.join(this.baseDir, file);
                try {
                    const timestamp = parseInt(file.split('-')[0]);
                    if (!isNaN(timestamp) && (now - timestamp > TTL)) {
                        await fs.unlink(filePath);
                    }
                } catch (e) { }
            }
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.error('Orphan cleanup failed:', err.message);
            }
        }
    }
}

module.exports = new TempFileManager();
