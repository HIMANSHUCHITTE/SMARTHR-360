const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const roleSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null, // Null for System Roles (e.g. Owner, SuperAdmin if stored here, though SuperAdmin is usually flag)
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    level: {
        type: Number,
        min: 1,
        default: 100,
    },
    parentRoleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        default: null,
    },
    permissions: [{
        type: String, // e.g., 'employee:view', 'payroll:edit'
    }],
    access: [{
        module: {
            type: String,
            required: true,
        },
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false },
        approve: { type: Boolean, default: false },
    }],
    limits: {
        maxUsersPerRole: { type: Number, default: null },
        maxDirectReports: { type: Number, default: null },
        maxMonthlyApprovals: { type: Number, default: null },
        maxPayrollApprovalAmount: { type: Number, default: null },
    },
    isSystem: {
        type: Boolean,
        default: false, // If true, cannot be deleted/modified
    },
    description: String,
}, {
    timestamps: true,
});

// Compound index to ensure role names are unique per org
roleSchema.index({ organizationId: 1, name: 1 }, { unique: true });
roleSchema.index({ organizationId: 1, level: 1 });
roleSchema.index({ organizationId: 1, parentRoleId: 1 });

roleSchema.plugin(attachStructuredMirror('Role'));

module.exports = mongoose.model('Role', roleSchema);

