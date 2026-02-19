const aiService = require('../services/aiService');
const reputationService = require('../services/reputationService');
const analyticsService = require('../services/analyticsService');

// AI: Chatbot
exports.chat = async (req, res) => {
    try {
        const { message } = req.body;
        const response = await aiService.chat(message, {
            user: req.user,
            role: req.userRole || null,
            organizationId: req.organizationId || null,
        });
        res.json(response);
    } catch (error) {
        res.status(500).json({ message: 'AI Service Error' });
    }
};

// AI: Resume Screening (Owner/Recruiter)
exports.screenResume = async (req, res) => {
    try {
        const { resumeText, jobDescription } = req.body;
        const result = await aiService.screenResume(resumeText, jobDescription);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'AI Screening Error' });
    }
};

// Reputation: Get Score
exports.getReputationScore = async (req, res) => {
    try {
        const score = await reputationService.calculateScore(req.user.id);
        res.json({ score });
    } catch (error) {
        res.status(500).json({ message: 'Reputation Service Error' });
    }
};

// Analytics: Platform (SuperAdmin)
exports.getPlatformAnalytics = async (req, res) => {
    try {
        const data = await analyticsService.getSystemGrowth();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Analytics Error' });
    }
};

// Analytics: Hiring (Owner)
exports.getHiringAnalytics = async (req, res) => {
    try {
        const data = await analyticsService.getHiringMetrics(req.organizationId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Analytics Error' });
    }
};
