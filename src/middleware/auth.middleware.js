const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin.model');

/**
 * Verify JWT token and authenticate admin
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find admin
        const admin = await Admin.findById(decoded.id).select('-password');

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Admin not found.'
            });
        }

        // Attach admin to request
        req.admin = admin;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Authentication failed.',
            error: error.message
        });
    }
};

/**
 * Check if admin has required role
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access.'
            });
        }

        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. Insufficient permissions.'
            });
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize
};
