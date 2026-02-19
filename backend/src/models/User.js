const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: true,
        select: false, // Don't return by default
    },
    mobile: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
    },
    dateOfBirth: {
        type: Date,
    },
    profile: {
        firstName: { type: String, required: true },
        middleName: { type: String, default: '' },
        surname: { type: String, default: '' },
        lastName: { type: String, required: true },
        gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], default: 'PREFER_NOT_TO_SAY' },
        dateOfBirth: { type: Date },
        phone: { type: String },
        alternatePhone: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        postalCode: { type: String },
        currentAddress: { type: String },
        permanentAddress: { type: String },
        nationality: { type: String },
        maritalStatus: { type: String },
        avatarUrl: { type: String },
        bio: { type: String },
        linkedinUrl: { type: String },
        portfolioUrl: { type: String },
        githubUrl: { type: String },
        emergencyContactName: { type: String },
        emergencyContactPhone: { type: String },
    },
    professional: {
        headline: { type: String, trim: true },
        skills: [{ type: String }],
        skillsDetailed: [{ type: String }],
        certifications: [{ type: String }],
        languages: [{ type: String }],
        highestEducation: { type: String },
        institutionName: { type: String },
        graduationYear: { type: Number },
        totalExperienceYears: { type: Number, default: 0 },
        expectedSalary: { type: Number },
        preferredLocation: { type: String },
        noticePeriodDays: { type: Number },
        previousEmployments: [{
            companyName: String,
            role: String,
            from: Date,
            to: Date,
            description: String,
        }],
        profileScore: { type: Number, default: 0 },
        reputationScore: { type: Number, default: 0 },
    },
    personalDocuments: [{
        title: { type: String, default: '' },
        type: { type: String, default: 'OTHER' },
        fileUrl: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
    }],
    preferences: {
        language: { type: String, default: 'en' },
        theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
        timezone: { type: String, default: 'Asia/Kolkata' },
        dateFormat: { type: String, enum: ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'], default: 'DD-MM-YYYY' },
        emailNotifications: { type: Boolean, default: true },
        desktopNotifications: { type: Boolean, default: true },
        weeklyDigest: { type: Boolean, default: true },
        compactMode: { type: Boolean, default: false },
        profileVisibility: { type: String, enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' },
    },
    employment: {
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
        currentOrganizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            default: null,
        },
    },
    isSuperAdmin: {
        type: Boolean,
        default: false,
    },
    security: {
        mfaEnabled: { type: Boolean, default: false },
        mfaSecret: { type: String, select: false },
        lastLogin: { type: Date },
        passwordChangedAt: { type: Date },
        refreshTokenVersion: { type: Number, default: 0 }, // For invalidation
    },
}, {
    timestamps: true,
});

// Index for email is automatic due to unique: true
userSchema.plugin(attachStructuredMirror('User'));

module.exports = mongoose.model('User', userSchema);

