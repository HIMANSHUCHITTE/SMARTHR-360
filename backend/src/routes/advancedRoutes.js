const express = require('express');
const {
    chat,
    screenResume,
    getReputationScore,
    getPlatformAnalytics,
    getHiringAnalytics
} = require('../controllers/advancedController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');

const router = express.Router();

router.use(protect);

// AI Chat (All Authenticated Users)
router.post('/ai/chat', chat);

// AI Resume Screening (Owner/Recruiter only)
router.post('/ai/screen', requireTenant, authorizeRoles('Owner', 'Recruiter'), screenResume);

// Reputation Score (User)
router.get('/reputation', getReputationScore);

// Platform Analytics (SuperAdmin)
const requireSuperAdmin = (req, res, next) => {
    if (req.user && req.user.isSuperAdmin) next();
    else res.status(403).json({ message: 'Forbidden' });
};
router.get('/analytics/platform', requireSuperAdmin, getPlatformAnalytics);

// Hiring Analytics (Owner)
router.get('/analytics/hiring', requireTenant, authorizeRoles('Owner', 'Admin'), getHiringAnalytics);

module.exports = router;
