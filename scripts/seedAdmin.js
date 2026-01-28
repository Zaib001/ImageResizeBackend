require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin.model');

const seedAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({
            email: process.env.ADMIN_EMAIL || 'admin@imageresize.com'
        });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists');
            process.exit(0);
        }

        // Create admin
        const admin = await Admin.create({
            email: process.env.ADMIN_EMAIL || 'admin@imageresize.com',
            password: process.env.ADMIN_PASSWORD || 'Admin123!',
            name: process.env.ADMIN_NAME || 'Admin User',
            role: 'admin'
        });

        console.log('✅ Admin user created successfully');
        console.log('📧 Email:', admin.email);
        console.log('👤 Name:', admin.name);
        console.log('🔑 Password:', process.env.ADMIN_PASSWORD || 'Admin123!');
        console.log('\n⚠️  Please change the password after first login!');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();
