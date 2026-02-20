const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const applicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobPosting',
        required: true,
    },
    candidateUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    interviewAt: {
        type: Date,
        default: null,
    },
    interviewNote: {
        type: String,
        default: '',
    },
    joiningDate: {
        type: Date,
        default: null,
    },
    adminNote: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

applicationSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ jobId: 1, aiScore: -1 });
applicationSchema.index({ jobId: 1, candidateUserId: 1 }, { unique: true, sparse: true });

applicationSchema.plugin(attachStructuredMirror('Application'));

module.exports = mongoose.model('Application', applicationSchema);

