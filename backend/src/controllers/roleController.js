const Role = require('../models/Role');
const EmploymentState = require('../models/EmploymentState');
const Organization = require('../models/Organization');
const { getRoleTemplate } = require('../services/organizationProvisioningService');

const RESERVED_ROLE_NAMES = new Set(['owner', 'admin', 'superadmin']);
const ROLE_MODULE_CATALOG = ['dashboard', 'organization', 'employees', 'roles', 'payroll', 'recruitment', 'org_chart', 'performance', 'feed', 'network', 'chat', 'settings'];
const FALLBACK_ROLE_LEVELS = {
    owner: 1,
    admin: 2,
    manager: 4,
    employee: 6,
};

const normalizeModule = (value) => String(value || '').trim().toLowerCase();

const normalizeAccessMatrix = (accessInput) => {
    if (!Array.isArray(accessInput)) return [];
    const seen = new Set();
    const normalized = [];

    accessInput.forEach((item) => {
        const module = normalizeModule(item?.module);
        if (!module || seen.has(module)) return;
        seen.add(module);

        normalized.push({
            module,
            read: Boolean(item?.read),
            write: Boolean(item?.write),
            approve: Boolean(item?.approve),
        });
    });

    return normalized;
};

const normalizeLimits = (limitsInput) => {
    const toNullableNumber = (value) => {
        if (value === null || typeof value === 'undefined' || value === '') return null;
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return null;
        return n;
    };

    return {
        maxUsersPerRole: toNullableNumber(limitsInput?.maxUsersPerRole),
        maxDirectReports: toNullableNumber(limitsInput?.maxDirectReports),
        maxMonthlyApprovals: toNullableNumber(limitsInput?.maxMonthlyApprovals),
        maxPayrollApprovalAmount: toNullableNumber(limitsInput?.maxPayrollApprovalAmount),
    };
};

const resolveActorRoleLevel = async (req) => {
    if (req.user?.isSuperAdmin) return 0;
    const roleName = String(req.userRole || '').trim();
    if (!roleName) return 999;
    const fallback = FALLBACK_ROLE_LEVELS[roleName.toLowerCase()];
    if (fallback) return fallback;

    const role = await Role.findOne({
        organizationId: req.organizationId,
        name: roleName,
    }).select('level').lean();

    return Number.isFinite(Number(role?.level)) ? Number(role.level) : 999;
};

const validateRoleNameByOrgType = async ({ req, roleName }) => {
    const organization = await Organization.findById(req.organizationId).select('organizationType organizationTypeLocked').lean();
    if (!organization) {
        return { ok: false, status: 404, message: 'Organization not found' };
    }

    if (organization.organizationTypeLocked && !req.user?.isSuperAdmin) {
        const allowed = new Set(getRoleTemplate(organization.organizationType).map((item) => String(item).trim().toLowerCase()));
        allowed.add('owner');
        if (!allowed.has(String(roleName).trim().toLowerCase())) {
            return {
                ok: false,
                status: 400,
                message: `Role '${roleName}' is outside selected organization type structure`,
            };
        }
    }

    return { ok: true };
};

const validateParentRole = async ({ req, parentRoleId, normalizedLevel }) => {
    if (!parentRoleId) return { ok: true, parentRole: null };

    const parentRole = await Role.findOne({
        _id: parentRoleId,
        organizationId: req.organizationId,
    }).select('_id level name').lean();
    if (!parentRole) {
        return { ok: false, status: 400, message: 'Invalid parentRoleId' };
    }
    if (parentRole.level >= normalizedLevel) {
        return { ok: false, status: 400, message: 'Role parent must be higher in hierarchy (lower level number)' };
    }

    return { ok: true, parentRole };
};

// @desc    Permission module catalog
// @route   GET /api/roles/permission-catalog
// @access  Owner
exports.getPermissionCatalog = async (req, res) => {
    res.json({
        modules: ROLE_MODULE_CATALOG,
        actions: ['read', 'write', 'approve'],
        limits: ['maxUsersPerRole', 'maxDirectReports', 'maxMonthlyApprovals', 'maxPayrollApprovalAmount'],
    });
};

