const Notification = require('../models/Notification');

class NotificationService {
    async send(userId, { title, message, type = 'INFO', organizationId, actionLink }) {
        try {
            const notification = await Notification.create({
                userId,
                organizationId,
                title,
                message,
                type,
                actionLink,
            });
            console.log(`[Notification] Sent to ${userId}: ${title}`);
            return notification;
        } catch (error) {
            console.error('Notification Error:', error);
        }
    }

    async markAsRead(notificationId, userId) {
        return Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
        );
    }

    async getUserNotifications(userId) {
        return Notification.find({ userId }).sort('-createdAt').limit(20);
    }
}

module.exports = new NotificationService();
