const User = require('../models/User');
const { verifyAccessToken } = require('../utils/authUtils');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = verifyAccessToken(token);

            // Check if user still exists
            const user = await User.findById(decoded.id)
                .select('_id isSuperAdmin')
                .lean();
            if (!user) {
                return res.status(401).json({ message: 'User belonging to this token no longer exists.' });
            }

            req.user = {
                ...user,
                id: String(user._id),
            };
            // If the token has an organizationId (org scoped), attach it
            if (decoded.organizationId) {
                req.organizationId = decoded.organizationId;
                req.userRole = decoded.role;
            }

            next();
        } catch (error) {
            console.error('Auth Middleware Error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
