const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
const config = require('./env');

// MongoDB Connection
const connectMongo = async () => {
    try {
        await mongoose.connect(config.mongo.uri);
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// PostgreSQL Connection
const sequelize = new Sequelize(
    config.postgres.database,
    config.postgres.user,
    config.postgres.password,
    {
        host: config.postgres.host,
        port: config.postgres.port,
        dialect: 'postgres',
        logging: false, // Set to console.log to see SQL queries
    }
);

const connectPostgres = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connected');
    } catch (error) {
        console.error('❌ PostgreSQL connection error:', error);
        // Don't exit process if PG is secondary, or do based on requirement. 
        // For now, consistent failure handling.
        process.exit(1);
    }
};

module.exports = {
    connectMongo,
    connectPostgres,
    sequelize,
    mongoose,
};
