const express = require('express');
const {
    getHiringDashboard,
    getOrganizationChart,
    getPerformanceHeatmap,
    generateContract,
    getEmployeeVault,
} = require('../controllers/ownerController');
const {
    getStrategicDashboard,
    getApprovalCenterRequests,
    createApprovalCenterRequest,
    decideApprovalCenterRequest,
    getCompanyControl,
    createBranch,
    updateBranch,
    getDepartments,
    createDepartment,
    updateDepartment,
    updateGlobalPolicies,
    getEnterpriseReports,
} = require('../controllers/ownerEnterpriseController');
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
router.get('/strategic-dashboard', getStrategicDashboard);
router.get('/approval-center', getApprovalCenterRequests);
router.post('/approval-center', createApprovalCenterRequest);
router.patch('/approval-center/:id/decision', decideApprovalCenterRequest);
router.get('/company-control', getCompanyControl);
router.post('/company-control/branches', createBranch);
router.patch('/company-control/branches/:id', updateBranch);
router.get('/company-control/departments', getDepartments);
router.post('/company-control/departments', createDepartment);
router.patch('/company-control/departments/:id', updateDepartment);
router.patch('/company-control/policies', updateGlobalPolicies);
router.get('/reports/enterprise', getEnterpriseReports);

module.exports = router;
