const express = require('express');
const router = express.Router();
const {
    login,
    getProfile,
    updateProfile,
    refreshToken
} = require('../controllers/admin.controller');
const {
    getSettings,
    updateSettings
} = require('../controllers/setting.controller');
const { getLogs } = require('../controllers/log.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateLogin } = require('../middleware/validation.middleware');

// Public routes
router.post('/login', validateLogin, login);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/refresh', refreshToken);

// Settings routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Logs route
router.get('/logs', getLogs);

module.exports = router;
