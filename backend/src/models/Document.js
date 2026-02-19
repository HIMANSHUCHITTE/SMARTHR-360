const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    userId: { // Owner of the document
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['PAYSLIP', 'CONTRACT', 'OFFER_LETTER', 'RELIEVING_LETTER', 'ID_PROOF', 'OTHER'],
        required: true,
    },
    fileUrl: {
        type: String, // Mock URL for now, or local path
        required: true,
    },
    uploadedBy: { // Who uploaded it (Admin vs Employee)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Document', documentSchema);
