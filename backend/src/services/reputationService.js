const User = require('../models/User');
const EmploymentState = require('../models/EmploymentState');

class ReputationService {
    async calculateScore(userId) {
        // Base Score
        let score = 500;

        // 1. Profile Completeness
        const user = await User.findById(userId);
        if (user.profile.bio) score += 20;
        if (user.profile.avatarUrl) score += 10;

        // 2. Employment History Duration
        const employmentHistory = await EmploymentState.find({ userId });
        const totalMonths = employmentHistory.reduce((acc, curr) => {
            if (curr.joinedAt) {
                const end = curr.terminatedAt || new Date();
                const months = (end.getFullYear() - curr.joinedAt.getFullYear()) * 12 + (end.getMonth() - curr.joinedAt.getMonth());
                return acc + months;
            }
            return acc;
        }, 0);

        score += Math.min(totalMonths * 2, 200); // Cap at 200 pts for experience

        // 3. Verified Skills (Mock)
        const verifiedSkillsCount = 5; // Hardcoded for now
        score += verifiedSkillsCount * 10;

        // Cap at 1000
        return Math.min(score, 1000);
    }

    async updateScore(userId) {
        const score = await this.calculateScore(userId);
        // Ideally store score history in a separate collection
        // User.reputationScore = score;
        // await user.save();
        return score;
        // We haven't added reputationScore to User model yet, assuming it's part of profile or metrics
    }
}

module.exports = new ReputationService();
