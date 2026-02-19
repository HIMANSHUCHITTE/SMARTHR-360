const express = require('express');
const { getJobs, createJob, applyForJob, getApplications } = require('../controllers/recruitmentController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

// Public Routes (Apply doesn't strictly need auth if public job board, but let's assume secure for now or handle mixed)
// For MVP, we'll make 'apply' public-ish but backend likely expects context. 
// Actually, 'apply' is usually public.

router.post('/jobs/:id/apply', applyForJob); // Public endpoint

// Protected Routes
router.use(protect);
router.use(requireTenant);

router.get('/jobs', getJobs); // List jobs for org
router.post('/jobs', authorizeRoles('Owner'), createJob);
router.get('/jobs/:id/applications', authorizeRoles('Owner'), getApplications);

module.exports = router;
