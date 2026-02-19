const Leave = require('../models/Leave');

// @desc    Apply for Leave
// @route   POST /api/leaves
// @access  Employee
exports.applyLeave = async (req, res) => {
    try {
        const { type, startDate, endDate, reason } = req.body;

        const leave = await Leave.create({
            organizationId: req.organizationId,
            userId: req.user._id,
            type,
            startDate,
            endDate,
            reason
        });

        res.status(201).json(leave);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get My Leaves
// @route   GET /api/leaves/me
// @access  Employee
exports.getMyLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({
            organizationId: req.organizationId,
            userId: req.user._id
        }).sort('-createdAt');
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Pending Leaves (Manager)
// @route   GET /api/leaves/pending
// @access  Manager, Admin, Owner
exports.getPendingLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({
            organizationId: req.organizationId,
            status: 'PENDING'
        }).populate('userId', 'email profile');
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Approve/Reject Leave
// @route   PATCH /api/leaves/:id/status
// @access  Manager, Admin, Owner
exports.updateLeaveStatus = async (req, res) => {
    const { status, rejectionReason } = req.body;
    try {
        const leave = await Leave.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.organizationId },
            {
                status,
                approvedBy: req.user._id,
                rejectionReason
            },
            { new: true }
        );

        if (!leave) return res.status(404).json({ message: 'Leave not found' });

        res.json(leave);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
