const { Op } = require('sequelize');
const Organization = require('../models/Organization');
const EmploymentState = require('../models/EmploymentState');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Application = require('../models/Application');
const JobPosting = require('../models/JobPosting');
const ApprovalRequest = require('../models/ApprovalRequest');
const Branch = require('../models/Branch');
const Department = require('../models/Department');
const PayrollRecord = require('../models/postgres/PayrollRecord');

const ACTIVE_EMPLOYMENT_STATUSES = ['ACTIVE', 'SUSPENDED', 'INVITED'];
const APPROVAL_TYPES = ['LEAVE', 'EXPENSE', 'PROMOTION', 'TERMINATION'];
const APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const parseMonthInput = (value) => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getMonthRange = (inputDate) => {
    const now = parseMonthInput(inputDate);
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
};

const safeNumber = (value) => {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
};

const deepMerge = (base, patch) => {
    const result = { ...(base || {}) };
    Object.keys(patch || {}).forEach((key) => {
        if (
            patch[key]
            && typeof patch[key] === 'object'
            && !Array.isArray(patch[key])
            && result[key]
            && typeof result[key] === 'object'
            && !Array.isArray(result[key])
        ) {
            result[key] = deepMerge(result[key], patch[key]);
        } else {
            result[key] = patch[key];
        }
    });
    return result;
};

const syncLinkedLeaveApproval = async (approvalRequest, actorId, action, note) => {
    if (approvalRequest.requestType !== 'LEAVE' || approvalRequest.sourceModel !== 'Leave' || !approvalRequest.sourceId) {
        return;
    }

    const leaveStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await Leave.findOneAndUpdate(
        { _id: approvalRequest.sourceId, organizationId: approvalRequest.organizationId },
        {
            $set: {
                status: leaveStatus,
                approvedBy: actorId,
                rejectionReason: action === 'REJECT' ? String(note || '') : '',
            },
        },
    );
};

