const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const approvalStepSchema = new mongoose.Schema({
    order: { type: Number, required: true },
    role: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'SKIPPED'],
        default: 'PENDING',
    },
    actedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    actedAt: {
        type: Date,
        default: null,
    },
    note: {
        type: String,
        default: '',
    },
}, { _id: false });

const approvalRequestSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    requestType: {
        type: String,
        enum: ['LEAVE', 'EXPENSE', 'PROMOTION', 'TERMINATION'],
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    sourceModel: {
        type: String,
        default: null,
    },
    sourceId: {
        type: String,
        default: null,
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    requestedFor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM',
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        default: 'PENDING',
    },
    currentStep: {
        type: Number,
        default: 0,
    },
    approvalChain: {
        type: [approvalStepSchema],
        default: () => [],
    },
    finalDecision: {
        decidedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        decidedAt: {
            type: Date,
            default: null,
        },
        note: {
            type: String,
            default: '',
        },
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
});

approvalRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
approvalRequestSchema.index({ organizationId: 1, requestType: 1, status: 1, createdAt: -1 });
approvalRequestSchema.index({ organizationId: 1, sourceModel: 1, sourceId: 1 });

approvalRequestSchema.plugin(attachStructuredMirror('ApprovalRequest'));

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
