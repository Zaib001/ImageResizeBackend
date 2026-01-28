const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    role: {
        type: String,
        default: 'admin',
        enum: ['admin', 'super-admin']
    },
    avatar: {
        type: String,
        default: ''
    },
    lastLogin: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function () {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Method to update last login
adminSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    await this.save();
};

module.exports = mongoose.model('Admin', adminSchema);
