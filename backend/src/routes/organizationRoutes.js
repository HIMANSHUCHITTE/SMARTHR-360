const express = require('express');
const {
    getOrganization,
    updateOrganization,
    updateOrganizationSubscription,
} = require('../controllers/organizationController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

// All routes require login and tenant context
router.use(protect);
router.use(requireTenant);

router.get('/', getOrganization);
router.patch('/', authorizeRoles('Owner', 'Admin'), updateOrganization);
router.patch('/subscription', authorizeRoles('Owner', 'Admin'), updateOrganizationSubscription);

module.exports = router;
