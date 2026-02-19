const mongoose = require('mongoose');

const otpSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    flow: {
        type: String,
        enum: ['REGISTER', 'LOGIN'],
        required: true,
    },
    registerData: {
        firstName: String,
        middleName: String,
        surname: String,
        dateOfBirth: Date,
        email: String,
        mobile: String,
        avatarUrl: String,
        passwordHash: String,
    },
    loginData: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    emailOtp: {
        type: String,
    },
    mobileOtp: {
        type: String,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});

// Auto-delete expired OTP sessions
otpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpSession', otpSessionSchema);
