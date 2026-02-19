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
    },
    permissions: [{
        type: String, // e.g., 'employee:view', 'payroll:edit'
    }],
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

roleSchema.plugin(attachStructuredMirror('Role'));

module.exports = mongoose.model('Role', roleSchema);

