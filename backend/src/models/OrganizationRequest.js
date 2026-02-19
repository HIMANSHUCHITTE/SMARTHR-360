const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');
const { ORGANIZATION_TYPES } = require('../constants/organizationTemplates');

const organizationRequestSchema = new mongoose.Schema({
    requestedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    organizationName: {
        type: String,
        required: true,
        trim: true,
    },
    industryType: {
        type: String,
        required: true,
        trim: true,
    },
    organizationType: {
        type: String,
        enum: Object.values(ORGANIZATION_TYPES),
        required: true,
    },
    companySize: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
    },
    decision: {
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        reason: {
            type: String,
            default: '',
            trim: true,
        },
    },
    linkedOrganizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
    },
    revision: {
        type: Number,
        default: 1,
    },
}, {
    timestamps: true,
});

organizationRequestSchema.index({ requestedByUserId: 1, status: 1, createdAt: -1 });
organizationRequestSchema.index({ status: 1, createdAt: -1 });
organizationRequestSchema.index({ linkedOrganizationId: 1 }, { sparse: true });

organizationRequestSchema.plugin(attachStructuredMirror('OrganizationRequest'));

module.exports = mongoose.model('OrganizationRequest', organizationRequestSchema);
