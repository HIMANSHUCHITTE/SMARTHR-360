const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const LoginAudit = sequelize.define('LoginAudit', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    panel: { type: DataTypes.STRING, allowNull: false },
    organizationId: { type: DataTypes.STRING, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.STRING(1024), allowNull: true },
}, {
    tableName: 'login_audits',
    timestamps: true,
});

module.exports = LoginAudit;
