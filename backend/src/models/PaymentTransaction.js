const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const paymentTransactionSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    planId: {
        type: String,
        enum: ['FREE', 'PRO', 'ENTERPRISE'],
        required: true,
    },
    billingCycle: {
        type: String,
        enum: ['MONTHLY', 'YEARLY'],
        default: 'MONTHLY',
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'USD',
    },
    gateway: {
        type: String,
        default: 'MOCK_GATEWAY',
    },
    paymentMethod: {
        cardHolder: { type: String, default: '' },
        cardLast4: { type: String, default: '' },
    },
    transactionRef: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED'],
        default: 'PENDING',
    },
    failureReason: {
        type: String,
    },
    paidAt: {
        type: Date,
    },
    metadata: {
        type: Object,
        default: {},
    },
}, { timestamps: true });

paymentTransactionSchema.index({ organizationId: 1, createdAt: -1 });

paymentTransactionSchema.plugin(attachStructuredMirror('PaymentTransaction'));

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);

