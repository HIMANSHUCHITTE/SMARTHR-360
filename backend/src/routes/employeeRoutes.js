const express = require('express');
const {
    getEmployees,
    getEligibleUsers,
    addEmployee,
    updateEmployee,
    terminateEmployee,
    rateEmployeeResume,
    getEmployeeOverview,
    addEmployeeItem,
} = require('../controllers/employeeController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

// All routes require Auth + Tenant Context make sure to mount with this middleware in app.js or here
router.use(protect);
router.use(requireTenant);

// Any authenticated org member can list employees, but data is hierarchy-scoped in controller
router.get('/', getEmployees);
router.get('/eligible-users', authorizeRoles('Owner'), getEligibleUsers);
router.post('/', authorizeRoles('Owner'), addEmployee);
router.patch('/:id', authorizeRoles('Owner'), updateEmployee);
router.patch('/:id/terminate', authorizeRoles('Owner'), terminateEmployee);
router.post('/:id/ai-resume-rating', authorizeRoles('Owner'), rateEmployeeResume);
router.get('/:id/overview', authorizeRoles('Owner'), getEmployeeOverview);
router.post('/:id/items', authorizeRoles('Owner'), addEmployeeItem);

module.exports = router;
