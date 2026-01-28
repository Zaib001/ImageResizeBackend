const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    imaging: {
        neuralUpscaling: { type: Boolean, default: true },
        maxResolution: { type: Number, default: 8000 },
        compressionAlgorithm: { type: String, default: 'Sharp (Balanced)' }
    },
    security: {
        twoFactorAuth: { type: Boolean, default: false },
        sessionExpiry: { type: Number, default: 24 },
        ipRestrictedMode: { type: Boolean, default: false }
    },
    seo: {
        sitemapAutoGeneration: { type: Boolean, default: true },
        metaSuffix: { type: String, default: '| Resizely.Core' },
        ogFallbackImage: { type: String, default: 'https://resizely.core/images/og-default.jpg' }
    }
}, { timestamps: true });

// Ensure only one settings document exists
settingSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('Setting', settingSchema);
