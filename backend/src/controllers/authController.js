const Joi = require('joi');
const User = require('../models/User');
const Organization = require('../models/Organization');
const EmploymentState = require('../models/EmploymentState');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const OtpSession = require('../models/OtpSession');
const LoginAudit = require('../models/postgres/LoginAudit');
const notificationService = require('../services/notificationService');
const { hashPassword, comparePassword, signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/authUtils');

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
const mobilePattern = /^\d{10,15}$/;

const registerStartSchema = Joi.object({
    firstName: Joi.string().trim().min(2).required(),
    middleName: Joi.string().trim().allow('', null).default(''),
    surname: Joi.string().trim().min(2).required(),
    dateOfBirth: Joi.date().max('now').required(),
    email: Joi.string().email().required(),
    mobile: Joi.string().pattern(mobilePattern).required(),
    avatarUrl: Joi.string().allow('', null).default(''),
    password: Joi.string().pattern(passwordPattern).required(),
    confirmPassword: Joi.string().required(),
});

const registerVerifySchema = Joi.object({
    verificationId: Joi.string().required(),
    emailOtp: Joi.string().pattern(/^\d{6}$/).required(),
    mobileOtp: Joi.string().pattern(/^\d{6}$/).required(),
});

const registerCompleteSchema = Joi.object({
    verificationId: Joi.string().required(),
    purpose: Joi.string().valid('OWNER', 'USER').required(),
    preferredPlan: Joi.string().valid('FREE', 'PRO', 'ENTERPRISE').optional(),
});

const legacyRegisterSchema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    isOwner: Joi.boolean().default(false),
    organizationName: Joi.string().when('isOwner', { is: true, then: Joi.required() }),
    organizationSlug: Joi.string().when('isOwner', { is: true, then: Joi.required() }),
});

const loginStartSchema = Joi.object({
    identifier: Joi.string().trim().required(),
    password: Joi.string().required(),
});

const loginVerifySchema = Joi.object({
    loginSessionId: Joi.string().required(),
    emailOtp: Joi.string().pattern(/^\d{6}$/).required(),
});

const legacyLoginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const isProduction = process.env.NODE_ENV === 'production';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const makeSessionId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const toSlug = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);

const uniqueSlug = async (base) => {
    let candidate = base || `org-${Date.now().toString(36)}`;
    let i = 0;
    while (await Organization.exists({ slug: candidate })) {
        i += 1;
        candidate = `${base}-${i}`;
    }
    return candidate;
};

const setRefreshCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

const getPanelDecision = ({ isSuperAdmin, employment }) => {
    if (isSuperAdmin) {
        return { panel: 'SUPERADMIN', redirectPath: '/superadmin/dashboard' };
    }

    if (!employment) {
        return { panel: 'USER', redirectPath: '/user/dashboard' };
    }

    const role = String(employment?.roleId?.name || '').trim().toLowerCase();
    if (role === 'owner') {
        return { panel: 'OWNER', redirectPath: '/owner/dashboard' };
    }

    return { panel: 'SUBADMIN', redirectPath: '/subadmin/dashboard' };
};

const ensureOwnerRole = async (organizationId) => {
    let ownerRole = await Role.findOne({ organizationId, name: 'Owner' });
    if (!ownerRole) {
        ownerRole = await Role.create({
            organizationId,
            name: 'Owner',
            permissions: ['*'],
            isSystem: true,
        });
    }
    return ownerRole;
};

const issueLoginTokens = async ({ user, organizationId = null, role = null }) => {
    const payload = { id: user._id };
    if (organizationId) {
        payload.organizationId = organizationId;
        payload.role = role;
    }

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ id: user._id, version: user.security.refreshTokenVersion });
    return { accessToken, refreshToken };
};

const sendLoginNotification = async ({ userId, organizationId, panel }) => {
    try {
        await notificationService.send(userId, {
            organizationId,
            type: 'INFO',
            title: 'Welcome back',
            message: `You are logged in to ${panel} panel.`,
            actionLink: '/settings',
        });
    } catch (error) {
        console.error('sendLoginNotification error', error?.message || error);
    }
};

