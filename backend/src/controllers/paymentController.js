const Joi = require('joi');
const Organization = require('../models/Organization');
const PaymentTransaction = require('../models/PaymentTransaction');

const PLAN_PRICING = {
    FREE: { MONTHLY: 0, YEARLY: 0 },
    PRO: { MONTHLY: 49, YEARLY: 499 },
    ENTERPRISE: { MONTHLY: 199, YEARLY: 1999 },
};

const PLAN_CONFIG = {
    FREE: { employeeLimit: 5, features: ['core_hrms'] },
    PRO: { employeeLimit: 50, features: ['core_hrms', 'payroll', 'recruitment', 'reputation'] },
    ENTERPRISE: { employeeLimit: 100000, features: ['core_hrms', 'payroll', 'recruitment', 'reputation', 'api_access'] },
};

const checkoutSchema = Joi.object({
    planId: Joi.string().valid('FREE', 'PRO', 'ENTERPRISE').required(),
    billingCycle: Joi.string().valid('MONTHLY', 'YEARLY').default('MONTHLY'),
    cardHolder: Joi.string().allow('', null).default(''),
    cardNumber: Joi.string().allow('', null).default(''),
    expiryMonth: Joi.string().allow('', null).default(''),
    expiryYear: Joi.string().allow('', null).default(''),
    cvv: Joi.string().allow('', null).default(''),
});

const computeValidUntil = (cycle) => {
    const now = new Date();
    if (cycle === 'YEARLY') {
        return new Date(now.setFullYear(now.getFullYear() + 1));
    }
    return new Date(now.setMonth(now.getMonth() + 1));
};

const generateTxnRef = () => `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

exports.checkout = async (req, res) => {
    try {
        if (!req.organizationId) return res.status(400).json({ message: 'Organization context missing' });

        const { error, value } = checkoutSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const planId = String(value.planId).toUpperCase();
        const billingCycle = String(value.billingCycle || 'MONTHLY').toUpperCase();
        const amount = PLAN_PRICING[planId][billingCycle];
        const requiresCard = planId !== 'FREE';

        if (requiresCard) {
            if (!String(value.cardHolder).trim() || !String(value.cardNumber).trim() || !String(value.expiryMonth).trim() || !String(value.expiryYear).trim() || !String(value.cvv).trim()) {
                return res.status(400).json({ message: 'Card details are required for paid plans' });
            }
        }

        const org = await Organization.findById(req.organizationId);
        if (!org) return res.status(404).json({ message: 'Organization not found' });

        const transactionRef = generateTxnRef();
        const cardLast4 = String(value.cardNumber || '').replace(/\s/g, '').slice(-4);

        let txn = await PaymentTransaction.create({
            organizationId: req.organizationId,
            userId: req.user._id,
            planId,
            billingCycle,
            amount,
            currency: 'USD',
            paymentMethod: { cardHolder: value.cardHolder || '', cardLast4 },
            transactionRef,
            status: 'PENDING',
            metadata: { upgradeFrom: org.subscription?.planId || 'FREE' },
        });

        // Mock gateway success path.
        txn.status = 'SUCCESS';
        txn.paidAt = new Date();
        await txn.save();

        const planSettings = PLAN_CONFIG[planId];
        const validUntil = computeValidUntil(billingCycle);

        const updatedOrg = await Organization.findByIdAndUpdate(
            req.organizationId,
            {
                $set: {
                    'subscription.planId': planId,
                    'subscription.status': 'ACTIVE',
                    'subscription.employeeLimit': planSettings.employeeLimit,
                    'subscription.features': planSettings.features,
                    'subscription.validUntil': validUntil,
                },
            },
            { new: true }
        );

        res.status(201).json({
            message: `Payment successful. ${planId} plan activated.`,
            transaction: txn,
            organization: updatedOrg,
        });
    } catch (error) {
        console.error('Payment checkout error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        if (!req.organizationId) return res.status(400).json({ message: 'Organization context missing' });
        const rows = await PaymentTransaction.find({ organizationId: req.organizationId })
            .sort('-createdAt')
            .limit(50);
        res.json(rows);
    } catch (error) {
        console.error('Payment getHistory error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getPricing = (req, res) => {
    res.json({
        currency: 'USD',
        plans: PLAN_PRICING,
    });
};
