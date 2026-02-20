const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
    },
    visibility: {
        type: String,
        enum: ['PUBLIC', 'ORG_ONLY'],
        default: 'PUBLIC',
    },
    content: {
        type: String,
        default: '',
        trim: true,
    },
    attachments: [{
        type: {
            type: String,
            enum: ['IMAGE', 'VIDEO'],
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true,
});

postSchema.index({ createdAt: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ organizationId: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
