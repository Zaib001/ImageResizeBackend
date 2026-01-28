const Setting = require('../models/Setting.model');
const { logActivity } = require('./log.controller');

/**
 * @desc    Get system settings
 * @route   GET /api/admin/settings
 * @access  Private
 */
const getSettings = async (req, res) => {
    try {
        const settings = await Setting.getSettings();

        res.status(200).json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
};

/**
 * @desc    Update system settings
 * @route   PUT /api/admin/settings
 * @access  Private
 */
const updateSettings = async (req, res) => {
    try {
        const settings = await Setting.getSettings();

        // Update sections
        if (req.body.imaging) settings.imaging = { ...settings.imaging.toObject(), ...req.body.imaging };
        if (req.body.security) settings.security = { ...settings.security.toObject(), ...req.body.security };
        if (req.body.seo) settings.seo = { ...settings.seo.toObject(), ...req.body.seo };

        await settings.save();

        // Log setting update
        await logActivity(req.admin._id, 'SETTINGS_UPDATE', 'System parameters synchronized', 'info');

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: settings
        });

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
