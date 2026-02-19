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

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await notificationService.deleteOne(id, req.user.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.clearNotifications = async (req, res) => {
    try {
        const deletedCount = await notificationService.clearAll(req.user.id);
        res.json({ success: true, deletedCount });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
