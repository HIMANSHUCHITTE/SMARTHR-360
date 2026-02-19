const mongoose = require('mongoose');
const Post = require('../models/Post');
const Connection = require('../models/Connection');
const User = require('../models/User');

const authorProjection = 'email profile professional';

// @desc    Get Feed
// @route   GET /api/network/feed
// @access  Registered User
exports.getFeed = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('authorId', authorProjection)
            .populate('comments.userId', authorProjection)
            .sort('-createdAt')
            .limit(30);
        res.json(posts);
    } catch (error) {
        console.error('Network getFeed error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create Post
// @route   POST /api/network/posts
// @access  Registered User
exports.createPost = async (req, res) => {
    try {
        const content = String(req.body.content || '').trim();
        if (!content) {
            return res.status(400).json({ message: 'Post content is required' });
        }

        const post = await Post.create({
            authorId: req.user._id,
            content,
        });

        await post.populate('authorId', authorProjection);
        res.status(201).json(post);
    } catch (error) {
        console.error('Network createPost error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Toggle Like on Post
// @route   POST /api/network/posts/:postId/like
// @access  Registered User
exports.toggleLikePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const userId = String(req.user._id);
        const alreadyLiked = post.likes.some((id) => String(id) === userId);
        if (alreadyLiked) {
            post.likes = post.likes.filter((id) => String(id) !== userId);
        } else {
            post.likes.push(req.user._id);
        }
        await post.save();

        res.json({
            liked: !alreadyLiked,
            likesCount: post.likes.length,
        });
    } catch (error) {
        console.error('Network toggleLikePost error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add Comment on Post
// @route   POST /api/network/posts/:postId/comment
// @access  Registered User
exports.addComment = async (req, res) => {
    try {
        const text = String(req.body.text || '').trim();
        if (!text) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.comments.push({
            userId: req.user._id,
            text,
            createdAt: new Date(),
        });
        await post.save();
        await post.populate('comments.userId', authorProjection);

        const latest = post.comments[post.comments.length - 1];
        res.status(201).json(latest);
    } catch (error) {
        console.error('Network addComment error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Network Suggestions
// @route   GET /api/network/suggestions
// @access  Registered User
exports.getSuggestions = async (req, res) => {
    try {
        const myId = String(req.user._id);

        const existing = await Connection.find({
            $or: [{ requesterId: req.user._id }, { recipientId: req.user._id }],
        }).select('requesterId recipientId');

        const excludedIds = new Set([myId]);
        existing.forEach((item) => {
            excludedIds.add(String(item.requesterId));
            excludedIds.add(String(item.recipientId));
        });

        const users = await User.find({ _id: { $nin: Array.from(excludedIds).map((id) => new mongoose.Types.ObjectId(id)) } })
            .select('email profile professional')
            .limit(12);

        res.json(users);
    } catch (error) {
        console.error('Network getSuggestions error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Advanced search users
// @route   GET /api/network/search?q=
// @access  Registered User
exports.searchPeople = async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (!q) return res.json([]);

        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const users = await User.find({
            $or: [
                { 'profile.firstName': regex },
                { 'profile.surname': regex },
                { 'professional.headline': regex },
                { email: regex },
            ],
            _id: { $ne: req.user._id },
        }).select('email profile professional').limit(20);

        res.json(users);
    } catch (error) {
        console.error('Network searchPeople error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    List current connections
// @route   GET /api/network/connections
// @access  Registered User
exports.getConnections = async (req, res) => {
    try {
        const rows = await Connection.find({
            $or: [{ requesterId: req.user._id }, { recipientId: req.user._id }],
            status: 'ACCEPTED',
        })
            .populate('requesterId', authorProjection)
            .populate('recipientId', authorProjection)
            .sort('-updatedAt')
            .limit(100);

        const connections = rows.map((row) => {
            const other = String(row.requesterId._id) === String(req.user._id) ? row.recipientId : row.requesterId;
            return other;
        });

        res.json(connections);
    } catch (error) {
        console.error('Network getConnections error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Send/Accept connection request
// @route   POST /api/network/connect/:userId
// @access  Registered User
exports.sendConnectionRequest = async (req, res) => {
    try {
        const targetId = req.params.userId;
        if (String(targetId) === String(req.user._id)) {
            return res.status(400).json({ message: 'Cannot connect to yourself' });
        }

        const forward = await Connection.findOne({
            requesterId: req.user._id,
            recipientId: targetId,
        });
        if (forward) {
            return res.status(400).json({ message: 'Request already sent' });
        }

        const reverse = await Connection.findOne({
            requesterId: targetId,
            recipientId: req.user._id,
        });

        if (reverse && reverse.status === 'PENDING') {
            reverse.status = 'ACCEPTED';
            await reverse.save();
            return res.json({ message: 'Connection accepted' });
        }

        await Connection.create({
            requesterId: req.user._id,
            recipientId: targetId,
            status: 'PENDING',
        });

        res.json({ message: 'Request sent' });
    } catch (error) {
        console.error('Network sendConnectionRequest error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
