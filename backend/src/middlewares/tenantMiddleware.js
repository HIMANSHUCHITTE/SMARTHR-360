// Middleware to ensure request is scoped to an organization
const requireTenant = (req, res, next) => {
    // 1. Check if organizationId is in the token (req.organizationId from authMiddleware)
    if (req.organizationId) {
        return next();
    }

    // 2. Alternatively, check header 'x-tenant-id' if we allow switching context without re-login (less secure but common)
    // For this strict architecture, we require the token to be scoped.

    // 3. SuperAdmin bypass?
    if (req.user && req.user.isSuperAdmin) {
        // If SuperAdmin, they might need to explicitly set header to target an org, 
        // or operate in "God Mode".
        // For now, if targeting a specific org route, they should provide header.
        if (req.headers['x-tenant-id']) {
            req.organizationId = req.headers['x-tenant-id'];
            return next();
        }
    }

    return res.status(403).json({ message: 'Organization context required. Please switch organization.' });
};

module.exports = { requireTenant };
