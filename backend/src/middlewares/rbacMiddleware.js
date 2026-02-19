const Role = require('../models/Role');

// Check if user has one of the allowed roles (by name)
const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // SuperAdmin bypass
        if (req.user.isSuperAdmin) return next();

        // specific org context check
        if (!req.organizationId) {
            return res.status(403).json({ message: 'RBAC requires Organization context.' });
        }

        try {
            // req.userRole is currently 'Owner' string or RoleID?
            // In authController, we set it to 'Owner' string for registration.
            // But for robustness, we should use Role ID or fetch Role by Name.

            // If req.userRole is a string (Role Name) from token:
            if (allowedRoles.includes(req.userRole)) {
                return next();
            }

            // If token has Role ID (better for custom roles)
            // const role = await Role.findById(req.userRole);
            // if (allowedRoles.includes(role.name)) next();

            return res.status(403).json({ message: 'Access denied: Insufficient Role' });
        } catch (error) {
            console.error('RBAC Error', error);
            res.status(500).json({ message: 'Server Error during Authorization' });
        }
    };
};

// Check for specific permission
const authorizePermission = (requiredPermission) => {
    return async (req, res, next) => {
        if (req.user.isSuperAdmin) return next();
        if (!req.organizationId) return res.status(403).json({ message: 'Context missing' });

        try {
            // Resolve Role
            const roleName = req.userRole;

            // Find Role in DB to get permissions
            // We need to cache this query ideally!
            const role = await Role.findOne({
                organizationId: req.organizationId,
                name: roleName
            });

            if (!role) {
                // Fallback for System roles defined in code?
                if (roleName === 'Owner') return next(); // Owner has *
            }

            if (role) {
                if (role.permissions.includes('*')) return next();
                if (role.permissions.includes(requiredPermission)) return next();
            }

            return res.status(403).json({ message: `Access denied: Missing permission ${requiredPermission}` });
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { authorizeRoles, authorizePermission };
