const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const applicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobPosting',
        required: true,
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    candidateName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    resumeText: { // detailed text for AI analysis
        type: String,
        required: true
    },
    aiScore: {
        type: Number,
        default: 0,
    },
    aiAnalysis: {
        type: String, // Summary of AI feedback
    },
    status: {
        type: String,
        enum: ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'HIRED'],
        default: 'APPLIED',
    },
}, {
    timestamps: true,
});

applicationSchema.plugin(attachStructuredMirror('Application'));

module.exports = mongoose.model('Application', applicationSchema);

