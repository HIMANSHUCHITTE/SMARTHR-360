const express = require('express');
const { getJobs, createJob, applyForJob, applyRegisteredUserToJob, getApplications } = require('../controllers/recruitmentController');
const { protect } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

const router = express.Router();

// Public Routes (Apply doesn't strictly need auth if public job board, but let's assume secure for now or handle mixed)
// For MVP, we'll make 'apply' public-ish but backend likely expects context. 
// Actually, 'apply' is usually public.

router.get('/jobs', getJobs); // Public listing endpoint
router.post('/jobs/:id/apply', applyForJob); // Public apply endpoint

// Protected Routes
router.use(protect);
router.use(requireTenant);

router.post('/jobs', authorizeRoles('Owner', 'Admin', 'HR Manager', 'CEO'), createJob);
router.post('/jobs/:id/apply-user', authorizeRoles('Owner', 'Admin', 'HR Manager', 'CEO'), applyRegisteredUserToJob);
router.get('/jobs/:id/applications', authorizeRoles('Owner'), getApplications);

module.exports = router;
