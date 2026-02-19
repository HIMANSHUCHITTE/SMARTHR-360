const express = require('express');
const { clockIn, clockOut, getMyAttendance, getTeamAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireTenant);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/me', getMyAttendance);

// Manager/Admin routes
router.get('/team', authorizeRoles('Owner'), getTeamAttendance);

module.exports = router;
