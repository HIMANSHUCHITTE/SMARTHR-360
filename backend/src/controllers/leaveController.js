const Leave = require('../models/Leave');
const ApprovalRequest = require('../models/ApprovalRequest');

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

        await ApprovalRequest.create({
            organizationId: req.organizationId,
            requestType: 'LEAVE',
            title: `Leave Request: ${type}`,
            description: String(reason || '').trim(),
            sourceModel: 'Leave',
            sourceId: String(leave._id),
            requestedBy: req.user._id,
            requestedFor: req.user._id,
            status: 'PENDING',
            priority: 'MEDIUM',
            approvalChain: [{ order: 1, role: 'Owner', status: 'PENDING' }],
            meta: {
                leaveId: String(leave._id),
                startDate,
                endDate,
                leaveType: type,
            },
        });

        res.status(201).json(leave);
    } catch (error) {
        console.error('applyLeave error', error);
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
        if (!['APPROVED', 'REJECTED'].includes(String(status || '').toUpperCase())) {
            return res.status(400).json({ message: 'status must be APPROVED or REJECTED' });
        }

        const normalizedStatus = String(status).toUpperCase();
        const leave = await Leave.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.organizationId },
            {
                status: normalizedStatus,
                approvedBy: req.user._id,
                rejectionReason: normalizedStatus === 'REJECTED' ? String(rejectionReason || '') : '',
            },
            { new: true }
        );

        if (!leave) return res.status(404).json({ message: 'Leave not found' });

        await ApprovalRequest.findOneAndUpdate(
            {
                organizationId: req.organizationId,
                sourceModel: 'Leave',
                sourceId: String(leave._id),
                requestType: 'LEAVE',
            },
            {
                $set: {
                    status: normalizedStatus,
                    currentStep: 1,
                    finalDecision: {
                        decidedBy: req.user._id,
                        decidedAt: new Date(),
                        note: normalizedStatus === 'REJECTED' ? String(rejectionReason || '') : '',
                    },
                },
            },
        );

        res.json(leave);
    } catch (error) {
        console.error('updateLeaveStatus error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
