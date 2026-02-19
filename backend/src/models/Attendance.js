const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const attendanceSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    clockIn: {
        type: Date,
    },
    clockOut: {
        type: Date,
    },
    duration: {
        type: Number, // in minutes
        default: 0
    },
    status: {
        type: String,
        enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE'],
        default: 'PRESENT'
    },
    ipAddress: String,
    notes: String
}, {
    timestamps: true,
});

// Compound index to ensure one record per user per day
attendanceSchema.index({ organizationId: 1, userId: 1, date: 1 }, { unique: true });

attendanceSchema.plugin(attachStructuredMirror('Attendance'));

module.exports = mongoose.model('Attendance', attendanceSchema);

