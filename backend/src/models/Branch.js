const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const branchSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    code: {
        type: String,
        trim: true,
        uppercase: true,
    },
    location: {
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
    },
    timezone: {
        type: String,
        default: 'Asia/Kolkata',
    },
    currency: {
        type: String,
        default: 'INR',
    },
    isHeadOffice: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

branchSchema.index({ organizationId: 1, name: 1 }, { unique: true });
branchSchema.index({ organizationId: 1, code: 1 }, { unique: true, sparse: true });

branchSchema.plugin(attachStructuredMirror('Branch'));

module.exports = mongoose.model('Branch', branchSchema);
