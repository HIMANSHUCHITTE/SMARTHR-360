const PayrollRecord = require('../models/postgres/PayrollRecord');
const EmploymentState = require('../models/EmploymentState');

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
