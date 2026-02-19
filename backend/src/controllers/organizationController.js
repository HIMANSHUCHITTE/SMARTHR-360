const Organization = require('../models/Organization');

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

        const { name, branding, modulesEnabled, hierarchyConfig } = req.body;

        // Build update object
        let updateFields = {};
        if (name) updateFields.name = name;
        if (branding) updateFields['settings.branding'] = branding;
        if (modulesEnabled) updateFields['settings.modulesEnabled'] = modulesEnabled;
        if (hierarchyConfig) updateFields.hierarchyConfig = hierarchyConfig;

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
