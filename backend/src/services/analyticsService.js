const User = require('../models/User');
const Organization = require('../models/Organization');
const EmploymentState = require('../models/EmploymentState');

class AnalyticsService {
    async getSystemGrowth() {
        const today = new Date();
        const lastMonth = new Date(today.setMonth(today.getMonth() - 1));

        const newUsers = await User.countDocuments({ createdAt: { $gte: lastMonth } });
        const newOrgs = await Organization.countDocuments({ createdAt: { $gte: lastMonth } });

        return {
            period: 'Last 30 Days',
            newUsers,
            newOrgs,
            growthRate: '5%' // Mock calculation
        };
    }

    async getHiringMetrics(organizationId) {
        // Mock hiring metrics
        return {
            openPositions: 4,
            applicationsReceived: 120,
            interviewsScheduled: 15,
            offersAccepted: 2,
            timeToHire: '14 days'
        };
    }
}

module.exports = new AnalyticsService();
