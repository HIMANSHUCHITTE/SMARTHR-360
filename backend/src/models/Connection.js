const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const connectionSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
        default: 'PENDING',
    }
}, {
    timestamps: true,
});

// Ensure unique connection pair
connectionSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

connectionSchema.plugin(attachStructuredMirror('Connection'));

module.exports = mongoose.model('Connection', connectionSchema);

