const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const StructuredEntity = sequelize.define('StructuredEntity', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    entity: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    sourceId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    data: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    },
    sourceCreatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    sourceUpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'structured_entities',
    indexes: [
        { unique: true, fields: ['entity', 'sourceId'] },
        { fields: ['entity'] },
        { fields: ['sourceUpdatedAt'] },
    ],
});

module.exports = StructuredEntity;

