const Document = require('../models/Document');

// @desc    Upload Document (Mock)
// @route   POST /api/documents
// @access  Owner, Admin, Employee (for Self)
exports.uploadDocument = async (req, res) => {
    try {
        const { title, type, userId, fileUrl } = req.body;

        // If not admin, ensure userId is self
        if (req.user.role === 'Employee' && userId !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const doc = await Document.create({
            organizationId: req.organizationId,
            userId: userId || req.user._id,
            title,
            type,
            fileUrl, // In real app, this comes from S3/Multer
            uploadedBy: req.user._id
        });

        res.status(201).json(doc);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get My Documents
// @route   GET /api/documents/me
// @access  Employee
exports.getMyDocuments = async (req, res) => {
    try {
        const docs = await Document.find({
            organizationId: req.organizationId,
            userId: req.user._id
        }).sort('-createdAt');
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Employee Documents (Manager)
// @route   GET /api/documents/user/:userId
// @access  Manager, Admin
exports.getUserDocuments = async (req, res) => {
    try {
        const docs = await Document.find({
            organizationId: req.organizationId,
            userId: req.params.userId
        }).sort('-createdAt');
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
