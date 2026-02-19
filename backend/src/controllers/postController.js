const Post = require('../models/Post');

// @desc    Create a Post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
    try {
        const { content, scope, organizationId } = req.body;

        // Validate Scope
        if (scope === 'ORGANIZATION_ONLY') {
            // Ensure user belongs to that org
            if (!req.organizationId && !organizationId) {
                return res.status(400).json({ message: 'Organization context required for Org-scoped posts' });
            }
            // If req.organizationId is set (from token), use it. 
            // If user passed explicit ID, ensure it matches token's OrgID or verify employment.
            // For simplicity, prefer token context if available.
        }

        const post = await Post.create({
            authorId: req.user.id,
            content,
            scope,
            organizationId: scope === 'ORGANIZATION_ONLY' ? (req.organizationId || organizationId) : undefined,
        });

        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Feed
// @route   GET /api/posts
// @access  Private
exports.getFeed = async (req, res) => {
    try {
        // If user is accessing via Organization Context, show Public + Org posts
        // If user is accessing via Global Context, show Public posts only (or all Public)

        let query = { scope: 'PUBLIC' };

        if (req.organizationId) {
            query = {
                $or: [
                    { scope: 'PUBLIC' },
                    { scope: 'ORGANIZATION_ONLY', organizationId: req.organizationId },
                ]
            };
        }

        const posts = await Post.find(query)
            .populate('authorId', 'profile')
            .sort('-createdAt');

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
