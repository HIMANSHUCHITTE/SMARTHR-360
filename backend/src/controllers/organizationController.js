const Organization = require('../models/Organization');
const { getOrganizationTemplate, isValidOrganizationType } = require('../constants/organizationTemplates');

// @desc    Get Current Organization Details
// @route   GET /api/organization
// @access  Private (Scoped to Tenant)
exports.getOrganization = async (req, res) => {
    try {
        if (!req.organizationId) {
            return res.status(400).json({ message: 'Organization context missing' });
        }

        const org = await Organization.findById(req.organizationId)
            .select('-subscription.schedules -__v');

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.json(org);
    } catch (error) {
        console.error('Get Org Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getOrganizationError = exports.getOrganization;

// @desc    Update Organization (Branding, Settings)
// @route   PATCH /api/organization
// @access  Private (Owner/Admin)
exports.updateOrganization = async (req, res) => {
    try {
        if (!req.organizationId) {
            return res.status(400).json({ message: 'Organization context missing' });
        }

        const { name, branding, modulesEnabled, hierarchyConfig, organizationType } = req.body;

        // Build update object
        let updateFields = {};
        if (name) updateFields.name = name;
        if (branding) updateFields['settings.branding'] = branding;
        if (modulesEnabled) updateFields['settings.modulesEnabled'] = modulesEnabled;
        if (hierarchyConfig) updateFields.hierarchyConfig = hierarchyConfig;

        if (organizationType) {
            if (!isValidOrganizationType(organizationType)) {
                return res.status(400).json({ message: 'Invalid organizationType' });
            }
            const org = await Organization.findById(req.organizationId).select('organizationType organizationTypeLocked');
            if (!org) {
                return res.status(404).json({ message: 'Organization not found' });
            }
            if (org.organizationTypeLocked && !req.user?.isSuperAdmin && organizationType !== org.organizationType) {
                return res.status(403).json({ message: 'Organization type is locked after approval' });
            }
            updateFields.organizationType = organizationType;
        }

        const org = await Organization.findByIdAndUpdate(
            req.organizationId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-subscription.schedules -__v');

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.json(org);
    } catch (error) {
        console.error('Update Org Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update Organization Subscription Plan
// @route   PATCH /api/organization/subscription
// @access  Private (Owner/Admin)
exports.updateOrganizationSubscription = async (req, res) => {
    try {
        if (!req.organizationId) {
            return res.status(400).json({ message: 'Organization context missing' });
        }

        const planId = String(req.body.planId || '').toUpperCase();
        if (!['FREE', 'PRO', 'ENTERPRISE'].includes(planId)) {
            return res.status(400).json({ message: 'Invalid planId' });
        }

        const planConfig = {
            FREE: { employeeLimit: 5, features: ['core_hrms'] },
            PRO: { employeeLimit: 50, features: ['core_hrms', 'payroll', 'recruitment', 'reputation'] },
            ENTERPRISE: { employeeLimit: 100000, features: ['core_hrms', 'payroll', 'recruitment', 'reputation', 'api_access'] },
        };

        const org = await Organization.findByIdAndUpdate(
            req.organizationId,
            {
                $set: {
                    'subscription.planId': planId,
                    'subscription.status': 'ACTIVE',
                    'subscription.employeeLimit': planConfig[planId].employeeLimit,
                    'subscription.features': planConfig[planId].features,
                },
            },
            { new: true, runValidators: true }
        ).select('-subscription.schedules -__v');

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.json(org);
    } catch (error) {
        console.error('Update Org Subscription Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get organization hierarchy templates and active settings
// @route   GET /api/organization/hierarchy
// @access  Private (Scoped to Tenant)
exports.getHierarchyConfig = async (req, res) => {
    try {
        if (!req.organizationId) {
            return res.status(400).json({ message: 'Organization context missing' });
        }

        const org = await Organization.findById(req.organizationId).select('organizationType hierarchyConfig');
        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.json({
            organizationType: org.organizationType,
            hierarchyConfig: org.hierarchyConfig,
        });
    } catch (error) {
        console.error('Get hierarchy config error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update hierarchy configuration (active template, custom levels, matrix toggle)
// @route   PATCH /api/organization/hierarchy
// @access  Private (Owner/Admin)
exports.updateHierarchyConfig = async (req, res) => {
    try {
        if (!req.organizationId) {
            return res.status(400).json({ message: 'Organization context missing' });
        }

        const org = await Organization.findById(req.organizationId);
        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        const {
            organizationType,
            activeTemplateType,
            customLevels,
            matrixReportingEnabled,
            visibilityPolicy,
            blockUpwardVisibility,
        } = req.body;

        if (organizationType && !isValidOrganizationType(organizationType)) {
            return res.status(400).json({ message: 'Invalid organizationType' });
        }

        if (organizationType) {
            if (org.organizationTypeLocked && !req.user?.isSuperAdmin && organizationType !== org.organizationType) {
                return res.status(403).json({ message: 'Organization type is locked after approval' });
            }
            org.organizationType = organizationType;
        }

        if (activeTemplateType) {
            const activeTemplate = org.hierarchyConfig.templates.find((x) => x.type === activeTemplateType)
                || getOrganizationTemplate(activeTemplateType);
            if (!activeTemplate) {
                return res.status(400).json({ message: 'Invalid activeTemplateType' });
            }
            org.hierarchyConfig.activeTemplateType = activeTemplateType;
            if (!Array.isArray(customLevels) || customLevels.length === 0) {
                org.hierarchyConfig.customLevels = [...activeTemplate.levels];
            }
        }

        if (Array.isArray(customLevels)) {
            const normalized = customLevels
                .map((item) => String(item || '').trim())
                .filter(Boolean);
            if (normalized.length === 0) {
                return res.status(400).json({ message: 'customLevels cannot be empty' });
            }
            org.hierarchyConfig.customLevels = normalized;
        }

        if (typeof matrixReportingEnabled === 'boolean') {
            org.hierarchyConfig.matrixReportingEnabled = matrixReportingEnabled;
        }
        if (visibilityPolicy) {
            org.hierarchyConfig.visibilityPolicy = visibilityPolicy;
        }
        if (typeof blockUpwardVisibility === 'boolean') {
            org.hierarchyConfig.blockUpwardVisibility = blockUpwardVisibility;
        }

        await org.save();
        res.json({
            organizationType: org.organizationType,
            hierarchyConfig: org.hierarchyConfig,
        });
    } catch (error) {
        console.error('Update hierarchy config error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
