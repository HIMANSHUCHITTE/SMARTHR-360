const express = require('express');
const {
    getPermissionCatalog,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
} = require('../controllers/roleController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireTenant);
router.use(authorizeRoles('Owner'));

router.get('/permission-catalog', getPermissionCatalog);

router.route('/')
    .get(getRoles)
    .post(createRole);

router.route('/:id')
    .patch(updateRole)
    .delete(deleteRole);

module.exports = router;
