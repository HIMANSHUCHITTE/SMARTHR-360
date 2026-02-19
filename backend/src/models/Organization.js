const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');
const {
    ORGANIZATION_TYPES,
    DEFAULT_UNIVERSAL_LEVELS,
    getOrganizationTemplates,
} = require('../constants/organizationTemplates');

const defaultGlobalPolicies = () => ({
    leavePolicy: {
        annualLeaveDays: 18,
        carryForwardDays: 8,
        approvalMode: 'MANAGER_THEN_OWNER',
    },
    attendancePolicy: {
        weeklyOffDays: 1,
        lateGraceMinutes: 15,
        overtimeEnabled: false,
    },
    probationPolicy: {
        durationMonths: 6,
        autoConfirmOnCompletion: false,
    },
    approvalPolicy: {
        matrixEnabled: false,
        allowSelfApproval: false,
    },
});

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    organizationType: {
        type: String,
        enum: Object.values(ORGANIZATION_TYPES),
        default: ORGANIZATION_TYPES.CORPORATE_IT,
    },
    organizationTypeLocked: {
        type: Boolean,
        default: false,
    },
    subscription: {
        planId: { type: String, enum: ['FREE', 'PRO', 'ENTERPRISE'], default: 'FREE' },
        status: { type: String, enum: ['ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED'], default: 'ACTIVE' },
        validUntil: { type: Date },
        employeeLimit: { type: Number, default: 5 },
        features: [{ type: String }],
    },
    platformStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'],
        default: 'PENDING',
    },
    statusHistory: [{
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'],
        },
        changedAt: {
            type: Date,
            default: Date.now,
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        note: {
            type: String,
        },
    }],
    settings: {
        branding: {
            logoUrl: String,
            primaryColor: String,
        },
        modulesEnabled: {
            payroll: { type: Boolean, default: false },
            recruitment: { type: Boolean, default: false },
        },
    },
    globalPolicies: {
        type: mongoose.Schema.Types.Mixed,
        default: defaultGlobalPolicies,
    },
    compliance: {
        kycVerified: { type: Boolean, default: false },
        emailVerified: { type: Boolean, default: false },
        suspiciousLoginAttempts: { type: Number, default: 0 },
        lastReviewAt: { type: Date },
    },
    hierarchyConfig: {
        templates: {
            type: [{
                type: { type: String, required: true },
                name: { type: String, required: true },
                levels: [{ type: String }],
                reportingExample: [{ type: String }],
                departments: [{ type: String }],
                roleBehavior: { type: String, default: '' },
            }],
            default: getOrganizationTemplates,
        },
        activeTemplateType: {
            type: String,
            enum: Object.values(ORGANIZATION_TYPES),
            default: ORGANIZATION_TYPES.CORPORATE_IT,
        },
        customLevels: {
            type: [String],
            default: () => [],
        },
        universalLevels: {
            type: [String],
            default: () => [...DEFAULT_UNIVERSAL_LEVELS],
        },
        matrixReportingEnabled: {
            type: Boolean,
            default: false,
        },
        visibilityPolicy: {
            type: String,
            enum: ['DOWNLINE_ONLY', 'ALL'],
            default: 'DOWNLINE_ONLY',
        },
        blockUpwardVisibility: {
            type: Boolean,
            default: true,
        },
    },
}, {
    timestamps: true,
});

organizationSchema.index({ ownerId: 1, organizationType: 1 });
organizationSchema.index({ organizationType: 1, platformStatus: 1 });

organizationSchema.plugin(attachStructuredMirror('Organization'));

module.exports = mongoose.model('Organization', organizationSchema);

