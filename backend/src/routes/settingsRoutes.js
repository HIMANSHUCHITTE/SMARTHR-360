const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public read? Or authenticated? 
// Let's make it public for maintenance mode checks, but simplified here.
router.get('/', getSettings);

// Update requires SuperAdmin
const requireSuperAdmin = (req, res, next) => {
    if (req.user && req.user.isSuperAdmin) next();
    else res.status(403).json({ message: 'Forbidden' });
};

router.patch('/', protect, requireSuperAdmin, updateSettings);

module.exports = router;
