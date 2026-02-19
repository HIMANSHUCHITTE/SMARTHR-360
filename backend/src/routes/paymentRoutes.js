const express = require('express');
const { checkout, getHistory, getPricing } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireTenant);

router.get('/pricing', authorizeRoles('Owner'), getPricing);
router.get('/history', authorizeRoles('Owner'), getHistory);
router.post('/checkout', authorizeRoles('Owner'), checkout);

module.exports = router;
