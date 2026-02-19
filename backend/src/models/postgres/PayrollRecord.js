const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const PayrollRecord = sequelize.define('PayrollRecord', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    organizationId: {
        type: DataTypes.STRING, // Storing Mongo ObjectId as String for now, or UUID if we migrate Org to PG
        allowNull: false,
    },
    employeeId: {
        type: DataTypes.STRING, // Storing Mongo ObjectId (EmploymentState ID)
        allowNull: false,
    },
    periodStart: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    periodEnd: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    basicSalary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    allowances: {
        type: DataTypes.JSONB,
        defaultValue: {},
    },
    deductions: {
        type: DataTypes.JSONB,
        defaultValue: {},
    },
    netPayable: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'PROCESSED', 'PAID'),
        defaultValue: 'DRAFT',
    },
}, {
    tableName: 'payroll_records',
    timestamps: true,
});

// Sync model with DB (For dev/MVP - usually done via migrations)
// sequelize.sync(); 

module.exports = PayrollRecord;
