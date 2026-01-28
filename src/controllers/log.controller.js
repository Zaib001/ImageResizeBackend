const ActivityLog = require('../models/ActivityLog.model');

/**
 * Utility to create a new activity log
 */
const logActivity = async (adminId, action, description, type = 'info', metadata = {}) => {
    try {
        await ActivityLog.create({
            admin: adminId,
            action,
            description,
            type,
            metadata
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

/**
 * @desc    Get recent activity logs
 * @route   GET /api/admin/logs
 * @access  Private
 */
const getLogs = async (req, res) => {
    try {
        const logs = await ActivityLog.find()
            .sort('-createdAt')
            .limit(10)
            .populate('admin', 'name email');

        res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch logs',
            error: error.message
        });
    }
};

module.exports = {
    logActivity,
    getLogs
};
