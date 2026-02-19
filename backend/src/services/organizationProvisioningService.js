const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const OrganizationRequest = require('../models/OrganizationRequest');
const Role = require('../models/Role');
const User = require('../models/User');
const EmploymentState = require('../models/EmploymentState');
const Branch = require('../models/Branch');
const Department = require('../models/Department');
const {
    ORGANIZATION_TYPES,
    getOrganizationTemplate,
    getOrganizationTemplates,
} = require('../constants/organizationTemplates');

const BASE_PERMISSIONS = ['dashboard:view', 'organization:view'];

const ROLE_TEMPLATE_BY_TYPE = {
    [ORGANIZATION_TYPES.CORPORATE_IT]: ['Owner', 'CEO', 'Department Head', 'Manager', 'Team Lead', 'Employee', 'Intern'],
    [ORGANIZATION_TYPES.SCHOOL_COLLEGE]: ['Owner', 'Chairman', 'Principal', 'HOD', 'Teacher', 'Assistant Teacher', 'Staff'],
    [ORGANIZATION_TYPES.HOSPITAL]: ['Owner', 'Medical Director', 'HOD', 'Doctor', 'Nurse', 'Support Staff'],
    [ORGANIZATION_TYPES.MANUFACTURING_FACTORY]: ['Owner', 'Plant Head', 'Production Manager', 'Supervisor', 'Worker', 'Helper'],
    [ORGANIZATION_TYPES.GOVERNMENT]: ['Owner', 'Secretary', 'Director', 'Officer', 'Clerk', 'Field Staff'],
    [ORGANIZATION_TYPES.GOVERNMENT_PSU]: ['Owner', 'Secretary', 'Director', 'Officer', 'Clerk', 'Field Staff'],
    [ORGANIZATION_TYPES.RETAIL_CHAIN]: ['Owner', 'Corporate Head', 'Regional Manager', 'Area Manager', 'Store Manager', 'Sales Staff', 'Helper'],
};

const ROLE_PERMISSIONS = {
    Owner: ['*'],
    CEO: ['dashboard:view', 'employees:view', 'employees:write', 'employees:approve', 'payroll:view', 'recruitment:view'],
    Chairman: ['dashboard:view', 'employees:view', 'employees:approve', 'policies:write'],
    Principal: ['dashboard:view', 'employees:view', 'employees:write', 'employees:approve'],
    'Medical Director': ['dashboard:view', 'employees:view', 'employees:approve', 'attendance:view'],
    'Plant Head': ['dashboard:view', 'employees:view', 'employees:approve', 'payroll:view'],
    Secretary: ['dashboard:view', 'employees:view', 'employees:approve', 'policies:view'],
    'Corporate Head': ['dashboard:view', 'employees:view', 'employees:approve', 'reports:view'],
    'Department Head': ['employees:view', 'employees:write', 'attendance:view'],
    Manager: ['employees:view', 'employees:write', 'leave:approve'],
    'Team Lead': ['employees:view', 'attendance:view', 'leave:approve'],
    Employee: ['self:view', 'self:write'],
    Intern: ['self:view'],
    HOD: ['employees:view', 'employees:write', 'leave:approve'],
    Teacher: ['self:view', 'attendance:view'],
    'Assistant Teacher': ['self:view', 'attendance:view'],
    Staff: ['self:view'],
    Doctor: ['self:view', 'attendance:view'],
    Nurse: ['self:view', 'attendance:view'],
    'Support Staff': ['self:view'],
    Supervisor: ['employees:view', 'attendance:view'],
    Worker: ['self:view'],
    Helper: ['self:view'],
    Director: ['employees:view', 'employees:approve'],
    Officer: ['employees:view', 'leave:approve'],
    Clerk: ['self:view'],
    'Field Staff': ['self:view'],
    'Regional Manager': ['employees:view', 'employees:approve'],
    'Area Manager': ['employees:view', 'employees:write'],
    'Store Manager': ['employees:view', 'employees:write', 'leave:approve'],
    'Sales Staff': ['self:view'],
};

const ROLE_ACCESS_DEFAULTS = {
    Owner: [
        { module: 'dashboard', read: true, write: true, approve: true },
        { module: 'organization', read: true, write: true, approve: true },
        { module: 'employees', read: true, write: true, approve: true },
        { module: 'roles', read: true, write: true, approve: true },
        { module: 'payroll', read: true, write: true, approve: true },
        { module: 'recruitment', read: true, write: true, approve: true },
    ],
    Manager: [
        { module: 'dashboard', read: true, write: false, approve: false },
        { module: 'employees', read: true, write: true, approve: false },
        { module: 'recruitment', read: true, write: false, approve: false },
    ],
    'Team Lead': [
        { module: 'dashboard', read: true, write: false, approve: false },
        { module: 'employees', read: true, write: false, approve: false },
    ],
};

const ROLE_LIMIT_DEFAULTS = {
    Owner: { maxUsersPerRole: null, maxDirectReports: null, maxMonthlyApprovals: null, maxPayrollApprovalAmount: null },
    Manager: { maxUsersPerRole: null, maxDirectReports: 12, maxMonthlyApprovals: 50, maxPayrollApprovalAmount: null },
    'Team Lead': { maxUsersPerRole: null, maxDirectReports: 8, maxMonthlyApprovals: 25, maxPayrollApprovalAmount: null },
};

const toSlug = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 48);

