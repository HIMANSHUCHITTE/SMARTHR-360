const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const employmentStateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true,
    },
    reportsToEmploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmploymentState',
        default: null,
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'SUSPENDED', 'INVITED', 'TERMINATED'],
        default: 'INVITED',
    },
    designation: {
        type: String,
    },
    department: {
        type: String,
    },
    joinedAt: {
        type: Date,
    },
    terminatedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// Compound index: A user can only have one active employment state per organization? 
// Or just one entry per org? Usually one effective role per org.
employmentStateSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

employmentStateSchema.plugin(attachStructuredMirror('EmploymentState'));

module.exports = mongoose.model('EmploymentState', employmentStateSchema);

