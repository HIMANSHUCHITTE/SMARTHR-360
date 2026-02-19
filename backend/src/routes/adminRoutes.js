const express = require('express');
const {
    getAllOrganizations,
    updateOrganizationStatus,
    updateOrganizationPlan,
    getAnalytics,
    getAuditLogs,
    getTickets,
    updateTicketStatus,
    getAnnouncements,
    createAnnouncement,
    getSystemHealth,
} = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Middleware to ensure SuperAdmin
const requireSuperAdmin = (req, res, next) => {
    if (req.user && req.user.isSuperAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'SuperAdmin access required' });
    }
};

router.use(protect);
router.use(requireSuperAdmin);

router.get('/organizations', getAllOrganizations);
router.patch('/organizations/:id/status', updateOrganizationStatus);
router.patch('/organizations/:id/plan', updateOrganizationPlan);
router.get('/analytics', getAnalytics);
router.get('/system-health', getSystemHealth);
router.get('/audit-logs', getAuditLogs);
router.get('/tickets', getTickets);
router.patch('/tickets/:id', updateTicketStatus);
router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);

module.exports = router;
