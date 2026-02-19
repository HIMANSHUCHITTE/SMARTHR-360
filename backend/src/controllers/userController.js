const Joi = require('joi');
const User = require('../models/User');
const WorkHistory = require('../models/WorkHistory');
const { comparePassword, hashPassword } = require('../utils/authUtils');

const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

const profileSchema = Joi.object({
    firstName: Joi.string().trim().min(2).required(),
    middleName: Joi.string().trim().allow('', null).default(''),
    surname: Joi.string().trim().min(2).required(),
    gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').default('PREFER_NOT_TO_SAY'),
    dateOfBirth: Joi.date().allow(null),
    phone: Joi.string().allow('', null).default(''),
    alternatePhone: Joi.string().allow('', null).default(''),
    city: Joi.string().allow('', null).default(''),
    state: Joi.string().allow('', null).default(''),
    country: Joi.string().allow('', null).default(''),
    postalCode: Joi.string().allow('', null).default(''),
    currentAddress: Joi.string().allow('', null).default(''),
    permanentAddress: Joi.string().allow('', null).default(''),
    nationality: Joi.string().allow('', null).default(''),
    maritalStatus: Joi.string().allow('', null).default(''),
    bio: Joi.string().allow('', null).default(''),
    avatarUrl: Joi.string().allow('', null).default(''),
    linkedinUrl: Joi.string().allow('', null).default(''),
    portfolioUrl: Joi.string().allow('', null).default(''),
    githubUrl: Joi.string().allow('', null).default(''),
    emergencyContactName: Joi.string().allow('', null).default(''),
    emergencyContactPhone: Joi.string().allow('', null).default(''),
    headline: Joi.string().allow('', null).default(''),
    skills: Joi.array().items(Joi.string().trim().min(1)).default([]),
    skillsDetailed: Joi.array().items(Joi.string().trim().min(1)).default([]),
    certifications: Joi.array().items(Joi.string().trim().min(1)).default([]),
    languages: Joi.array().items(Joi.string().trim().min(1)).default([]),
    highestEducation: Joi.string().allow('', null).default(''),
    institutionName: Joi.string().allow('', null).default(''),
    graduationYear: Joi.number().allow(null),
    totalExperienceYears: Joi.number().min(0).default(0),
    expectedSalary: Joi.number().allow(null),
    preferredLocation: Joi.string().allow('', null).default(''),
    noticePeriodDays: Joi.number().allow(null),
    previousEmployments: Joi.array().items(
        Joi.object({
            companyName: Joi.string().allow('', null).default(''),
            role: Joi.string().allow('', null).default(''),
            from: Joi.date().allow(null),
            to: Joi.date().allow(null),
            description: Joi.string().allow('', null).default(''),
        })
    ).default([]),
    personalDocuments: Joi.array().items(
        Joi.object({
            title: Joi.string().allow('', null).default(''),
            type: Joi.string().allow('', null).default('OTHER'),
            fileUrl: Joi.string().allow('', null).default(''),
            uploadedAt: Joi.date().allow(null),
        })
    ).default([]),
});

const settingsSchema = Joi.object({
    language: Joi.string().valid('en', 'hi').default('en'),
    theme: Joi.string().valid('light', 'dark', 'system').default('system'),
    timezone: Joi.string().default('Asia/Kolkata'),
    dateFormat: Joi.string().valid('DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD').default('DD-MM-YYYY'),
    emailNotifications: Joi.boolean().default(true),
    desktopNotifications: Joi.boolean().default(true),
    weeklyDigest: Joi.boolean().default(true),
    compactMode: Joi.boolean().default(false),
    profileVisibility: Joi.string().valid('PUBLIC', 'PRIVATE').default('PUBLIC'),
});

const passwordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().pattern(passwordPattern).required(),
    confirmPassword: Joi.string().required(),
});

// @desc    Get Current User Profile
// @route   GET /api/user/profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update Profile
// @route   PATCH /api/user/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { error, value } = profileSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                'profile.firstName': value.firstName,
                'profile.middleName': value.middleName || '',
                'profile.surname': value.surname,
                'profile.lastName': value.surname,
                'profile.gender': value.gender,
                'profile.dateOfBirth': value.dateOfBirth || null,
                'profile.phone': value.phone || '',
                'profile.alternatePhone': value.alternatePhone || '',
                'profile.city': value.city || '',
                'profile.state': value.state || '',
                'profile.country': value.country || '',
                'profile.postalCode': value.postalCode || '',
                'profile.currentAddress': value.currentAddress || '',
                'profile.permanentAddress': value.permanentAddress || '',
                'profile.nationality': value.nationality || '',
                'profile.maritalStatus': value.maritalStatus || '',
                'profile.bio': value.bio || '',
                'profile.avatarUrl': value.avatarUrl || '',
                'profile.linkedinUrl': value.linkedinUrl || '',
                'profile.portfolioUrl': value.portfolioUrl || '',
                'profile.githubUrl': value.githubUrl || '',
                'profile.emergencyContactName': value.emergencyContactName || '',
                'profile.emergencyContactPhone': value.emergencyContactPhone || '',
                'professional.headline': value.headline || '',
                'professional.skills': value.skills || [],
                'professional.skillsDetailed': value.skillsDetailed || [],
                'professional.certifications': value.certifications || [],
                'professional.languages': value.languages || [],
                'professional.highestEducation': value.highestEducation || '',
                'professional.institutionName': value.institutionName || '',
                'professional.graduationYear': value.graduationYear || null,
                'professional.totalExperienceYears': value.totalExperienceYears || 0,
                'professional.expectedSalary': value.expectedSalary || null,
                'professional.preferredLocation': value.preferredLocation || '',
                'professional.noticePeriodDays': value.noticePeriodDays || null,
                'professional.previousEmployments': value.previousEmployments || [],
                personalDocuments: value.personalDocuments || [],
            },
            { new: true }
        );

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user settings
// @route   GET /api/user/settings
// @access  Private
exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('preferences email mobile');
        res.json({
            email: user.email,
            mobile: user.mobile || '',
            preferences: user.preferences || {},
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user settings
// @route   PATCH /api/user/settings
// @access  Private
exports.updateSettings = async (req, res) => {
    try {
        const { error, value } = settingsSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { preferences: value } },
            { new: true }
        ).select('preferences email mobile');

        res.json({
            email: user.email,
            mobile: user.mobile || '',
            preferences: user.preferences,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Change password
// @route   POST /api/user/change-password
// @access  Private
exports.changePassword = async (req, res) => {
    try {
        const { error, value } = passwordSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        if (value.newPassword !== value.confirmPassword) {
            return res.status(400).json({ message: 'New password and confirm password do not match' });
        }

        const user = await User.findById(req.user.id).select('+passwordHash');
        const isMatch = await comparePassword(value.currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const newHash = await hashPassword(value.newPassword);
        await User.findByIdAndUpdate(req.user.id, {
            $set: {
                passwordHash: newHash,
                'security.passwordChangedAt': new Date(),
            },
            $inc: { 'security.refreshTokenVersion': 1 },
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get current user's work history
// @route   GET /api/user/work-history
// @access  Private
exports.getWorkHistory = async (req, res) => {
    try {
        const rows = await WorkHistory.find({ userId: req.user.id })
            .populate('organizationId', 'name slug')
            .sort('-leftAt -joinedAt');

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