exports.getStrategicDashboard = async (req, res) => {
    try {
        const organizationId = req.organizationId;
        const { start: monthStart, end: monthEnd } = getMonthRange(req.query.month);
        const previousMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
        const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

        const [
            totalEmployees,
            activeEmployees,
            terminatedEmployees,
            recentTerminations,
            pendingLeaveApprovals,
            pendingApprovalCenter,
            openJobs,
            hiringInProgress,
            attendanceAgg,
            departmentCountFromCollection,
            departmentDistinctFromEmployment,
        ] = await Promise.all([
            EmploymentState.countDocuments({ organizationId, status: { $in: ACTIVE_EMPLOYMENT_STATUSES } }),
            EmploymentState.countDocuments({ organizationId, status: 'ACTIVE' }),
            EmploymentState.countDocuments({ organizationId, status: 'TERMINATED' }),
            EmploymentState.countDocuments({
                organizationId,
                status: 'TERMINATED',
                terminatedAt: { $gte: previousMonthStart, $lt: monthEnd },
            }),
            Leave.countDocuments({ organizationId, status: 'PENDING' }),
            ApprovalRequest.countDocuments({ organizationId, status: 'PENDING' }),
            JobPosting.countDocuments({ organizationId, status: 'OPEN' }),
            Application.countDocuments({ organizationId, status: { $in: ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER'] } }),
            Attendance.aggregate([
                { $match: { organizationId, date: { $gte: thirtyDaysAgo } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Department.countDocuments({ organizationId, isActive: true }),
            EmploymentState.distinct('department', { organizationId, status: 'ACTIVE', department: { $nin: [null, ''] } }),
        ]);

        let monthlyPayrollCost = 0;
        let paidPayrollCost = 0;
        let pendingPayrollCost = 0;
        let pendingPayrollCount = 0;
        let pendingPayrollEmployees = [];
        try {
            monthlyPayrollCost = safeNumber(await PayrollRecord.sum('netPayable', {
                where: {
                    organizationId: String(organizationId),
                    periodStart: { [Op.gte]: monthStart },
                    periodEnd: { [Op.lt]: monthEnd },
                },
            }));

            paidPayrollCost = safeNumber(await PayrollRecord.sum('netPayable', {
                where: {
                    organizationId: String(organizationId),
                    periodStart: { [Op.gte]: monthStart },
                    periodEnd: { [Op.lt]: monthEnd },
                    status: 'PAID',
                },
            }));

            pendingPayrollCost = safeNumber(await PayrollRecord.sum('netPayable', {
                where: {
                    organizationId: String(organizationId),
                    periodStart: { [Op.gte]: monthStart },
                    periodEnd: { [Op.lt]: monthEnd },
                    status: { [Op.in]: ['DRAFT', 'PROCESSED'] },
                },
            }));

            pendingPayrollCount = await PayrollRecord.count({
                where: {
                    organizationId: String(organizationId),
                    periodStart: { [Op.gte]: monthStart },
                    periodEnd: { [Op.lt]: monthEnd },
                    status: { [Op.in]: ['DRAFT', 'PROCESSED'] },
                },
            });

            const pendingRows = await PayrollRecord.findAll({
                where: {
                    organizationId: String(organizationId),
                    periodStart: { [Op.gte]: monthStart },
                    periodEnd: { [Op.lt]: monthEnd },
                    status: { [Op.in]: ['DRAFT', 'PROCESSED'] },
                },
                order: [['netPayable', 'DESC']],
                limit: 10,
            });

            const employeeIds = pendingRows.map((row) => row.employeeId).filter(Boolean);
            if (employeeIds.length > 0) {
                const employments = await EmploymentState.find({
                    organizationId,
                    _id: { $in: employeeIds },
                })
                    .populate('userId', 'profile email')
                    .select('_id userId designation department')
                    .lean();

                const empMap = new Map(employments.map((emp) => [String(emp._id), emp]));
                pendingPayrollEmployees = pendingRows.map((row) => {
                    const emp = empMap.get(String(row.employeeId));
                    return {
                        payrollRecordId: row.id,
                        employeeId: row.employeeId,
                        employeeName: emp ? `${emp.userId?.profile?.firstName || ''} ${emp.userId?.profile?.surname || emp.userId?.profile?.lastName || ''}`.trim() : 'Unknown Employee',
                        employeeEmail: emp?.userId?.email || '',
                        designation: emp?.designation || '',
                        department: emp?.department || '',
                        netPayable: safeNumber(row.netPayable),
                        status: row.status,
                    };
                });
            }
        } catch (error) {
            monthlyPayrollCost = 0;
            paidPayrollCost = 0;
            pendingPayrollCost = 0;
            pendingPayrollCount = 0;
            pendingPayrollEmployees = [];
        }

        const attendanceSummary = {
            present: 0,
            absent: 0,
            halfDay: 0,
            late: 0,
        };
        attendanceAgg.forEach((item) => {
            if (item._id === 'PRESENT') attendanceSummary.present = item.count;
            if (item._id === 'ABSENT') attendanceSummary.absent = item.count;
            if (item._id === 'HALF_DAY') attendanceSummary.halfDay = item.count;
            if (item._id === 'LATE') attendanceSummary.late = item.count;
        });

        const avgHeadcount = Math.max(1, Math.round((totalEmployees + activeEmployees) / 2));
        const attritionRate = Number(((recentTerminations / avgHeadcount) * 100).toFixed(2));

        const totalAttendanceRecords = attendanceSummary.present + attendanceSummary.absent + attendanceSummary.halfDay + attendanceSummary.late;
        const attendancePresentRate = totalAttendanceRecords > 0
            ? Number((((attendanceSummary.present + attendanceSummary.halfDay) / totalAttendanceRecords) * 100).toFixed(2))
            : 0;

        res.json({
            period: { monthStart, monthEnd },
            totalEmployees,
            activeEmployees,
            inactiveEmployees: Math.max(0, totalEmployees - activeEmployees) + terminatedEmployees,
            departmentCount: departmentCountFromCollection || departmentDistinctFromEmployment.length,
            monthlyPayrollCost,
            payrollPaidAmount: paidPayrollCost,
            payrollPendingAmount: pendingPayrollCost,
            payrollPendingCount: pendingPayrollCount,
            payrollPendingEmployees: pendingPayrollEmployees,
            pendingApprovals: pendingLeaveApprovals + pendingApprovalCenter,
            hiringInProgress: openJobs + hiringInProgress,
            attritionRate,
            attendanceSummary,
            attendanceTotalRecords: totalAttendanceRecords,
            attendancePresentRate,
            activeVsInactive: {
                active: activeEmployees,
                inactive: Math.max(0, totalEmployees - activeEmployees),
            },
        });
    } catch (error) {
        console.error('Owner getStrategicDashboard error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getApprovalCenterRequests = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const status = String(req.query.status || '').toUpperCase();
        const requestType = String(req.query.requestType || '').toUpperCase();

        const query = { organizationId: req.organizationId };
        if (APPROVAL_STATUS.includes(status)) query.status = status;
        if (APPROVAL_TYPES.includes(requestType)) query.requestType = requestType;

        const rows = await ApprovalRequest.find(query)
            .sort('-createdAt')
            .limit(limit)
            .populate('requestedBy', 'email profile')
            .populate('requestedFor', 'email profile')
            .populate('finalDecision.decidedBy', 'email profile')
            .lean();

        res.json(rows);
    } catch (error) {
        console.error('Owner getApprovalCenterRequests error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.createApprovalCenterRequest = async (req, res) => {
    try {
        const requestType = String(req.body.requestType || '').toUpperCase();
        if (!APPROVAL_TYPES.includes(requestType)) {
            return res.status(400).json({ message: 'Invalid requestType' });
        }

        const title = String(req.body.title || '').trim();
        if (!title) {
            return res.status(400).json({ message: 'title is required' });
        }

        const approval = await ApprovalRequest.create({
            organizationId: req.organizationId,
            requestType,
            title,
            description: String(req.body.description || '').trim(),
            sourceModel: req.body.sourceModel || null,
            sourceId: req.body.sourceId || null,
            requestedBy: req.user._id,
            requestedFor: req.body.requestedFor || null,
            priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(req.body.priority || '').toUpperCase())
                ? String(req.body.priority).toUpperCase()
                : 'MEDIUM',
            status: 'PENDING',
            approvalChain: [
                { order: 1, role: 'Owner', status: 'PENDING' },
            ],
            meta: req.body.meta && typeof req.body.meta === 'object' ? req.body.meta : {},
        });

        res.status(201).json(approval);
    } catch (error) {
        console.error('Owner createApprovalCenterRequest error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.decideApprovalCenterRequest = async (req, res) => {
    try {
        const action = String(req.body.action || '').toUpperCase();
        if (!['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({ message: 'action must be APPROVE or REJECT' });
        }

        const approval = await ApprovalRequest.findOne({
            _id: req.params.id,
            organizationId: req.organizationId,
        });

        if (!approval) return res.status(404).json({ message: 'Approval request not found' });
        if (approval.status !== 'PENDING') {
            return res.status(400).json({ message: `Approval already ${approval.status.toLowerCase()}` });
        }

        const decisionStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        const chain = approval.approvalChain.length > 0
            ? approval.approvalChain
            : [{ order: 1, role: 'Owner', status: 'PENDING' }];
        approval.status = decisionStatus;
        approval.currentStep = chain.length;
        approval.finalDecision = {
            decidedBy: req.user._id,
            decidedAt: new Date(),
            note: String(req.body.note || '').trim(),
        };
        approval.approvalChain = chain.map((step, index) => ({
            order: step.order,
            role: step.role,
            status: index === chain.length - 1 ? decisionStatus : step.status,
            actedBy: index === chain.length - 1 ? req.user._id : step.actedBy,
            actedAt: index === chain.length - 1 ? new Date() : step.actedAt,
            note: index === chain.length - 1 ? String(req.body.note || '') : step.note,
        }));
        await approval.save();

        await syncLinkedLeaveApproval(approval, req.user._id, action, req.body.note);
        res.json(approval);
    } catch (error) {
        console.error('Owner decideApprovalCenterRequest error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getCompanyControl = async (req, res) => {
    try {
        const [organization, branches, departments, activeEmployees] = await Promise.all([
            Organization.findById(req.organizationId)
                .select('name slug organizationType settings subscription globalPolicies hierarchyConfig platformStatus compliance')
                .lean(),
            Branch.find({ organizationId: req.organizationId }).sort('name').lean(),
            Department.find({ organizationId: req.organizationId }).sort('name').lean(),
            EmploymentState.countDocuments({ organizationId: req.organizationId, status: 'ACTIVE' }),
        ]);

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.json({
            organization,
            branches,
            departments,
            billingReadiness: {
                planId: organization.subscription?.planId || 'FREE',
                status: organization.subscription?.status || 'ACTIVE',
                employeeLimit: organization.subscription?.employeeLimit || 0,
                activeEmployees,
                isOverLimit: activeEmployees > (organization.subscription?.employeeLimit || 0),
                enabledFeatures: organization.subscription?.features || [],
            },
        });
    } catch (error) {
        console.error('Owner getCompanyControl error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.createBranch = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ message: 'name is required' });
        }

        const branch = await Branch.create({
            organizationId: req.organizationId,
            name,
            code: req.body.code ? String(req.body.code).trim().toUpperCase() : undefined,
            location: req.body.location || {},
            timezone: req.body.timezone || 'Asia/Kolkata',
            currency: req.body.currency || 'INR',
            isHeadOffice: Boolean(req.body.isHeadOffice),
            isActive: req.body.isActive !== false,
        });
        res.status(201).json(branch);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Branch with same name/code already exists' });
        }
        console.error('Owner createBranch error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateBranch = async (req, res) => {
    try {
        const update = {};
        ['name', 'location', 'timezone', 'currency', 'isHeadOffice', 'isActive'].forEach((field) => {
            if (typeof req.body[field] !== 'undefined') {
                update[field] = req.body[field];
            }
        });
        if (typeof req.body.code !== 'undefined') {
            update.code = req.body.code ? String(req.body.code).trim().toUpperCase() : null;
        }

        const branch = await Branch.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.organizationId },
            { $set: update },
            { new: true, runValidators: true },
        );
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Branch with same name/code already exists' });
        }
        console.error('Owner updateBranch error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const rows = await Department.find({ organizationId: req.organizationId })
            .sort('name')
            .lean();
        res.json(rows);
    } catch (error) {
        console.error('Owner getDepartments error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.createDepartment = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ message: 'name is required' });
        }

        const department = await Department.create({
            organizationId: req.organizationId,
            branchId: req.body.branchId || null,
            name,
            code: req.body.code ? String(req.body.code).trim().toUpperCase() : undefined,
            parentDepartmentId: req.body.parentDepartmentId || null,
            headEmploymentId: req.body.headEmploymentId || null,
            isActive: req.body.isActive !== false,
        });
        res.status(201).json(department);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Department with same name/code already exists' });
        }
        console.error('Owner createDepartment error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateDepartment = async (req, res) => {
    try {
        const update = {};
        ['name', 'branchId', 'parentDepartmentId', 'headEmploymentId', 'isActive'].forEach((field) => {
            if (typeof req.body[field] !== 'undefined') {
                update[field] = req.body[field];
            }
        });
        if (typeof req.body.code !== 'undefined') {
            update.code = req.body.code ? String(req.body.code).trim().toUpperCase() : null;
        }

        const department = await Department.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.organizationId },
            { $set: update },
            { new: true, runValidators: true },
        );
        if (!department) return res.status(404).json({ message: 'Department not found' });
        res.json(department);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Department with same name/code already exists' });
        }
        console.error('Owner updateDepartment error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateGlobalPolicies = async (req, res) => {
    try {
        const policies = req.body.policies;
        if (!policies || typeof policies !== 'object') {
            return res.status(400).json({ message: 'policies object is required' });
        }

        const organization = await Organization.findById(req.organizationId);
        if (!organization) return res.status(404).json({ message: 'Organization not found' });

        organization.globalPolicies = deepMerge(organization.globalPolicies || {}, policies);
        await organization.save();
        res.json({
            organizationId: organization._id,
            globalPolicies: organization.globalPolicies,
        });
    } catch (error) {
        console.error('Owner updateGlobalPolicies error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getEnterpriseReports = async (req, res) => {
    try {
        const organizationId = req.organizationId;
        const now = new Date();
        const periods = Array.from({ length: 6 }).map((_, idx) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
            const start = new Date(d.getFullYear(), d.getMonth(), 1);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            return { key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`, start, end };
        });

        const [departmentDistribution, activeJobs, attritionAgg] = await Promise.all([
            EmploymentState.aggregate([
                { $match: { organizationId, status: 'ACTIVE' } },
                { $group: { _id: { $ifNull: ['$department', 'Unassigned'] }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            JobPosting.countDocuments({ organizationId, status: 'OPEN' }),
            EmploymentState.aggregate([
                { $match: { organizationId, status: 'TERMINATED', terminatedAt: { $ne: null } } },
                {
                    $project: {
                        month: { $dateToString: { format: '%Y-%m', date: '$terminatedAt' } },
                    },
                },
                { $group: { _id: '$month', count: { $sum: 1 } } },
            ]),
        ]);

        const attritionMap = new Map(attritionAgg.map((item) => [item._id, item.count]));
        const payrollTrend = [];
        for (const period of periods) {
            let payrollTotal = 0;
            try {
                payrollTotal = safeNumber(await PayrollRecord.sum('netPayable', {
                    where: {
                        organizationId: String(organizationId),
                        periodStart: { [Op.gte]: period.start },
                        periodEnd: { [Op.lt]: period.end },
                    },
                }));
            } catch (error) {
                payrollTotal = 0;
            }
            payrollTrend.push({
                month: period.key,
                payrollCost: payrollTotal,
                attrition: attritionMap.get(period.key) || 0,
            });
        }

        const applicationsByStatus = await Application.aggregate([
            { $match: { organizationId } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        res.json({
            payrollReport: payrollTrend,
            performanceReport: {
                activeHeadcount: departmentDistribution.reduce((sum, item) => sum + item.count, 0),
                departmentDistribution,
            },
            workforceDistribution: departmentDistribution,
            hiringAndAttrition: {
                openJobs: activeJobs,
                applicationsByStatus,
                monthlyTrend: payrollTrend.map((item) => ({
                    month: item.month,
                    attrition: item.attrition,
                })),
            },
        });
    } catch (error) {
        console.error('Owner getEnterpriseReports error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
