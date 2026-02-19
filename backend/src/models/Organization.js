const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const defaultHierarchyTemplates = () => ([
    {
        type: 'CORPORATE_IT',
        name: 'Corporate / IT Company',
        levels: [
            'Shareholders',
            'Board of Directors',
            'CEO',
            'C-Level Executives (CTO, CFO, COO, CHRO)',
            'Department Directors',
            'Senior Managers',
            'Managers',
            'Team Leads',
            'Senior Employees',
            'Junior Employees / Interns',
        ],
        reportingExample: [
            'CEO',
            'CTO',
            'Engineering Director',
            'Project Manager',
            'Team Lead',
            'Developers',
        ],
    },
    {
        type: 'SCHOOL_COLLEGE',
        name: 'School / College',
        levels: [
            'Trust / Chairman',
            'Principal',
            'Vice Principal',
            'HOD',
            'Teachers',
            'Assistant Teachers',
        ],
        reportingExample: [
            'Principal',
            'Administrative Officer',
            'Clerks / Office Staff',
            'Peon / Support Staff',
        ],
    },
    {
        type: 'HOSPITAL',
        name: 'Hospital',
        levels: [
            'Hospital Owner / Board',
            'Medical Director',
            'Department Heads',
            'Senior Doctors',
            'Junior Doctors',
            'Nurses',
            'Ward Staff',
        ],
        reportingExample: [
            'Hospital Director',
            'Admin Manager',
            'Reception / Billing Staff',
        ],
    },
    {
        type: 'MANUFACTURING_FACTORY',
        name: 'Manufacturing / Factory',
        levels: [
            'Owner / Board',
            'Plant Head',
            'Production Manager',
            'Shift Supervisor',
            'Line Incharge',
            'Skilled Workers',
            'Helpers / Contract Workers',
        ],
        reportingExample: [
            'Plant Head',
            'Maintenance Manager',
            'Engineers',
            'Technicians',
        ],
    },
    {
        type: 'GOVERNMENT',
        name: 'Government Organization',
        levels: [
            'Ministry / Central Authority',
            'Chairman / Secretary',
            'Director',
            'Joint Director',
            'Section Officer',
            'Clerk',
            'Field Staff',
        ],
        reportingExample: [
            'Promotion flow usually follows seniority + grade model',
        ],
    },
    {
        type: 'RETAIL_CHAIN',
        name: 'Retail Chain',
        levels: [
            'Owner / Corporate Office',
            'Regional Manager',
            'Area Manager',
            'Store Manager',
            'Assistant Store Manager',
            'Cashier / Sales Executive',
            'Helper / Inventory Staff',
        ],
        reportingExample: [
            'Corporate Office',
            'Regional Manager',
            'Area Manager',
            'Store Manager',
            'Store Staff',
        ],
    },
]);

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
            }],
            default: defaultHierarchyTemplates,
        },
        universalLevels: {
            type: [String],
            default: () => [
                'Strategic Level (Decision Makers)',
                'Managerial Level (Control & Supervision)',
                'Operational Level (Execution)',
            ],
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

organizationSchema.plugin(attachStructuredMirror('Organization'));

module.exports = mongoose.model('Organization', organizationSchema);

