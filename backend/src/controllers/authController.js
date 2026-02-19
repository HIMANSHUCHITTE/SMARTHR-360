const Joi = require('joi');
const User = require('../models/User');
const EmploymentState = require('../models/EmploymentState');
const AuditLog = require('../models/AuditLog');
const OtpSession = require('../models/OtpSession');
const OrganizationRequest = require('../models/OrganizationRequest');
const LoginAudit = require('../models/postgres/LoginAudit');
const notificationService = require('../services/notificationService');
const { hashPassword, comparePassword, signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/authUtils');
const {
    ORGANIZATION_TYPES,
    getOrganizationTemplates,
    isValidOrganizationType,
} = require('../constants/organizationTemplates');

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
    organizationType: Joi.string().valid(...Object.values(ORGANIZATION_TYPES)).optional(),
    organizationName: Joi.string().trim().min(2).max(120).optional(),
    industryType: Joi.string().trim().min(2).max(80).optional(),
    companySize: Joi.string().trim().min(1).max(40).optional(),
    description: Joi.string().trim().max(1200).allow('', null).optional(),
});

const legacyRegisterSchema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    isOwner: Joi.boolean().default(false),
    organizationName: Joi.string().when('isOwner', { is: true, then: Joi.required() }),
    organizationSlug: Joi.string().when('isOwner', { is: true, then: Joi.required() }),
    organizationType: Joi.string().valid(...Object.values(ORGANIZATION_TYPES)).optional(),
    industryType: Joi.string().trim().min(2).max(80).optional(),
    companySize: Joi.string().trim().min(1).max(40).optional(),
    description: Joi.string().trim().max(1200).allow('', null).optional(),
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

const organizationRequestSchema = Joi.object({
    organizationName: Joi.string().trim().min(2).max(120).required(),
    industryType: Joi.string().trim().min(2).max(80).required(),
    organizationType: Joi.string().valid(...Object.values(ORGANIZATION_TYPES)).required(),
    companySize: Joi.string().trim().min(1).max(40).required(),
    description: Joi.string().trim().max(1200).allow('', null).default(''),
});

const isProduction = process.env.NODE_ENV === 'production';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const makeSessionId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const setRefreshCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

const getPanelDecision = ({ isSuperAdmin, employment, ownerRequest }) => {
    if (isSuperAdmin) {
        return { panel: 'SUPERADMIN', redirectPath: '/superadmin/dashboard' };
    }

    if (!employment) {
        if (ownerRequest) {
            return { panel: 'OWNER', redirectPath: '/owner/dashboard' };
        }
        return { panel: 'USER', redirectPath: '/user/dashboard' };
    }

    const role = String(employment?.roleId?.name || '').trim().toLowerCase();
    if (role === 'owner') {
        return { panel: 'OWNER', redirectPath: '/owner/dashboard' };
    }

    return { panel: 'SUBADMIN', redirectPath: '/subadmin/dashboard' };
};

const getLatestOrganizationRequest = async (userId) => OrganizationRequest.findOne({
    requestedByUserId: userId,
}).sort('-createdAt');

