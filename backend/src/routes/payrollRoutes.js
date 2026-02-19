const express = require('express');
const { getPayrollRecords, runPayroll } = require('../controllers/payrollController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireTenant);

router.get('/', authorizeRoles('Owner'), getPayrollRecords);
router.post('/run', authorizeRoles('Owner'), runPayroll);

module.exports = router;
