const express = require('express');
const { uploadDocument, getMyDocuments, getUserDocuments } = require('../controllers/documentController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireTenant);

router.post('/', uploadDocument);
router.get('/me', getMyDocuments);
router.get('/user/:userId', authorizeRoles('Owner'), getUserDocuments);

module.exports = router;