const uniqueSlug = async (base, session) => {
    const seed = base || `org-${Date.now().toString(36)}`;
    let candidate = seed;
    let idx = 0;

    while (await Organization.exists({ slug: candidate }).session(session)) {
        idx += 1;
        candidate = `${seed}-${idx}`;
    }
    return candidate;
};

const getRoleTemplate = (organizationType) => {
    const key = ROLE_TEMPLATE_BY_TYPE[organizationType] ? organizationType : ORGANIZATION_TYPES.CORPORATE_IT;
    return ROLE_TEMPLATE_BY_TYPE[key];
};

const createHierarchyRoles = async ({ organizationId, organizationType, session }) => {
    const templateRoles = getRoleTemplate(organizationType);
    const created = [];

    for (let i = 0; i < templateRoles.length; i += 1) {
        const roleName = templateRoles[i];
        const parentRole = created[i - 1] || null;
        const role = await Role.create([{
            organizationId,
            name: roleName,
            level: i + 1,
            parentRoleId: parentRole ? parentRole._id : null,
            permissions: ROLE_PERMISSIONS[roleName] || BASE_PERMISSIONS,
            access: ROLE_ACCESS_DEFAULTS[roleName] || [],
            limits: ROLE_LIMIT_DEFAULTS[roleName] || {
                maxUsersPerRole: null,
                maxDirectReports: null,
                maxMonthlyApprovals: null,
                maxPayrollApprovalAmount: null,
            },
            isSystem: true,
            description: parentRole ? `Reports to ${parentRole.name}` : 'Top level role',
        }], { session });
        created.push(role[0]);
    }

    return created;
};

const provisionOrganizationFromRequest = async ({ requestId, reviewedByUserId, patch = {} }) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const request = await OrganizationRequest.findById(requestId).session(session);
        if (!request) {
            throw new Error('Organization request not found');
        }
        if (request.status !== 'PENDING') {
            throw new Error('Only pending request can be approved');
        }
        if (request.linkedOrganizationId) {
            throw new Error('Request already linked to organization');
        }

        const organizationType = patch.organizationType || request.organizationType;
        const selectedTemplate = getOrganizationTemplate(organizationType);
        const slugBase = toSlug(patch.organizationName || request.organizationName);
        const slug = await uniqueSlug(slugBase, session);

        const organizationRows = await Organization.create([{
            name: patch.organizationName || request.organizationName,
            slug,
            ownerId: request.requestedByUserId,
            organizationType,
            organizationTypeLocked: true,
            platformStatus: 'APPROVED',
            settings: {
                branding: {},
                modulesEnabled: {
                    payroll: true,
                    recruitment: true,
                },
            },
            hierarchyConfig: {
                templates: getOrganizationTemplates(),
                activeTemplateType: selectedTemplate.type,
                customLevels: [...selectedTemplate.levels],
                matrixReportingEnabled: false,
                visibilityPolicy: 'DOWNLINE_ONLY',
                blockUpwardVisibility: true,
            },
            subscription: {
                planId: 'PRO',
                status: 'ACTIVE',
                employeeLimit: 50,
                features: ['core_hrms', 'payroll', 'recruitment', 'reputation'],
            },
        }], { session });
        const organization = organizationRows[0];

        await Branch.create([{
            organizationId: organization._id,
            name: 'Head Office',
            code: 'HQ',
            isHeadOffice: true,
            isActive: true,
        }], { session });

        if (Array.isArray(selectedTemplate.departments) && selectedTemplate.departments.length > 0) {
            await Department.insertMany(
                selectedTemplate.departments.map((name, idx) => ({
                    organizationId: organization._id,
                    name,
                    code: `DPT${String(idx + 1).padStart(2, '0')}`,
                    isActive: true,
                })),
                { session },
            );
        }

        const roles = await createHierarchyRoles({
            organizationId: organization._id,
            organizationType,
            session,
        });
        const ownerRole = roles[0];

        await EmploymentState.create([{
            userId: request.requestedByUserId,
            organizationId: organization._id,
            roleId: ownerRole._id,
            status: 'ACTIVE',
            designation: ownerRole.name,
            department: selectedTemplate.departments?.[0] || 'General',
            joinedAt: new Date(),
        }], { session });

        await User.updateOne(
            { _id: request.requestedByUserId },
            {
                $set: {
                    'employment.status': 'ACTIVE',
                    'employment.currentOrganizationId': organization._id,
                },
            },
            { session },
        );

        request.status = 'APPROVED';
        request.linkedOrganizationId = organization._id;
        request.organizationType = organizationType;
        request.organizationName = patch.organizationName || request.organizationName;
        request.decision = {
            reviewedBy: reviewedByUserId || null,
            reviewedAt: new Date(),
            reason: String(patch.approvalNote || '').trim(),
        };
        await request.save({ session });

        await session.commitTransaction();
        return { organization, roles, request };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const rejectOrganizationRequest = async ({ requestId, reviewedByUserId, reason }) => {
    const request = await OrganizationRequest.findById(requestId);
    if (!request) {
        throw new Error('Organization request not found');
    }
    if (request.status !== 'PENDING') {
        throw new Error('Only pending request can be rejected');
    }

    request.status = 'REJECTED';
    request.decision = {
        reviewedBy: reviewedByUserId || null,
        reviewedAt: new Date(),
        reason: String(reason || '').trim(),
    };
    await request.save();
    return request;
};

module.exports = {
    provisionOrganizationFromRequest,
    rejectOrganizationRequest,
    getRoleTemplate,
};
