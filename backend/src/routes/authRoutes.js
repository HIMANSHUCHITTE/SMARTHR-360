const express = require('express');
const {
    registerStart,
    registerVerify,
    registerComplete,
    loginStart,
    loginVerify,
    refresh,
    logout,
    getOrganizations,
    switchOrganization,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register/start', registerStart);
router.post('/register/verify', registerVerify);
router.post('/register/complete', registerComplete);
router.post('/login/start', loginStart);
router.post('/login/verify', loginVerify);

router.post('/register', (req, res) => {
    res.status(410).json({ message: 'Legacy register endpoint disabled. Use /auth/register/start flow.' });
});
router.post('/login', (req, res) => {
    res.status(410).json({ message: 'Legacy login endpoint disabled. Use /auth/login/start flow.' });
});
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/organizations', protect, getOrganizations);
router.post('/switch-organization', protect, switchOrganization);

// Example protected route for testing
router.get('/me', protect, (req, res) => {
    res.json(req.user);
});

module.exports = router;
