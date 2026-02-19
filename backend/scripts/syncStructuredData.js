const config = require('../src/config/env');
const { connectMongo, connectPostgres, sequelize } = require('../src/config/db');
require('../src/models/postgres/StructuredEntity');
const { syncStructuredCollections } = require('../src/services/structuredDataSyncService');

const run = async () => {
    try {
        await connectMongo();
        await connectPostgres();
        await sequelize.sync({ alter: true });

        const summary = await syncStructuredCollections();
        console.log('Structured data sync complete');
        summary.forEach((item) => {
            console.log(`- ${item.entity}: ${item.processed}`);
        });
        process.exit(0);
    } catch (error) {
        console.error('Structured data sync failed', error);
        process.exit(1);
    }
};

run();

