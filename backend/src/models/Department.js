const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const departmentSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        default: null,
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
    parentDepartmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null,
    },
    headEmploymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmploymentState',
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });
departmentSchema.index({ organizationId: 1, code: 1 }, { unique: true, sparse: true });
departmentSchema.index({ organizationId: 1, branchId: 1, isActive: 1 });

departmentSchema.plugin(attachStructuredMirror('Department'));

module.exports = mongoose.model('Department', departmentSchema);
