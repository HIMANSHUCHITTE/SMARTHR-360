const Organization = require('../models/Organization');
const User = require('../models/User');
const EmploymentState = require('../models/EmploymentState');
const AuditLog = require('../models/AuditLog');
const JobPosting = require('../models/JobPosting');
const SupportTicket = require('../models/SupportTicket');
const Announcement = require('../models/Announcement');
const { sequelize, mongoose } = require('../config/db');

const PLAN_LIMITS = {
    FREE: { employeeLimit: 5, features: ['core_hrms'] },
    PRO: { employeeLimit: 50, features: ['core_hrms', 'payroll', 'recruitment', 'reputation'] },
    ENTERPRISE: { employeeLimit: 100000, features: ['core_hrms', 'payroll', 'recruitment', 'reputation', 'api_access'] },
};

const buildPlanSettings = (planId) => {
    const normalizedPlanId = String(planId || 'FREE').toUpperCase();
    return {
        planId: normalizedPlanId,
        ...(PLAN_LIMITS[normalizedPlanId] || PLAN_LIMITS.FREE),
    };
};

exports.getAllOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find()
            .populate('ownerId', 'email profile security.lastLogin')
            .sort('-createdAt')
            .lean();

        const orgIds = organizations.map((org) => org._id);
        const [employeeAgg, jobAgg] = await Promise.all([
            EmploymentState.aggregate([
                { $match: { organizationId: { $in: orgIds }, status: 'ACTIVE' } },
                { $group: { _id: '$organizationId', count: { $sum: 1 } } },
            ]),
            JobPosting.aggregate([
                { $match: { organizationId: { $in: orgIds } } },
                { $group: { _id: '$organizationId', count: { $sum: 1 } } },
            ]),
        ]);

        const employeeMap = new Map(employeeAgg.map((item) => [String(item._id), item.count]));
        const jobMap = new Map(jobAgg.map((item) => [String(item._id), item.count]));

        const items = organizations.map((org) => ({
            id: org._id,
            name: org.name,
            slug: org.slug,
            platformStatus: org.platformStatus,
            subscription: org.subscription,
            compliance: org.compliance,
            createdAt: org.createdAt,
            owner: org.ownerId ? {
                id: org.ownerId._id,
                email: org.ownerId.email,
                firstName: org.ownerId.profile?.firstName,
                lastName: org.ownerId.profile?.lastName,
                lastLogin: org.ownerId.security?.lastLogin || null,
            } : null,
            employeeCount: employeeMap.get(String(org._id)) || 0,
            activeJobs: jobMap.get(String(org._id)) || 0,
        }));

        res.json(items);
    } catch (error) {
        console.error('Admin getAllOrganizations error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateOrganizationStatus = async (req, res) => {
    const { platformStatus, note } = req.body;
    const allowed = ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'];

    if (!allowed.includes(platformStatus)) {
        return res.status(400).json({ message: 'Invalid platformStatus' });
    }

    try {
        const setPatch = { platformStatus };
        if (platformStatus === 'SUSPENDED') {
            setPatch['subscription.status'] = 'SUSPENDED';
        }
        if (platformStatus === 'APPROVED' && req.body.activateBilling !== false) {
            setPatch['subscription.status'] = 'ACTIVE';
        }
        setPatch['compliance.lastReviewAt'] = new Date();

        const organization = await Organization.findByIdAndUpdate(
            req.params.id,
            {
                $set: setPatch,
                $push: {
                    statusHistory: {
                        status: platformStatus,
                        changedAt: new Date(),
                        changedBy: req.user._id,
                        note: note || '',
                    },
                },
            },
            { new: true }
        );

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.json(organization);
    } catch (error) {
        console.error('Admin updateOrganizationStatus error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getSystemHealth = async (req, res) => {
    try {
        const mongoReady = mongoose.connection.readyState === 1;
        let postgresReady = false;
        try {
            await sequelize.authenticate();
            postgresReady = true;
        } catch (error) {
            postgresReady = false;
        }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const totalApiRequests = await AuditLog.countDocuments({ createdAt: { $gte: oneHourAgo } });
        const activeSessions = await User.countDocuments({ 'security.lastLogin': { $gte: oneHourAgo } });

        res.json({
            serverHealth: mongoReady && postgresReady ? 'HEALTHY' : 'DEGRADED',
            databaseStatus: {
                mongo: mongoReady ? 'UP' : 'DOWN',
                postgres: postgresReady ? 'UP' : 'DOWN',
            },
            totalApiRequests,
            activeSessions,
            errorRate: '0.20',
            checkedAt: new Date(),
        });
    } catch (error) {
        console.error('Admin getSystemHealth error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateOrganizationPlan = async (req, res) => {
    const { planId } = req.body;
    const settings = buildPlanSettings(planId);

    try {
        const organization = await Organization.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    'subscription.planId': settings.planId,
                    'subscription.employeeLimit': settings.employeeLimit,
                    'subscription.features': settings.features,
                    'subscription.status': 'ACTIVE',
                },
            },
            { new: true }
        );

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.json(organization);
    } catch (error) {
        console.error('Admin updateOrganizationPlan error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [totalUsers, totalOrgs, activeOrgs, totalEmployments, apiRequests, recentLogs, planBreakdown, complianceStats, ticketStats] = await Promise.all([
            User.countDocuments(),
            Organization.countDocuments(),
            Organization.countDocuments({ platformStatus: { $in: ['APPROVED', 'PENDING'] }, 'subscription.status': 'ACTIVE' }),
            EmploymentState.countDocuments({ status: 'ACTIVE' }),
            AuditLog.countDocuments({ createdAt: { $gte: oneDayAgo } }),
            AuditLog.find().sort('-createdAt').limit(8).select('action createdAt userId').populate('userId', 'email').lean(),
            Organization.aggregate([
                { $group: { _id: '$subscription.planId', count: { $sum: 1 } } },
            ]),
            Organization.aggregate([
                {
                    $group: {
                        _id: null,
                        kycVerified: { $sum: { $cond: ['$compliance.kycVerified', 1, 0] } },
                        emailVerified: { $sum: { $cond: ['$compliance.emailVerified', 1, 0] } },
                        suspicious: { $sum: '$compliance.suspiciousLoginAttempts' },
                        inactiveCompanies: { $sum: { $cond: [{ $eq: ['$platformStatus', 'SUSPENDED'] }, 1, 0] } },
                    },
                },
            ]),
            SupportTicket.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const recentGrowth = await Organization.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        const planStats = {
            free: 0,
            pro: 0,
            enterprise: 0,
        };

        planBreakdown.forEach((item) => {
            const key = String(item._id || 'FREE').toLowerCase();
            if (key === 'free') planStats.free = item.count;
            if (key === 'pro') planStats.pro = item.count;
            if (key === 'enterprise') planStats.enterprise = item.count;
        });

        const tickets = {
            open: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0,
        };
        ticketStats.forEach((item) => {
            if (item._id === 'OPEN') tickets.open = item.count;
            if (item._id === 'IN_PROGRESS') tickets.inProgress = item.count;
            if (item._id === 'RESOLVED') tickets.resolved = item.count;
            if (item._id === 'CLOSED') tickets.closed = item.count;
        });

        const compliance = complianceStats[0] || {
            kycVerified: 0,
            emailVerified: 0,
            suspicious: 0,
            inactiveCompanies: 0,
        };

        res.json({
            totalUsers,
            totalOrgs,
            activeOrgs,
            totalEmployments,
            activeSessions: totalEmployments,
            apiRequests,
            errorRate: '0.20',
            growthStats: { newOrganizationsLast30Days: recentGrowth },
            planStats,
            compliance,
            tickets,
            recentLogs: recentLogs.map((item, idx) => ({
                id: idx + 1,
                action: item.action,
                user: item.userId?.email || 'unknown',
                timestamp: item.createdAt,
            })),
        });
    } catch (error) {
        console.error('Admin getAnalytics error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAuditLogs = async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    try {
        const logs = await AuditLog.find()
            .sort('-createdAt')
            .limit(limit)
            .populate('userId', 'email profile')
            .populate('organizationId', 'name slug');
        res.json(logs);
    } catch (error) {
        console.error('Admin getAuditLogs error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket.find()
            .sort('-createdAt')
            .limit(100)
            .populate('organizationId', 'name')
            .populate('createdBy', 'email profile')
            .populate('assignedTo', 'email profile');
        res.json(tickets);
    } catch (error) {
        console.error('Admin getTickets error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateTicketStatus = async (req, res) => {
    const { status, resolutionNote } = req.body;
    const allowed = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

    if (!allowed.includes(status)) {
        return res.status(400).json({ message: 'Invalid ticket status' });
    }

    try {
        const ticket = await SupportTicket.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status,
                    resolutionNote: resolutionNote || '',
                    assignedTo: req.user._id,
                },
            },
            { new: true }
        );
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }
        res.json(ticket);
    } catch (error) {
        console.error('Admin updateTicketStatus error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .sort('-createdAt')
            .limit(50)
            .populate('createdBy', 'email profile');
        res.json(announcements);
    } catch (error) {
        console.error('Admin getAnnouncements error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.createAnnouncement = async (req, res) => {
    const { title, message, audience, severity, activeUntil } = req.body;

    if (!title || !message) {
        return res.status(400).json({ message: 'title and message are required' });
    }

    try {
        const announcement = await Announcement.create({
            title,
            message,
            audience: audience || 'ALL',
            severity: severity || 'INFO',
            activeUntil: activeUntil || null,
            createdBy: req.user._id,
        });

        res.status(201).json(announcement);
    } catch (error) {
        console.error('Admin createAnnouncement error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
