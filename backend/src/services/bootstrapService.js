const User = require('../models/User');
const { hashPassword } = require('../utils/authUtils');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const ensureSuperAdmin = async () => {
    const emailRaw = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!emailRaw || !password) {
        console.warn('SuperAdmin bootstrap skipped: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD missing');
        return;
    }

    const email = normalizeEmail(emailRaw);
    const passwordHash = await hashPassword(password);

    const existing = await User.findOne({ email }).select('+passwordHash');
    if (!existing) {
        await User.create({
            email,
            passwordHash,
            profile: {
                firstName: 'Super',
                middleName: '',
                surname: 'Admin',
                lastName: 'Admin',
            },
            isSuperAdmin: true,
        });
        console.log(`SuperAdmin created: ${email}`);
        return;
    }

    await User.findByIdAndUpdate(existing._id, {
        $set: {
            passwordHash,
            isSuperAdmin: true,
            'profile.firstName': existing.profile?.firstName || 'Super',
            'profile.surname': existing.profile?.surname || 'Admin',
            'profile.lastName': existing.profile?.lastName || 'Admin',
        },
    });
    console.log(`SuperAdmin updated: ${email}`);
};

module.exports = { ensureSuperAdmin };