// @desc    Get all roles for current organization
// @route   GET /api/roles
// @access  Private (Owner)
exports.getRoles = async (req, res) => {
    try {
        const query = { organizationId: req.organizationId };
        const roles = await Role.find(query).sort('level name').lean();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a new role
// @route   POST /api/roles
// @access  Owner
exports.createRole = async (req, res) => {
    try {
        const { name, permissions, level, parentRoleId, access, limits } = req.body;

        if (!name) return res.status(400).json({ message: 'Role name required' });
        if (RESERVED_ROLE_NAMES.has(String(name).trim().toLowerCase())) {
            return res.status(400).json({ message: `Role '${name}' is reserved and cannot be created manually` });
        }
        if (!Number.isFinite(Number(level)) || Number(level) < 2) {
            return res.status(400).json({ message: 'level must be a number >= 2' });
        }

        const orgTypeCheck = await validateRoleNameByOrgType({ req, roleName: name });
        if (!orgTypeCheck.ok) {
            return res.status(orgTypeCheck.status).json({ message: orgTypeCheck.message });
        }

        const normalizedLevel = Number(level);
        const actorLevel = await resolveActorRoleLevel(req);
        if (normalizedLevel < actorLevel) {
            return res.status(403).json({ message: 'Lower level cannot create higher level role' });
        }

        const parentCheck = await validateParentRole({ req, parentRoleId, normalizedLevel });
        if (!parentCheck.ok) {
            return res.status(parentCheck.status).json({ message: parentCheck.message });
        }

        const role = await Role.create({
            name: String(name).trim(),
            permissions: Array.isArray(permissions) ? permissions : [],
            access: normalizeAccessMatrix(access),
            limits: normalizeLimits(limits),
            organizationId: req.organizationId,
            isSystem: false,
            level: normalizedLevel,
            parentRoleId: parentCheck.parentRole?._id || null,
        });

        res.status(201).json(role);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Role with same name already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update role permissions/limits/name
// @route   PATCH /api/roles/:id
// @access  Owner
exports.updateRole = async (req, res) => {
    try {
        const role = await Role.findOne({ _id: req.params.id, organizationId: req.organizationId });
        if (!role) return res.status(404).json({ message: 'Role not found' });

        const patch = {};

        if (typeof req.body.name !== 'undefined') {
            const nextName = String(req.body.name || '').trim();
            if (!nextName) return res.status(400).json({ message: 'Role name required' });
            if (role.isSystem) {
                return res.status(400).json({ message: 'System role name cannot be changed' });
            }
            if (RESERVED_ROLE_NAMES.has(nextName.toLowerCase())) {
                return res.status(400).json({ message: `Role '${nextName}' is reserved` });
            }
            const orgTypeCheck = await validateRoleNameByOrgType({ req, roleName: nextName });
            if (!orgTypeCheck.ok) {
                return res.status(orgTypeCheck.status).json({ message: orgTypeCheck.message });
            }
            patch.name = nextName;
        }

        if (typeof req.body.level !== 'undefined') {
            const normalizedLevel = Number(req.body.level);
            if (!Number.isFinite(normalizedLevel) || normalizedLevel < 1) {
                return res.status(400).json({ message: 'Invalid level' });
            }
            const actorLevel = await resolveActorRoleLevel(req);
            if (normalizedLevel < actorLevel && !req.user?.isSuperAdmin) {
                return res.status(403).json({ message: 'Lower level cannot move role above your hierarchy' });
            }
            patch.level = normalizedLevel;

            const parentCheck = await validateParentRole({ req, parentRoleId: req.body.parentRoleId || role.parentRoleId, normalizedLevel });
            if (!parentCheck.ok) {
                return res.status(parentCheck.status).json({ message: parentCheck.message });
            }
            patch.parentRoleId = parentCheck.parentRole?._id || null;
        } else if (typeof req.body.parentRoleId !== 'undefined') {
            const parentCheck = await validateParentRole({ req, parentRoleId: req.body.parentRoleId, normalizedLevel: Number(role.level || 100) });
            if (!parentCheck.ok) {
                return res.status(parentCheck.status).json({ message: parentCheck.message });
            }
            patch.parentRoleId = parentCheck.parentRole?._id || null;
        }

        if (typeof req.body.permissions !== 'undefined') {
            patch.permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
        }
        if (typeof req.body.access !== 'undefined') {
            patch.access = normalizeAccessMatrix(req.body.access);
        }
        if (typeof req.body.limits !== 'undefined') {
            patch.limits = normalizeLimits(req.body.limits);
        }
        if (typeof req.body.description !== 'undefined') {
            patch.description = String(req.body.description || '');
        }

        Object.assign(role, patch);
        await role.save();
        res.json(role);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Role with same name already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Owner
exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findOne({ _id: req.params.id, organizationId: req.organizationId });
        if (!role) return res.status(404).json({ message: 'Role not found' });

        if (role.isSystem) {
            return res.status(400).json({ message: 'Cannot delete system role' });
        }

        const [hasChildren, hasEmployees] = await Promise.all([
            Role.exists({ organizationId: req.organizationId, parentRoleId: role._id }),
            EmploymentState.exists({ organizationId: req.organizationId, roleId: role._id, status: { $ne: 'TERMINATED' } }),
        ]);

        if (hasChildren) {
            return res.status(400).json({ message: 'Cannot delete role with dependent child roles' });
        }
        if (hasEmployees) {
            return res.status(400).json({ message: 'Cannot delete role assigned to employees' });
        }

        await role.deleteOne();
        res.json({ message: 'Role removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
