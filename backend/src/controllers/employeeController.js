const User = require('../models/User');
const EmploymentState = require('../models/EmploymentState');
const Role = require('../models/Role');
const WorkHistory = require('../models/WorkHistory');
const aiService = require('../services/aiService');
const EmployeeAsset = require('../models/EmployeeAsset');
const Attendance = require('../models/Attendance');
const PayrollRecord = require('../models/postgres/PayrollRecord');
const { Op } = require('sequelize');

const VIEWABLE_STATUSES = ['ACTIVE', 'SUSPENDED', 'INVITED'];
const RESTRICTED_ASSIGNMENT_ROLES = new Set(['owner', 'admin', 'superadmin']);
const FALLBACK_ROLE_LEVELS = {
    owner: 1,
    ceo: 2,
    chairman: 2,
    principal: 3,
    admin: 3,
    manager: 4,
    'team lead': 5,
    employee: 6,
    intern: 7,
};

const normalizeId = (value) => (value ? String(value) : null);
const normalizeRole = (value) => String(value || '').trim().toLowerCase();
const normalizeLevel = (roleLike) => {
    const n = Number(roleLike?.level);
    if (Number.isFinite(n)) return n;
    const key = normalizeRole(roleLike?.name);
    return FALLBACK_ROLE_LEVELS[key] || 100;
};

const buildDescendantSet = (allRows, rootEmploymentId) => {
    const childrenMap = new Map();

    allRows.forEach((row) => {
        const parentId = normalizeId(row.reportsToEmploymentId);
        if (!parentId) return;

        if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId).push(normalizeId(row._id));
    });

    const visited = new Set();
    const queue = [...(childrenMap.get(normalizeId(rootEmploymentId)) || [])];

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);

        const children = childrenMap.get(currentId) || [];
        children.forEach((childId) => {
            if (!visited.has(childId)) queue.push(childId);
        });
    }

    return visited;
};

const getViewerEmployment = (userId, organizationId) => EmploymentState.findOne({
    userId,
    organizationId,
    status: { $in: VIEWABLE_STATUSES },
}).select('_id').lean();

const canViewerManageTarget = (req, viewerEmployment, descendantSet, targetEmploymentId) => {
    if (req.userRole === 'Owner') return true;
    if (!viewerEmployment) return false;

    return descendantSet.has(normalizeId(targetEmploymentId));
};

