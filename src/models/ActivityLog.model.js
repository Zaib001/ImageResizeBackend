const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false
    },
    action: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['success', 'info', 'warning', 'error'],
        default: 'info'
    },
    metadata: {
        type: Object,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
