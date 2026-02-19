const mongoose = require('mongoose');
const User = require('../src/models/User');
const { hashPassword } = require('../src/utils/authUtils');
const config = require('../src/config/env');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/SMARTHR-360');
        console.log('Connected to MongoDB');

        const email = String(process.env.SUPER_ADMIN_EMAIL || 'admin@smarthr.com').trim().toLowerCase();
        const password = process.env.SUPER_ADMIN_PASSWORD || 'password123';
        const hashedPassword = await hashPassword(password);

        let user = await User.findOne({ email });
        if (user) {
            console.log('Admin user already exists. Updating password...');
            user.passwordHash = hashedPassword;
            await user.save();
        } else {
            console.log('Creating new admin user...');
            user = await User.create({
                email,
                passwordHash: hashedPassword,
                profile: { firstName: 'Super', middleName: '', surname: 'Admin', lastName: 'Admin' },
                isSuperAdmin: true,
                security: { mfaEnabled: false }
            });
        }

        console.log(`\n✅ Admin User Ready:\nEmail: ${email}\nPassword: ${password}`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
};

seedAdmin();
