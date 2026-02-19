const express = require('express');
const {
    getProfile,
    updateProfile,
    getSettings,
    updateSettings,
    changePassword,
    getWorkHistory,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.get('/settings', getSettings);
router.patch('/settings', updateSettings);
router.post('/change-password', changePassword);
router.get('/work-history', getWorkHistory);

module.exports = router;
