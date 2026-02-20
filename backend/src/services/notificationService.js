const Notification = require('../models/Notification');

const inferCategory = ({ category, title, message, actionLink }) => {
    const explicit = String(category || '').trim().toUpperCase();
    const allowed = ['GENERAL', 'SYSTEM', 'APPROVAL', 'NETWORK', 'SECURITY', 'HR', 'PAYMENT', 'MG'];
    if (allowed.includes(explicit)) return explicit;

    const text = `${title || ''} ${message || ''} ${actionLink || ''}`.toLowerCase();
    if (text.includes('approval') || text.includes('approved') || text.includes('rejected')) return 'APPROVAL';
    if (text.includes('/network') || text.includes('connection') || text.includes('follower') || text.includes('post')) return 'NETWORK';
    if (text.includes('login') || text.includes('security') || text.includes('otp')) return 'SECURITY';
    if (text.includes('pay') || text.includes('billing') || text.includes('subscription')) return 'PAYMENT';
    if (text.includes('leave') || text.includes('attendance') || text.includes('employee')) return 'HR';
    if (text.includes('admin') || text.includes('superadmin') || text.includes('announcement')) return 'MG';
    return 'SYSTEM';
};

const inferSource = ({ source, category }) => {
    const explicit = String(source || '').trim();
    if (explicit) return explicit.slice(0, 32);
    if (category === 'MG') return 'MG';
    if (category === 'APPROVAL') return 'APPROVAL';
    if (category === 'NETWORK') return 'NETWORK';
    if (category === 'SECURITY') return 'SECURITY';
    if (category === 'PAYMENT') return 'PAYMENT';
    if (category === 'HR') return 'HRMS';
    return 'SYSTEM';
};

class NotificationService {
    async send(userId, payload = {}) {
        try {
            const category = inferCategory(payload);
            const source = inferSource({ source: payload.source, category });
            const notification = await Notification.create({
                userId,
                organizationId: payload.organizationId,
                title: payload.title,
                message: payload.message,
                type: payload.type || 'INFO',
                actionLink: payload.actionLink,
                category,
                source,
            });
            console.log(`[Notification] Sent to ${userId}: ${payload.title || 'Update'} [${category}]`);
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
        return Notification.find({ userId }).sort('-createdAt').limit(20).lean();
    }

    async deleteOne(notificationId, userId) {
        return Notification.findOneAndDelete({ _id: notificationId, userId });
    }

    async clearAll(userId) {
        const result = await Notification.deleteMany({ userId });
        return result.deletedCount || 0;
    }
}

module.exports = new NotificationService();
