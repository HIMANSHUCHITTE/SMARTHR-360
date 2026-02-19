const express = require('express');
const { getRoles, createRole, deleteRole } = require('../controllers/roleController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireTenant);
router.use(authorizeRoles('Owner'));

router.route('/')
    .get(getRoles)
    .post(createRole);

router.route('/:id')
    .delete(deleteRole);

module.exports = router;
