const NetworkMember = require('../models/NetworkMember.model');
const { logActivity } = require('./log.controller');

exports.subscribe = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Check if already exists
        const existing = await NetworkMember.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'This email is already part of the Intelligence Network' });
        }

        const member = new NetworkMember({ email });
        await member.save();

        // Log the activity
        await logActivity(null, 'NETWORK_JOIN', `New member joined: ${email}`, 'info');

        res.status(201).json({
            success: true,
            message: 'Welcome to the Intelligence Network'
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ message: 'An evaluation error occurred. Please try again later.' });
    }
};

exports.getMembers = async (req, res) => {
    try {
        const members = await NetworkMember.find().sort({ joinedAt: -1 });
        res.json(members);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve network members' });
    }
};

exports.deleteMember = async (req, res) => {
    try {
        await NetworkMember.findByIdAndDelete(req.params.id);
        res.json({ message: 'Member removed from network' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete member' });
    }
};
