const Attendance = require('../models/Attendance');

// @desc    Clock In
// @route   POST /api/attendance/clock-in
// @access  Employee
exports.clockIn = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existing = await Attendance.findOne({
            organizationId: req.organizationId,
            userId: req.user._id,
            date: today
        });

        if (existing) {
            return res.status(400).json({ message: 'Already clocked in for today' });
        }

        const attendance = await Attendance.create({
            organizationId: req.organizationId,
            userId: req.user._id,
            date: today,
            clockIn: new Date(),
            status: 'PRESENT', // Logic to determine LATE can go here
            ipAddress: req.ip
        });

        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Clock Out
// @route   POST /api/attendance/clock-out
// @access  Employee
exports.clockOut = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            organizationId: req.organizationId,
            userId: req.user._id,
            date: today
        });

        if (!attendance) {
            return res.status(404).json({ message: 'No clock-in record found for today' });
        }

        if (attendance.clockOut) {
            return res.status(400).json({ message: 'Already clocked out' });
        }

        attendance.clockOut = new Date();
        // Calculate duration in minutes
        const diffMs = attendance.clockOut - attendance.clockIn;
        attendance.duration = Math.round(((diffMs % 86400000) % 3600000) / 60000); // simplified
        // Better duration calc:
        attendance.duration = Math.round((attendance.clockOut.getTime() - attendance.clockIn.getTime()) / 60000);

        await attendance.save();

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get My Attendance
// @route   GET /api/attendance/me
// @access  Employee
exports.getMyAttendance = async (req, res) => {
    try {
        const logs = await Attendance.find({
            organizationId: req.organizationId,
            userId: req.user._id
        }).sort('-date').limit(30);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Team Attendance (Manager/Admin)
// @route   GET /api/attendance/team
// @access  Manager, Admin, Owner
exports.getTeamAttendance = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const logs = await Attendance.find({
            organizationId: req.organizationId,
            date: today
        }).populate('userId', 'email profile');

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
