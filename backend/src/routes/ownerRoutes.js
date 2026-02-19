const express = require('express');
const {
    getHiringDashboard,
    getOrganizationChart,
    getPerformanceHeatmap,
    generateContract,
    getEmployeeVault,
} = require('../controllers/ownerController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireTenant);
router.use(authorizeRoles('Owner'));

router.get('/hiring-dashboard', getHiringDashboard);
router.get('/org-chart', getOrganizationChart);
router.get('/performance-heatmap', getPerformanceHeatmap);
router.post('/contracts/generate', generateContract);
router.get('/vault/:userId', getEmployeeVault);

module.exports = router;
