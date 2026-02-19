const express = require('express');
const { applyLeave, getMyLeaves, getPendingLeaves, updateLeaveStatus } = require('../controllers/leaveController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireTenant);

router.post('/', applyLeave);
router.get('/me', getMyLeaves);

// Manager/Admin routes
router.get('/pending', authorizeRoles('Owner'), getPendingLeaves);
router.patch('/:id/status', authorizeRoles('Owner'), updateLeaveStatus);

module.exports = router;
