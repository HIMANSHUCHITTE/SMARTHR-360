const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
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

module.exports = mongoose.model('Post', postSchema);