// @desc    List all employees in the organization
// @route   GET /api/organization/employees
// @access  Any authenticated organization member (visibility scoped by hierarchy)
exports.getEmployees = async (req, res) => {
    try {
        if (req.userRole === 'Owner') {
            const employees = await EmploymentState.find({
                organizationId: req.organizationId,
                status: { $in: VIEWABLE_STATUSES },
            })
                .populate('userId', 'email profile')
                .populate('roleId', 'name')
                .sort('-joinedAt')
                .lean();
            return res.json(employees);
        }

        const viewerEmployment = await getViewerEmployment(req.user._id, req.organizationId);
        if (!viewerEmployment) {
            return res.status(403).json({ message: 'Active employment not found for this organization' });
        }

        const allOrgRows = await EmploymentState.find({
            organizationId: req.organizationId,
            status: { $in: VIEWABLE_STATUSES },
        }).select('_id reportsToEmploymentId').lean();

        const descendantSet = buildDescendantSet(allOrgRows, viewerEmployment._id);
        if (descendantSet.size === 0) {
            return res.json([]);
        }

        const visibleEmployees = await EmploymentState.find({
            _id: { $in: Array.from(descendantSet) },
            organizationId: req.organizationId,
            status: { $in: VIEWABLE_STATUSES },
        })
            .populate('userId', 'email profile')
            .populate('roleId', 'name')
            .sort('-joinedAt')
            .lean();

        return res.json(visibleEmployees);
    } catch (error) {
        console.error('Get employees error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Search eligible registered users to hire into organization
// @route   GET /api/organization/employees/eligible-users?q=
// @access  Owner
exports.getEligibleUsers = async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const regex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

        const existingEmployments = await EmploymentState.find({
            organizationId: req.organizationId,
        }).select('userId').lean();
        const excludedUserIds = existingEmployments.map((item) => item.userId);

        const query = {
            isSuperAdmin: false,
            _id: { $nin: excludedUserIds },
        };
        if (regex) {
            query.$or = [
                { email: regex },
                { 'profile.firstName': regex },
                { 'profile.surname': regex },
                { 'profile.lastName': regex },
            ];
        }

        const users = await User.find(query)
            .select('email profile professional employment')
            .sort('-updatedAt')
            .limit(20)
            .lean();

        res.json(users);
    } catch (error) {
        console.error('getEligibleUsers error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Hire existing registered user into current organization
// @route   POST /api/organization/employees
// @access  Owner, Admin
exports.addEmployee = async (req, res) => {
    const { userId, roleName, designation, department, reportsToEmploymentId } = req.body;

    try {
        const viewerEmployment = await getViewerEmployment(req.user._id, req.organizationId);
        if (req.userRole !== 'Owner' && !viewerEmployment) {
            return res.status(403).json({ message: 'Active employment not found for this organization' });
        }

        const allOrgRows = await EmploymentState.find({
            organizationId: req.organizationId,
            status: { $in: VIEWABLE_STATUSES },
        }).select('_id reportsToEmploymentId').lean();

        const viewerDescendantSet = viewerEmployment
            ? buildDescendantSet(allOrgRows, viewerEmployment._id)
            : new Set();

        // 1. Resolve Role
        let role = await Role.findOne({ organizationId: req.organizationId, name: roleName });
        if (!role) {
            // Fallback for system roles if not in DB yet (should be seeded, but for safety)
            // Or return error
            return res.status(400).json({ message: `Role '${roleName}' not found in this organization.` });
        }

        if (RESTRICTED_ASSIGNMENT_ROLES.has(normalizeRole(role.name))) {
            return res.status(403).json({ message: `Role '${role.name}' cannot be assigned through employee onboarding` });
        }

        if (Number.isFinite(Number(role?.limits?.maxUsersPerRole)) && Number(role.limits.maxUsersPerRole) > 0) {
            const currentRoleCount = await EmploymentState.countDocuments({
                organizationId: req.organizationId,
                roleId: role._id,
                status: { $in: VIEWABLE_STATUSES },
            });
            if (currentRoleCount >= Number(role.limits.maxUsersPerRole)) {
                return res.status(400).json({ message: `Role '${role.name}' reached max users limit (${role.limits.maxUsersPerRole})` });
            }
        }

        // 2. Must hire only existing registered user
        if (!userId) {
            return res.status(400).json({ message: 'userId is required. Hire only registered users.' });
        }
        const user = await User.findOne({ _id: userId, isSuperAdmin: false }).select('_id email');
        if (!user) return res.status(404).json({ message: 'Registered user not found' });

        // 3. Check if already employed in this Org
        const existingEmployment = await EmploymentState.findOne({ userId: user._id, organizationId: req.organizationId });
        if (existingEmployment) {
            return res.status(400).json({ message: 'User is already an employee here.' });
        }

        // 4. Create Employment State
        let managerEmploymentId = reportsToEmploymentId || null;
        if (managerEmploymentId) {
            const managerRow = await EmploymentState.findOne({
                _id: managerEmploymentId,
                organizationId: req.organizationId,
                status: { $in: VIEWABLE_STATUSES },
            }).populate('roleId', 'level').lean();
            if (!managerRow) {
                return res.status(400).json({ message: 'Invalid reporting manager for this organization.' });
            }

            const managerLevel = normalizeLevel(managerRow.roleId);
            const targetLevel = normalizeLevel(role);
            if (managerLevel >= targetLevel) {
                return res.status(400).json({ message: 'Employee cannot report to same or lower level role' });
            }

            const managerRole = await Role.findById(managerRow.roleId?._id).select('name limits.maxDirectReports').lean();
            if (Number.isFinite(Number(managerRole?.limits?.maxDirectReports)) && Number(managerRole.limits.maxDirectReports) > 0) {
                const directReports = await EmploymentState.countDocuments({
                    organizationId: req.organizationId,
                    reportsToEmploymentId: managerRow._id,
                    status: { $in: VIEWABLE_STATUSES },
                });
                if (directReports >= Number(managerRole.limits.maxDirectReports)) {
                    return res.status(400).json({ message: `Manager '${managerRole.name}' reached max direct reports limit (${managerRole.limits.maxDirectReports})` });
                }
            }
        }

        if (req.userRole !== 'Owner') {
            if (!managerEmploymentId) {
                managerEmploymentId = viewerEmployment._id;
            }

            const managerId = normalizeId(managerEmploymentId);
            const canAssignManager = managerId === normalizeId(viewerEmployment._id) || viewerDescendantSet.has(managerId);

            if (!canAssignManager) {
                return res.status(403).json({ message: 'You can assign reporting only inside your downline hierarchy' });
            }
        }

        const employment = await EmploymentState.create({
            userId: user._id,
            organizationId: req.organizationId,
            roleId: role._id,
            reportsToEmploymentId: managerEmploymentId,
            status: 'ACTIVE', // Or 'INVITED'
            designation,
            department,
            joinedAt: new Date(),
        });

        await User.findByIdAndUpdate(user._id, {
            $set: {
                'employment.status': 'ACTIVE',
                'employment.currentOrganizationId': req.organizationId,
            },
        });

        res.status(201).json({
            message: 'Employee added successfully',
            employment,
            user: { id: user._id, email: user.email },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update Employee Role/Details
// @route   PATCH /api/organization/employees/:id
// @access  Owner, Admin
exports.updateEmployee = async (req, res) => {
    const { roleName, designation, department, status, reportsToEmploymentId } = req.body;

    try {
        const viewerEmployment = await getViewerEmployment(req.user._id, req.organizationId);
        if (req.userRole !== 'Owner' && !viewerEmployment) {
            return res.status(403).json({ message: 'Active employment not found for this organization' });
        }

        const allOrgRows = await EmploymentState.find({
            organizationId: req.organizationId,
            status: { $in: VIEWABLE_STATUSES },
        }).select('_id reportsToEmploymentId').lean();

        const viewerDescendantSet = viewerEmployment
            ? buildDescendantSet(allOrgRows, viewerEmployment._id)
            : new Set();

        if (!canViewerManageTarget(req, viewerEmployment, viewerDescendantSet, req.params.id)) {
            return res.status(403).json({ message: 'You can only update employees in your downline hierarchy' });
        }

        const updateFields = { designation, department, status };

        const targetEmployment = await EmploymentState.findOne({
            _id: req.params.id,
            organizationId: req.organizationId,
        }).populate('roleId', 'level').lean();
        if (!targetEmployment) return res.status(404).json({ message: 'Employee not found' });

        let nextRoleLevel = normalizeLevel(targetEmployment.roleId);

        if (roleName) {
            const role = await Role.findOne({ organizationId: req.organizationId, name: roleName });
            if (role) {
                if (RESTRICTED_ASSIGNMENT_ROLES.has(normalizeRole(role.name))) {
                    return res.status(403).json({ message: `Role '${role.name}' cannot be assigned through employee management` });
                }
                updateFields.roleId = role._id;
                nextRoleLevel = normalizeLevel(role);

                if (Number.isFinite(Number(role?.limits?.maxUsersPerRole)) && Number(role.limits.maxUsersPerRole) > 0) {
                    const currentRoleCount = await EmploymentState.countDocuments({
                        organizationId: req.organizationId,
                        roleId: role._id,
                        status: { $in: VIEWABLE_STATUSES },
                    });
                    const sameRoleBefore = normalizeId(targetEmployment.roleId?._id || targetEmployment.roleId) === normalizeId(role._id);
                    const effectiveCount = sameRoleBefore ? currentRoleCount : currentRoleCount + 1;
                    if (effectiveCount > Number(role.limits.maxUsersPerRole)) {
                        return res.status(400).json({ message: `Role '${role.name}' reached max users limit (${role.limits.maxUsersPerRole})` });
                    }
                }
            }
        }

        if (typeof reportsToEmploymentId !== 'undefined') {
            if (reportsToEmploymentId === null || reportsToEmploymentId === '') {
                updateFields.reportsToEmploymentId = null;
            } else {
                if (normalizeId(reportsToEmploymentId) === normalizeId(req.params.id)) {
                    return res.status(400).json({ message: 'Employee cannot report to themselves' });
                }

                const managerEmployment = await EmploymentState.findOne({
                    _id: reportsToEmploymentId,
                    organizationId: req.organizationId,
                    status: { $in: VIEWABLE_STATUSES },
                }).populate('roleId', 'level').lean();

                if (!managerEmployment) {
                    return res.status(400).json({ message: 'Invalid reporting manager for this organization.' });
                }

                const managerLevel = normalizeLevel(managerEmployment.roleId);
                if (managerLevel >= nextRoleLevel) {
                    return res.status(400).json({ message: 'Employee cannot report to same or lower level role' });
                }

                const managerRole = await Role.findById(managerEmployment.roleId?._id).select('name limits.maxDirectReports').lean();
                if (Number.isFinite(Number(managerRole?.limits?.maxDirectReports)) && Number(managerRole.limits.maxDirectReports) > 0) {
                    const directReports = await EmploymentState.countDocuments({
                        organizationId: req.organizationId,
                        reportsToEmploymentId: managerEmployment._id,
                        status: { $in: VIEWABLE_STATUSES },
                    });
                    const isSameManager = normalizeId(targetEmployment.reportsToEmploymentId) === normalizeId(managerEmployment._id);
                    const effectiveDirectReports = isSameManager ? directReports : directReports + 1;
                    if (effectiveDirectReports > Number(managerRole.limits.maxDirectReports)) {
                        return res.status(400).json({ message: `Manager '${managerRole.name}' reached max direct reports limit (${managerRole.limits.maxDirectReports})` });
                    }
                }

                if (req.userRole !== 'Owner') {
                    const managerId = normalizeId(reportsToEmploymentId);
                    const canAssignManager = managerId === normalizeId(viewerEmployment._id) || viewerDescendantSet.has(managerId);
                    if (!canAssignManager) {
                        return res.status(403).json({ message: 'You can assign reporting only inside your downline hierarchy' });
                    }
                }

                const targetDescendants = buildDescendantSet(allOrgRows, req.params.id);
                if (targetDescendants.has(normalizeId(reportsToEmploymentId))) {
                    return res.status(400).json({ message: 'Circular reporting is not allowed' });
                }

                updateFields.reportsToEmploymentId = reportsToEmploymentId;
            }
        }

        const employment = await EmploymentState.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.organizationId }, // Ensure isolation
            updateFields,
            { new: true }
        );

        if (!employment) return res.status(404).json({ message: 'Employee not found' });

        res.json(employment);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Terminate employee from organization
// @route   PATCH /api/organization/employees/:id/terminate
// @access  Owner, Admin
exports.terminateEmployee = async (req, res) => {
    try {
        const viewerEmployment = await getViewerEmployment(req.user._id, req.organizationId);
        if (req.userRole !== 'Owner' && !viewerEmployment) {
            return res.status(403).json({ message: 'Active employment not found for this organization' });
        }

        const allOrgRows = await EmploymentState.find({
            organizationId: req.organizationId,
            status: { $in: VIEWABLE_STATUSES },
        }).select('_id reportsToEmploymentId').lean();

        const viewerDescendantSet = viewerEmployment
            ? buildDescendantSet(allOrgRows, viewerEmployment._id)
            : new Set();

        if (!canViewerManageTarget(req, viewerEmployment, viewerDescendantSet, req.params.id)) {
            return res.status(403).json({ message: 'You can only terminate employees in your downline hierarchy' });
        }

        const employment = await EmploymentState.findOneAndUpdate(
            {
                _id: req.params.id,
                organizationId: req.organizationId,
            },
            {
                $set: {
                    status: 'TERMINATED',
                    terminatedAt: new Date(),
                },
            },
            { new: true }
        );

        if (!employment) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const stillActiveElsewhere = await EmploymentState.exists({
            userId: employment.userId,
            status: 'ACTIVE',
            _id: { $ne: employment._id },
        });

        if (!stillActiveElsewhere) {
            await User.findByIdAndUpdate(employment.userId, {
                $set: {
                    'employment.status': 'INACTIVE',
                    'employment.currentOrganizationId': null,
                },
            });
        }

        await WorkHistory.updateOne(
            { sourceEmploymentId: employment._id },
            {
                $setOnInsert: {
                    userId: employment.userId,
                    organizationId: employment.organizationId,
                    sourceEmploymentId: employment._id,
                },
                $set: {
                    designation: employment.designation || '',
                    department: employment.department || '',
                    joinedAt: employment.joinedAt || null,
                    leftAt: employment.terminatedAt || new Date(),
                    verified: true,
                },
            },
            { upsert: true }
        );

        res.json({
            message: 'Employee terminated from organization',
            employment,
        });
    } catch (error) {
        console.error('Terminate employee error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    AI resume rating for an employee inside current org
// @route   POST /api/organization/employees/:id/ai-resume-rating
// @access  Owner
exports.rateEmployeeResume = async (req, res) => {
    try {
        const jobDescription = String(req.body.jobDescription || '').trim();

        const employment = await EmploymentState.findOne({
            _id: req.params.id,
            organizationId: req.organizationId,
        }).populate('userId', 'profile professional');
        if (!employment) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const user = employment.userId;
        const autoResumeText = [
            `${user?.profile?.firstName || ''} ${user?.profile?.surname || user?.profile?.lastName || ''}`,
            user?.professional?.headline || '',
            Array.isArray(user?.professional?.skills) ? user.professional.skills.join(', ') : '',
            Array.isArray(user?.professional?.skillsDetailed) ? user.professional.skillsDetailed.join(', ') : '',
            Array.isArray(user?.professional?.certifications) ? user.professional.certifications.join(', ') : '',
            Array.isArray(user?.professional?.languages) ? user.professional.languages.join(', ') : '',
            user?.professional?.highestEducation || '',
            user?.professional?.institutionName || '',
            String(user?.professional?.totalExperienceYears || ''),
        ].filter(Boolean).join('\n');

        if (!autoResumeText) {
            return res.status(400).json({ message: 'Employee profile resume data is empty' });
        }

        const aiResult = await aiService.screenResume(autoResumeText, jobDescription);
        employment.aiResumeRating = {
            score: Number(aiResult?.matchScore || 0),
            summary: String(aiResult?.summary || ''),
            missingSkills: Array.isArray(aiResult?.missingSkills) ? aiResult.missingSkills : [],
            interviewQuestions: Array.isArray(aiResult?.interviewQuestions) ? aiResult.interviewQuestions : [],
            ratedAt: new Date(),
        };
        await employment.save();

        res.json({
            employeeId: employment._id,
            aiResumeRating: employment.aiResumeRating,
        });
    } catch (error) {
        console.error('rateEmployeeResume error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Employee detail overview with issued assets/items
// @route   GET /api/organization/employees/:id/overview
// @access  Owner
exports.getEmployeeOverview = async (req, res) => {
    try {
        const employment = await EmploymentState.findOne({
            _id: req.params.id,
            organizationId: req.organizationId,
        })
            .populate('userId', 'email profile professional')
            .populate('roleId', 'name level')
            .populate('reportsToEmploymentId', 'designation department')
            .lean();

        if (!employment) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const [assets, attendanceSummaryAgg, payrollRows] = await Promise.all([
            EmployeeAsset.find({
                organizationId: req.organizationId,
                employmentId: req.params.id,
            }).sort('-issuedAt').lean(),
            Attendance.aggregate([
                {
                    $match: {
                        organizationId: req.organizationId,
                        userId: employment.userId?._id,
                        date: { $gte: monthStart, $lt: monthEnd },
                    },
                },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            PayrollRecord.findAll({
                where: {
                    organizationId: String(req.organizationId),
                    employeeId: String(req.params.id),
                    periodStart: { [Op.gte]: monthStart },
                    periodEnd: { [Op.lt]: monthEnd },
                },
                order: [['createdAt', 'DESC']],
                limit: 3,
            }),
        ]);

        const attendanceSummary = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LATE: 0 };
        attendanceSummaryAgg.forEach((item) => {
            attendanceSummary[item._id] = item.count;
        });

        const issuedValueTotal = assets
            .filter((item) => item.status === 'ISSUED')
            .reduce((sum, item) => sum + (Number(item.estimatedValue || 0) * Number(item.quantity || 1)), 0);

        res.json({
            employment,
            assets,
            assetStats: {
                totalItems: assets.length,
                activeIssuedItems: assets.filter((item) => item.status === 'ISSUED').length,
                issuedValueTotal,
            },
            attendanceSummary,
            payroll: payrollRows,
        });
    } catch (error) {
        console.error('getEmployeeOverview error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add issued organization item/asset to employee
// @route   POST /api/organization/employees/:id/items
// @access  Owner
exports.addEmployeeItem = async (req, res) => {
    try {
        const employment = await EmploymentState.findOne({
            _id: req.params.id,
            organizationId: req.organizationId,
        }).select('_id');
        if (!employment) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const itemName = String(req.body.itemName || '').trim();
        if (!itemName) {
            return res.status(400).json({ message: 'itemName is required' });
        }

        const row = await EmployeeAsset.create({
            organizationId: req.organizationId,
            employmentId: req.params.id,
            itemName,
            category: String(req.body.category || '').trim(),
            specs: String(req.body.specs || '').trim(),
            estimatedValue: Number(req.body.estimatedValue || 0),
            quantity: Math.max(1, Number(req.body.quantity || 1)),
            status: 'ISSUED',
            issuedAt: req.body.issuedAt ? new Date(req.body.issuedAt) : new Date(),
            notes: String(req.body.notes || '').trim(),
        });

        res.status(201).json(row);
    } catch (error) {
        console.error('addEmployeeItem error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
