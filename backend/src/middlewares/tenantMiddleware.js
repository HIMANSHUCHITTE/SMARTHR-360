const EmploymentState = require('../models/EmploymentState');

const requireTenant = async (req, res, next) => {
    try {
        if (req.organizationId) {
            return next();
        }

        const headerTenantId = String(req.headers['x-tenant-id'] || '').trim();
        if (!headerTenantId) {
            return res.status(403).json({ message: 'Organization context required. Please switch organization.' });
        }

        // SuperAdmin can target any tenant through header context.
        if (req.user?.isSuperAdmin) {
            req.organizationId = headerTenantId;
            return next();
        }

        // For non-superadmin, verify active membership in target organization.
        const employment = await EmploymentState.findOne({
            userId: req.user?.id,
            organizationId: headerTenantId,
            status: { $in: ['ACTIVE', 'INVITED', 'SUSPENDED'] },
        }).populate('roleId', 'name');

        if (!employment) {
            return res.status(403).json({ message: 'No active access to selected organization.' });
        }

        req.organizationId = headerTenantId;
        if (!req.userRole && employment?.roleId?.name) {
            req.userRole = employment.roleId.name;
        }
        return next();
    } catch (error) {
        console.error('Tenant middleware error', error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { requireTenant };
