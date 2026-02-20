const PayrollRecord = require('../models/postgres/PayrollRecord');
const EmploymentState = require('../models/EmploymentState');
const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const sumObjectValues = (obj) => Object.values(obj || {}).reduce((sum, value) => sum + toNumber(value), 0);

// @desc    Get Payroll Records for Org
// @route   GET /api/payroll
// @access  Owner, Admin
exports.getPayrollRecords = async (req, res) => {
    try {
        const payrolls = await PayrollRecord.findAll({
            where: { organizationId: req.organizationId.toString() },
            order: [['createdAt', 'DESC']]
        });
        res.json(payrolls);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get My Payroll Summary
// @route   GET /api/payroll/me
// @access  Any authenticated org member
exports.getMyPayrollSummary = async (req, res) => {
    try {
        const employment = await EmploymentState.findOne({
            userId: req.user._id,
            organizationId: req.organizationId,
            status: { $in: ['ACTIVE', 'SUSPENDED', 'INVITED'] },
        })
            .select('_id status designation department')
            .lean();

        if (!employment) {
            return res.status(404).json({ message: 'Employment not found for selected organization' });
        }

        const rows = await PayrollRecord.findAll({
            where: {
                organizationId: String(req.organizationId),
                employeeId: String(employment._id),
            },
            order: [['periodEnd', 'DESC']],
            limit: 6,
        });
        const payroll = rows.map((row) => (typeof row.get === 'function' ? row.get({ plain: true }) : row));
        const latest = payroll[0] || null;

        const basicSalary = latest ? toNumber(latest.basicSalary) : 0;
        const allowanceTotal = latest ? sumObjectValues(latest.allowances) : 0;
        const deductionTotal = latest ? sumObjectValues(latest.deductions) : 0;
        const netPayable = latest ? toNumber(latest.netPayable) : 0;

        const history = payroll
            .slice()
            .reverse()
            .map((item) => ({
                periodEnd: item.periodEnd,
                netPayable: toNumber(item.netPayable),
                status: item.status,
            }));

        return res.json({
            employment: {
                id: String(employment._id),
                status: employment.status,
                designation: employment.designation || '',
                department: employment.department || '',
            },
            latestPayroll: latest ? {
                id: latest.id,
                periodStart: latest.periodStart,
                periodEnd: latest.periodEnd,
                status: latest.status,
                basicSalary,
                allowanceTotal,
                deductionTotal,
                netPayable,
            } : null,
            salaryBreakdown: {
                basicSalary,
                allowanceTotal,
                deductionTotal,
                netPayable,
            },
            history,
        });
    } catch (error) {
        console.error('getMyPayrollSummary error', error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Run Payroll (Create draft records for all active employees)
// @route   POST /api/payroll/run
// @access  Owner, Admin
exports.runPayroll = async (req, res) => {
    const { periodStart, periodEnd } = req.body;

    try {
        // 1. Get all active employees in Mongo
        const employees = await EmploymentState.find({
            organizationId: req.organizationId,
            status: 'ACTIVE'
        });

        if (employees.length === 0) {
            return res.status(400).json({ message: 'No active employees found' });
        }

        const records = [];

        // 2. Calculate Payroll for each (Simplified logic)
        for (const emp of employees) {
            // Assume salary stored in EmploymentState (need to add it) or fetch from another collection
            // For MVP, randomize or use fixed base
            const basicSalary = 5000; // Placeholder
            const allowances = { housing: 1000, transport: 500 };
            const deductions = { tax: 500 };
            const netPayable = basicSalary + 1000 + 500 - 500;

            records.push({
                organizationId: req.organizationId.toString(),
                employeeId: emp._id.toString(),
                periodStart,
                periodEnd,
                basicSalary,
                allowances,
                deductions,
                netPayable,
                status: 'DRAFT'
            });
        }

        // 3. Bulk Insert into Postgres
        const createdRecords = await PayrollRecord.bulkCreate(records);

        res.status(201).json({ message: `Payroll run for ${createdRecords.length} employees`, records: createdRecords });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
