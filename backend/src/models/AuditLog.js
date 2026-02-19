const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const auditLogSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        required: true, // e.g., 'LOGIN', 'CREATE_EMPLOYEE', 'UPDATE_SETTINGS'
    },
    resource: {
        type: String, // e.g., 'Employee', 'Payroll'
    },
    resourceId: {
        type: String,
    },
    details: {
        type: Object, // Changed fields, previous values
    },
    ipAddress: String,
    userAgent: String,
}, {
    timestamps: true,
});

// TTL Index for retention (e.g., 1 year)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

auditLogSchema.plugin(attachStructuredMirror('AuditLog'));

module.exports = mongoose.model('AuditLog', auditLogSchema);