exports.registerStart = async (req, res) => {
    try {
        const { error, value } = registerStartSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        if (value.password !== value.confirmPassword) {
            return res.status(400).json({ message: 'Password and confirm password do not match' });
        }

        const email = normalizeEmail(value.email);
        const mobile = String(value.mobile).trim();

        const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Email or mobile is already registered' });
        }

        const verificationId = makeSessionId();
        const emailOtp = generateOtp();
        const mobileOtp = generateOtp();
        const passwordHash = await hashPassword(value.password);

        await OtpSession.create({
            sessionId: verificationId,
            flow: 'REGISTER',
            registerData: {
                firstName: value.firstName,
                middleName: value.middleName || '',
                surname: value.surname,
                dateOfBirth: new Date(value.dateOfBirth),
                email,
                mobile,
                avatarUrl: value.avatarUrl || '',
                passwordHash,
            },
            emailOtp,
            mobileOtp,
            verified: false,
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
        });

        res.status(200).json({
            verificationId,
            message: 'OTP sent to your email and mobile',
            ...(isProduction ? {} : { debugOtp: { emailOtp, mobileOtp } }),
        });
    } catch (error) {
        console.error('registerStart error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.registerVerify = async (req, res) => {
    try {
        const { error, value } = registerVerifySchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const session = await OtpSession.findOne({
            sessionId: value.verificationId,
            flow: 'REGISTER',
        });
        if (!session) return res.status(400).json({ message: 'Invalid verification session' });

        if (Date.now() > new Date(session.expiresAt).getTime()) {
            await OtpSession.deleteOne({ _id: session._id });
            return res.status(400).json({ message: 'OTP expired. Please restart registration.' });
        }

        if (session.emailOtp !== value.emailOtp || session.mobileOtp !== value.mobileOtp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        session.verified = true;
        await session.save();

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('registerVerify error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.registerComplete = async (req, res) => {
    try {
        const { error, value } = registerCompleteSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const session = await OtpSession.findOne({
            sessionId: value.verificationId,
            flow: 'REGISTER',
        });
        if (!session) return res.status(400).json({ message: 'Invalid verification session' });
        if (Date.now() > new Date(session.expiresAt).getTime()) {
            await OtpSession.deleteOne({ _id: session._id });
            return res.status(400).json({ message: 'Session expired. Please restart registration.' });
        }
        if (!session.verified) return res.status(400).json({ message: 'Complete OTP verification first' });

        const { firstName, middleName, surname, dateOfBirth, email, mobile, avatarUrl, passwordHash } = session.registerData || {};
        const ownerPlan = (value.preferredPlan || 'FREE').toUpperCase();

        const alreadyRegistered = await User.findOne({ $or: [{ email }, { mobile }] }).select('_id');
        if (alreadyRegistered) {
            await OtpSession.deleteOne({ _id: session._id });
            return res.status(409).json({ message: 'This email/mobile is already registered. Please login.' });
        }

        if (!passwordHash) {
            await OtpSession.deleteOne({ _id: session._id });
            return res.status(400).json({ message: 'Registration session invalid. Please restart registration.' });
        }

        const user = await User.create({
            email,
            mobile,
            dateOfBirth,
            passwordHash,
            profile: {
                firstName,
                middleName,
                surname,
                lastName: surname,
                avatarUrl: avatarUrl || '',
            },
            isSuperAdmin: false,
        });

        let organization = null;
        if (value.purpose === 'OWNER') {
            const orgName = `${firstName} ${surname}`.trim() + ' Workspace';
            const slugBase = toSlug(`${firstName}-${surname}`) || `workspace-${Date.now().toString(36)}`;
            const slug = await uniqueSlug(slugBase);

            const planConfig = {
                FREE: { employeeLimit: 5, features: ['core_hrms'] },
                PRO: { employeeLimit: 50, features: ['core_hrms', 'payroll', 'recruitment', 'reputation'] },
                ENTERPRISE: { employeeLimit: 100000, features: ['core_hrms', 'payroll', 'recruitment', 'reputation', 'api_access'] },
            };

            organization = await Organization.create({
                name: orgName,
                slug,
                ownerId: user._id,
                platformStatus: 'PENDING',
                subscription: {
                    planId: ownerPlan,
                    status: 'ACTIVE',
                    employeeLimit: planConfig[ownerPlan].employeeLimit,
                    features: planConfig[ownerPlan].features,
                },
            });

            const ownerRole = await ensureOwnerRole(organization._id);
            await EmploymentState.create({
                userId: user._id,
                organizationId: organization._id,
                roleId: ownerRole._id,
                status: 'ACTIVE',
                designation: 'Owner',
                joinedAt: new Date(),
            });

            await User.findByIdAndUpdate(user._id, {
                $set: {
                    'employment.status': 'ACTIVE',
                    'employment.currentOrganizationId': organization._id,
                },
            });
        }

        await OtpSession.deleteOne({ _id: session._id });

        res.status(201).json({
            message: 'Registration complete. Please login.',
            purpose: value.purpose,
            organization: organization ? { id: organization._id, name: organization.name } : null,
        });
    } catch (error) {
        console.error('registerComplete error', error);
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Account already exists. Please login.' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.loginStart = async (req, res) => {
    try {
        const { error, value } = loginStartSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const identifier = String(value.identifier).trim();
        const query = identifier.includes('@')
            ? { email: normalizeEmail(identifier) }
            : { mobile: identifier };

        const user = await User.findOne(query).select('+passwordHash +security.refreshTokenVersion');
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        if (!user.passwordHash) {
            return res.status(401).json({ message: 'Account password is not set yet' });
        }

        const isMatch = await comparePassword(value.password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const loginSessionId = makeSessionId();
        const emailOtp = generateOtp();

        await OtpSession.create({
            sessionId: loginSessionId,
            flow: 'LOGIN',
            loginData: {
                userId: user._id,
            },
            emailOtp,
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
        });

        res.json({
            loginSessionId,
            message: 'Email OTP sent',
            ...(isProduction ? {} : { debugOtp: { emailOtp } }),
        });
    } catch (error) {
        console.error('loginStart error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.loginVerify = async (req, res) => {
    try {
        const { error, value } = loginVerifySchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const session = await OtpSession.findOne({
            sessionId: value.loginSessionId,
            flow: 'LOGIN',
        });
        if (!session) return res.status(400).json({ message: 'Invalid login session' });
        if (Date.now() > new Date(session.expiresAt).getTime()) {
            await OtpSession.deleteOne({ _id: session._id });
            return res.status(400).json({ message: 'OTP expired. Please login again.' });
        }
        if (session.emailOtp !== value.emailOtp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const user = await User.findById(session.loginData?.userId).select('+security.refreshTokenVersion');
        if (!user) return res.status(401).json({ message: 'User no longer exists' });

        const activeEmployment = await EmploymentState.findOne({
            userId: user._id,
            status: 'ACTIVE',
        }).populate('organizationId', 'name slug').populate('roleId', 'name');

        const panelDecision = getPanelDecision({ isSuperAdmin: user.isSuperAdmin, employment: activeEmployment });
        const { accessToken, refreshToken } = await issueLoginTokens({
            user,
            organizationId: activeEmployment?.organizationId?._id || null,
            role: activeEmployment?.roleId?.name || null,
        });

        setRefreshCookie(res, refreshToken);

        await User.findByIdAndUpdate(user._id, {
            $set: { 'security.lastLogin': new Date() },
        });

        if (activeEmployment?.organizationId?._id) {
            await User.findByIdAndUpdate(user._id, {
                $set: {
                    'employment.status': 'ACTIVE',
                    'employment.currentOrganizationId': activeEmployment.organizationId._id,
                },
            });
        }

        await sendLoginNotification({
            userId: user._id,
            organizationId: activeEmployment?.organizationId?._id || null,
            panel: panelDecision.panel,
        });

        await AuditLog.create({
            organizationId: activeEmployment?.organizationId?._id || undefined,
            userId: user._id,
            action: 'LOGIN_OTP_SUCCESS',
            resource: 'Auth',
            details: { panel: panelDecision.panel },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        try {
            await LoginAudit.create({
                userId: String(user._id),
                panel: panelDecision.panel,
                organizationId: activeEmployment?.organizationId?._id ? String(activeEmployment.organizationId._id) : null,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        } catch (pgError) {
            console.error('LoginAudit PG write failed', pgError.message);
        }

        await OtpSession.deleteOne({ _id: session._id });

        res.json({
            accessToken,
            panel: panelDecision.panel,
            redirectPath: panelDecision.redirectPath,
            user: {
                id: user._id,
                email: user.email,
                mobile: user.mobile,
                profile: user.profile,
                professional: user.professional,
                preferences: user.preferences,
                isSuperAdmin: user.isSuperAdmin,
            },
            organization: activeEmployment?.organizationId ? {
                id: activeEmployment.organizationId._id,
                name: activeEmployment.organizationId.name,
                slug: activeEmployment.organizationId.slug,
                role: activeEmployment.roleId?.name || null,
            } : null,
        });
    } catch (error) {
        console.error('loginVerify error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Legacy one-call register endpoint (kept for compatibility)
exports.register = async (req, res) => {
    try {
        const { error } = legacyRegisterSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        const { firstName, lastName, email, password, isOwner, organizationName, organizationSlug } = req.body;

        const userExists = await User.findOne({ email: normalizeEmail(email) });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await hashPassword(password);
        const user = await User.create({
            email: normalizeEmail(email),
            passwordHash: hashedPassword,
            profile: {
                firstName,
                middleName: '',
                surname: lastName,
                lastName,
            },
            isSuperAdmin: false,
        });

        let organization = null;
        if (isOwner) {
            const slug = await uniqueSlug(toSlug(organizationSlug));
            organization = await Organization.create({
                name: organizationName,
                slug,
                ownerId: user._id,
            });

            const ownerRole = await ensureOwnerRole(organization._id);
            await EmploymentState.create({
                userId: user._id,
                organizationId: organization._id,
                roleId: ownerRole._id,
                status: 'ACTIVE',
                designation: 'Owner',
                joinedAt: new Date(),
            });
        }

        const { accessToken, refreshToken } = await issueLoginTokens({ user });
        setRefreshCookie(res, refreshToken);

        res.status(201).json({
            accessToken,
            user: {
                id: user._id,
                email: user.email,
                profile: user.profile,
            },
            organization: organization ? { id: organization._id, name: organization.name } : null,
        });
    } catch (error) {
        console.error('register error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Legacy one-call login endpoint (kept for compatibility)
exports.login = async (req, res) => {
    try {
        const { error, value } = legacyLoginSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const user = await User.findOne({ email: normalizeEmail(value.email) }).select('+passwordHash +security.refreshTokenVersion');
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await comparePassword(value.password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const { accessToken, refreshToken } = await issueLoginTokens({ user });
        setRefreshCookie(res, refreshToken);

        await sendLoginNotification({
            userId: user._id,
            organizationId: user.employment?.currentOrganizationId || null,
            panel: user.isSuperAdmin ? 'SUPERADMIN' : 'USER',
        });

        res.json({
            accessToken,
            user: {
                id: user._id,
                email: user.email,
                profile: user.profile,
                professional: user.professional,
                preferences: user.preferences,
                isSuperAdmin: user.isSuperAdmin,
            },
        });
    } catch (error) {
        console.error('login error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.refresh = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    try {
        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id).select('+security.refreshTokenVersion');

        if (!user || user.security.refreshTokenVersion !== decoded.version) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        const accessToken = signAccessToken({ id: user._id });
        res.json({ accessToken });
    } catch (error) {
        res.status(401).json({ message: 'Token failed' });
    }
};

exports.logout = (req, res) => {
    res.cookie('refreshToken', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.json({ message: 'Logged out' });
};

exports.getOrganizations = async (req, res) => {
    try {
        const employments = await EmploymentState.find({
            userId: req.user.id,
            status: { $in: ['ACTIVE', 'INVITED'] },
        }).populate('organizationId', 'name slug platformStatus').populate('roleId', 'name');

        res.json({
            organizations: employments.map((item) => ({
                employmentId: item._id,
                organizationId: item.organizationId?._id,
                organizationName: item.organizationId?.name,
                organizationSlug: item.organizationId?.slug,
                platformStatus: item.organizationId?.platformStatus,
                role: item.roleId?.name,
                status: item.status,
            })),
        });
    } catch (error) {
        console.error('Auth getOrganizations error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.switchOrganization = async (req, res) => {
    const { organizationId } = req.body;
    if (!organizationId) return res.status(400).json({ message: 'organizationId is required' });

    try {
        let roleName = null;
        const employment = await EmploymentState.findOne({
            userId: req.user.id,
            organizationId,
            status: 'ACTIVE',
        }).populate('roleId', 'name');

        if (employment) {
            roleName = employment.roleId?.name || null;
        } else if (!req.user.isSuperAdmin) {
            return res.status(403).json({ message: 'You do not have active access to this organization' });
        } else {
            roleName = 'SuperAdmin';
        }

        await User.findByIdAndUpdate(req.user.id, {
            $set: {
                'employment.status': 'ACTIVE',
                'employment.currentOrganizationId': organizationId,
            },
        });

        await AuditLog.create({
            organizationId,
            userId: req.user.id,
            action: 'SWITCH_ORGANIZATION',
            resource: 'Organization',
            resourceId: String(organizationId),
            details: { roleName },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        await sendLoginNotification({
            userId: req.user.id,
            organizationId,
            panel: roleName || 'USER',
        });

        const accessToken = signAccessToken({
            id: req.user.id,
            organizationId,
            role: roleName,
        });

        res.json({
            accessToken,
            organizationId,
            role: roleName,
        });
    } catch (error) {
        console.error('Auth switchOrganization error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
