const express = require('express');
const {
    getNotifications,
    markRead,
    deleteNotification,
    clearNotifications,
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);
router.delete('/', clearNotifications);

module.exports = router;
