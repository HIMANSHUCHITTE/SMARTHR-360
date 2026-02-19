const User = require('../models/User');
const EmploymentState = require('../models/EmploymentState');
const Role = require('../models/Role');
const WorkHistory = require('../models/WorkHistory');
const { hashPassword } = require('../utils/authUtils');

const VIEWABLE_STATUSES = ['ACTIVE', 'SUSPENDED', 'INVITED'];
const RESTRICTED_ASSIGNMENT_ROLES = new Set(['owner', 'admin', 'superadmin']);

const normalizeId = (value) => (value ? String(value) : null);
const normalizeRole = (value) => String(value || '').trim().toLowerCase();

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
}).populate('roleId', 'name');

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
        const employees = await EmploymentState.find({
            organizationId: req.organizationId,
            status: { $in: VIEWABLE_STATUSES },
        })
            .populate('userId', 'email profile')
            .populate('roleId', 'name')
            .sort('-joinedAt');

        if (req.userRole === 'Owner') {
            return res.json(employees);
        }

        const viewerEmployment = await getViewerEmployment(req.user._id, req.organizationId);
        if (!viewerEmployment) {
            return res.status(403).json({ message: 'Active employment not found for this organization' });
        }

        const descendantSet = buildDescendantSet(employees, viewerEmployment._id);
        const visibleEmployees = employees.filter((row) => descendantSet.has(normalizeId(row._id)));

        return res.json(visibleEmployees);
    } catch (error) {
        console.error('Get employees error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add Employee (Invite)
// @route   POST /api/organization/employees
// @access  Owner, Admin
exports.addEmployee = async (req, res) => {
    const { email, firstName, lastName, roleName, designation, department, password, reportsToEmploymentId } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    try {
        const viewerEmployment = await getViewerEmployment(req.user._id, req.organizationId);
        if (req.userRole !== 'Owner' && !viewerEmployment) {
            return res.status(403).json({ message: 'Active employment not found for this organization' });
        }

        const allOrgRows = await EmploymentState.find({
            organizationId: req.organizationId,
            status: { $in: VIEWABLE_STATUSES },
        }).select('_id reportsToEmploymentId');

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

        // 2. Find or Create User
        let user = await User.findOne({ email: normalizedEmail });
        let isNewUser = false;
        let issuedTempPassword = null;

        if (!user) {
            isNewUser = true;
            const tempPassword = String(password || '').trim() || Math.random().toString(36).slice(-8);
            issuedTempPassword = tempPassword;
            const hashedPassword = await hashPassword(tempPassword);

            user = await User.create({
                email: normalizedEmail,
                passwordHash: hashedPassword,
                profile: {
                    firstName,
                    middleName: '',
                    surname: lastName || '',
                    lastName: lastName || '',
                },
                security: { passwordChangedAt: null }, // Indicates need to set password
            });

            // TODO: Send Email with tempPassword using EmailService
            console.log(`[Email Mock] Invite sent to ${email} with password: ${tempPassword}`);
        } else if (String(password || '').trim()) {
            // Optional reset when owner/admin re-invites known user with explicit password.
            const hashedPassword = await hashPassword(String(password).trim());
            await User.findByIdAndUpdate(user._id, {
                $set: {
                    passwordHash: hashedPassword,
                    'security.passwordChangedAt': null,
                },
            });
        }

        // 3. Check if already employed in this Org
        const existingEmployment = await EmploymentState.findOne({ userId: user._id, organizationId: req.organizationId });
        if (existingEmployment) {
            return res.status(400).json({ message: 'User is already an employee here.' });
        }

        // 4. Create Employment State
        let managerEmploymentId = reportsToEmploymentId || null;
        if (managerEmploymentId) {
            const managerExists = await EmploymentState.exists({
                _id: managerEmploymentId,
                organizationId: req.organizationId,
                status: { $in: VIEWABLE_STATUSES },
            });
            if (!managerExists) {
                return res.status(400).json({ message: 'Invalid reporting manager for this organization.' });
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
            ...(process.env.NODE_ENV === 'development' && isNewUser ? { tempPassword: issuedTempPassword } : {})
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
        }).select('_id reportsToEmploymentId');

        const viewerDescendantSet = viewerEmployment
            ? buildDescendantSet(allOrgRows, viewerEmployment._id)
            : new Set();

        if (!canViewerManageTarget(req, viewerEmployment, viewerDescendantSet, req.params.id)) {
            return res.status(403).json({ message: 'You can only update employees in your downline hierarchy' });
        }

        const updateFields = { designation, department, status };

        if (roleName) {
            const role = await Role.findOne({ organizationId: req.organizationId, name: roleName });
            if (role) {
                if (RESTRICTED_ASSIGNMENT_ROLES.has(normalizeRole(role.name))) {
                    return res.status(403).json({ message: `Role '${role.name}' cannot be assigned through employee management` });
                }
                updateFields.roleId = role._id;
            }
        }

        if (typeof reportsToEmploymentId !== 'undefined') {
            if (reportsToEmploymentId === null || reportsToEmploymentId === '') {
                updateFields.reportsToEmploymentId = null;
            } else {
                if (normalizeId(reportsToEmploymentId) === normalizeId(req.params.id)) {
                    return res.status(400).json({ message: 'Employee cannot report to themselves' });
                }

                const managerExists = await EmploymentState.exists({
                    _id: reportsToEmploymentId,
                    organizationId: req.organizationId,
                    status: { $in: VIEWABLE_STATUSES },
                });

                if (!managerExists) {
                    return res.status(400).json({ message: 'Invalid reporting manager for this organization.' });
                }

                if (req.userRole !== 'Owner') {
                    const managerId = normalizeId(reportsToEmploymentId);
                    const canAssignManager = managerId === normalizeId(viewerEmployment._id) || viewerDescendantSet.has(managerId);
                    if (!canAssignManager) {
                        return res.status(403).json({ message: 'You can assign reporting only inside your downline hierarchy' });
                    }
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
        }).select('_id reportsToEmploymentId');

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
