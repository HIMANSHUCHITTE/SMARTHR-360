const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const employeeAssetSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    employmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmploymentState',
        required: true,
    },
    itemName: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        trim: true,
        default: '',
    },
    specs: {
        type: String,
        trim: true,
        default: '',
    },
    estimatedValue: {
        type: Number,
        default: 0,
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1,
    },
    status: {
        type: String,
        enum: ['ISSUED', 'RETURNED', 'LOST', 'DAMAGED'],
        default: 'ISSUED',
    },
    issuedAt: {
        type: Date,
        default: Date.now,
    },
    returnedAt: {
        type: Date,
        default: null,
    },
    notes: {
        type: String,
        trim: true,
        default: '',
    },
}, {
    timestamps: true,
});

employeeAssetSchema.index({ organizationId: 1, employmentId: 1, status: 1, issuedAt: -1 });
employeeAssetSchema.plugin(attachStructuredMirror('EmployeeAsset'));

module.exports = mongoose.model('EmployeeAsset', employeeAssetSchema);
