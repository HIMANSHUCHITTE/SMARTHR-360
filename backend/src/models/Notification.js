const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
    },
    type: {
        type: String,
        enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR'],
        default: 'INFO',
    },
    title: String,
    message: String,
    isRead: {
        type: Boolean,
        default: false,
    },
    actionLink: String,
}, {
    timestamps: true,
});

notificationSchema.plugin(attachStructuredMirror('Notification'));

module.exports = mongoose.model('Notification', notificationSchema);

