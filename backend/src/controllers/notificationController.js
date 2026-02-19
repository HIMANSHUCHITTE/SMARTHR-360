const notificationService = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await notificationService.getUserNotifications(req.user.id);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;
        await notificationService.markAsRead(id, req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
