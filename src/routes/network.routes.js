const express = require('express');
const router = express.Router();
const networkController = require('../controllers/network.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public route
router.post('/subscribe', networkController.subscribe);

// Protected admin routes
router.get('/admin/members', authenticate, networkController.getMembers);
router.delete('/admin/members/:id', authenticate, networkController.deleteMember);

module.exports = router;