const createOrganizationRequestForUser = async ({ userId, payload }) => {
    const pending = await OrganizationRequest.findOne({
        requestedByUserId: userId,
        status: 'PENDING',
    }).select('_id');
    if (pending) {
        throw new Error('You already have a pending organization request');
    }

    const latest = await getLatestOrganizationRequest(userId);
    const nextRevision = latest ? (latest.revision || 1) + 1 : 1;

    return OrganizationRequest.create({
        requestedByUserId: userId,
        organizationName: payload.organizationName,
        industryType: payload.industryType,
        organizationType: payload.organizationType,
        companySize: payload.companySize,
        description: payload.description || '',
        status: 'PENDING',
        revision: nextRevision,
    });
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

        let organizationRequest = null;
        if (value.purpose === 'OWNER') {
            if (!value.organizationName || !value.industryType || !value.companySize) {
                return res.status(400).json({
                    message: 'organizationName, industryType, and companySize are required for OWNER registration',
                });
            }

            const selectedOrgType = isValidOrganizationType(value.organizationType)
                ? value.organizationType
                : ORGANIZATION_TYPES.CORPORATE_IT;

            organizationRequest = await createOrganizationRequestForUser({
                userId: user._id,
                payload: {
                    organizationName: String(value.organizationName).trim(),
                    industryType: String(value.industryType).trim(),
                    organizationType: selectedOrgType,
                    companySize: String(value.companySize).trim(),
                    description: String(value.description || '').trim(),
                },
            });
            await notifySuperAdminsForOrganizationRequest(organizationRequest);
        }

        await OtpSession.deleteOne({ _id: session._id });

        res.status(201).json({
            message: 'Registration complete. Please login.',
            purpose: value.purpose,
            organizationRequest: organizationRequest ? {
                id: organizationRequest._id,
                status: organizationRequest.status,
                organizationType: organizationRequest.organizationType,
                organizationName: organizationRequest.organizationName,
            } : null,
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

        const latestOwnerRequest = activeEmployment
            ? null
            : await getLatestOrganizationRequest(user._id);

        const panelDecision = getPanelDecision({
            isSuperAdmin: user.isSuperAdmin,
            employment: activeEmployment,
            ownerRequest: latestOwnerRequest,
        });
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
            organizationRequestStatus: latestOwnerRequest ? {
                id: latestOwnerRequest._id,
                status: latestOwnerRequest.status,
                reason: latestOwnerRequest.decision?.reason || '',
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
        const { firstName, lastName, email, password, isOwner, organizationName } = req.body;
        const orgType = isValidOrganizationType(req.body.organizationType)
            ? req.body.organizationType
            : ORGANIZATION_TYPES.CORPORATE_IT;

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

        let organizationRequest = null;
        if (isOwner) {
            organizationRequest = await createOrganizationRequestForUser({
                userId: user._id,
                payload: {
                    organizationName: String(organizationName).trim(),
                    industryType: String(req.body.industryType || 'General').trim(),
                    organizationType: orgType,
                    companySize: String(req.body.companySize || '1-10').trim(),
                    description: String(req.body.description || '').trim(),
                },
            });
            await notifySuperAdminsForOrganizationRequest(organizationRequest);
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
            organizationRequest: organizationRequest ? {
                id: organizationRequest._id,
                status: organizationRequest.status,
            } : null,
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

        const activeEmployment = await EmploymentState.findOne({
            userId: user._id,
            status: 'ACTIVE',
        }).populate('roleId', 'name').select('organizationId roleId').lean();

        const payload = { id: user._id };
        if (activeEmployment?.organizationId) {
            payload.organizationId = activeEmployment.organizationId;
            payload.role = activeEmployment?.roleId?.name || null;
        }

        const accessToken = signAccessToken(payload);
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
        }).populate('organizationId', 'name slug platformStatus organizationType').populate('roleId', 'name');

        res.json({
            organizations: employments.map((item) => ({
                employmentId: item._id,
                organizationId: item.organizationId?._id,
                organizationName: item.organizationId?.name,
                organizationSlug: item.organizationId?.slug,
                platformStatus: item.organizationId?.platformStatus,
                organizationType: item.organizationId?.organizationType || null,
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

const notifySuperAdminsForOrganizationRequest = async (organizationRequest) => {
    try {
        const superAdmins = await User.find({ isSuperAdmin: true }).select('_id');
        if (!superAdmins.length) return;

        await Promise.all(superAdmins.map((admin) => notificationService.send(admin._id, {
            type: 'INFO',
            title: 'New organization request',
            message: `${organizationRequest.organizationName} is waiting for approval.`,
        })));
    } catch (error) {
        console.error('notifySuperAdminsForOrganizationRequest error', error?.message || error);
    }
};

exports.getMyOrganizationRequestState = async (req, res) => {
    try {
        const [activeEmployment, latestRequest] = await Promise.all([
            EmploymentState.findOne({
                userId: req.user.id,
                status: 'ACTIVE',
            }).populate('organizationId', 'name slug platformStatus organizationType organizationTypeLocked').populate('roleId', 'name'),
            getLatestOrganizationRequest(req.user.id),
        ]);

        if (activeEmployment?.organizationId) {
            return res.json({
                state: 'APPROVED',
                modulesUnlocked: true,
                organization: {
                    id: activeEmployment.organizationId._id,
                    name: activeEmployment.organizationId.name,
                    slug: activeEmployment.organizationId.slug,
                    platformStatus: activeEmployment.organizationId.platformStatus,
                    organizationType: activeEmployment.organizationId.organizationType,
                    organizationTypeLocked: Boolean(activeEmployment.organizationId.organizationTypeLocked),
                },
                role: activeEmployment.roleId?.name || null,
            });
        }

        if (!latestRequest) {
            return res.json({
                state: 'NO_REQUEST',
                modulesUnlocked: false,
                request: null,
            });
        }

        const mappedState = latestRequest.status === 'PENDING'
            ? 'PENDING'
            : latestRequest.status === 'REJECTED'
                ? 'REJECTED'
                : 'APPROVED';

        return res.json({
            state: mappedState,
            modulesUnlocked: false,
            request: {
                id: latestRequest._id,
                organizationName: latestRequest.organizationName,
                organizationType: latestRequest.organizationType,
                industryType: latestRequest.industryType,
                companySize: latestRequest.companySize,
                description: latestRequest.description,
                status: latestRequest.status,
                rejectionReason: latestRequest.decision?.reason || '',
                revision: latestRequest.revision,
                createdAt: latestRequest.createdAt,
            },
        });
    } catch (error) {
        console.error('Auth getMyOrganizationRequestState error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.submitOrganizationRequest = async (req, res) => {
    try {
        const { error, value } = organizationRequestSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const request = await createOrganizationRequestForUser({
            userId: req.user.id,
            payload: value,
        });
        await notifySuperAdminsForOrganizationRequest(request);

        res.status(201).json({
            message: 'Organization request submitted for SuperAdmin review',
            request,
        });
    } catch (error) {
        if (error.message && error.message.includes('pending organization request')) {
            return res.status(409).json({ message: error.message });
        }
        console.error('Auth submitOrganizationRequest error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getMyOrganizationRequests = async (req, res) => {
    try {
        const rows = await OrganizationRequest.find({
            requestedByUserId: req.user.id,
        })
            .sort('-createdAt')
            .limit(20)
            .lean();

        res.json({ requests: rows });
    } catch (error) {
        console.error('Auth getMyOrganizationRequests error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getOrganizationTypeTemplates = async (req, res) => {
    try {
        const seen = new Set();
        const organizationTypes = getOrganizationTemplates().filter((item) => {
            const key = String(item.name || '').toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        res.json({
            organizationTypes: organizationTypes.map((item) => ({
                type: item.type,
                name: item.name,
                levels: item.levels,
                reportingExample: item.reportingExample,
                departments: item.departments,
                roleBehavior: item.roleBehavior,
            })),
        });
    } catch (error) {
        console.error('Auth getOrganizationTypeTemplates error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
