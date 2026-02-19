const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const jobPostingSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    department: String,
    location: String,
    type: {
        type: String,
        enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'],
        default: 'FULL_TIME',
    },
    status: {
        type: String,
        enum: ['OPEN', 'CLOSED', 'DRAFT'],
        default: 'DRAFT',
    },
    requirements: [String], // Array of skills/keywords for AI matching
}, {
    timestamps: true,
});

jobPostingSchema.plugin(attachStructuredMirror('JobPosting'));

module.exports = mongoose.model('JobPosting', jobPostingSchema);

