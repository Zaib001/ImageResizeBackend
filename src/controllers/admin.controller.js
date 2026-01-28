const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin.model');
const { logActivity } = require('./log.controller');

/**
 * Generate JWT token
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

/**
 * @desc    Admin login
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin with password field
        const admin = await Admin.findOne({ email }).select('+password');

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await admin.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        await admin.updateLastLogin();

        // Generate token
        const token = generateToken(admin._id);

        // Log login
        await logActivity(admin._id, 'LOGIN', `Session initiated for ${admin.name}`, 'success');

        // Remove password from response
        const adminData = admin.toObject();
        delete adminData.password;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                admin: adminData,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

/**
 * @desc    Get admin profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id);

        res.status(200).json({
            success: true,
            data: admin
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            error: error.message
        });
    }
};

/**
 * @desc    Update admin profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        const { name, avatar } = req.body;

        const admin = await Admin.findById(req.admin._id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        if (name) admin.name = name;
        if (avatar) admin.avatar = avatar;

        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: admin
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh
 * @access  Private
 */
const refreshToken = async (req, res) => {
    try {
        const token = generateToken(req.admin._id);

        res.status(200).json({
            success: true,
            data: { token }
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token',
            error: error.message
        });
    }
};

module.exports = {
    login,
    getProfile,
    updateProfile,
    refreshToken
};
