const app = require('./src/app');
const config = require('./src/config/env');
const { connectMongo, connectPostgres } = require('./src/config/db');
const { ensureSuperAdmin } = require('./src/services/bootstrapService');
const { syncStructuredCollections } = require('./src/services/structuredDataSyncService');

const host = process.env.HOST || '0.0.0.0';

const startServer = async () => {
    try {
        // 1. Connect Databases
        await connectMongo();
        await connectPostgres();

        if (config.structuredSyncOnBoot) {
            const syncSummary = await syncStructuredCollections();
            console.log('Structured sync completed:', syncSummary.map((x) => `${x.entity}:${x.processed}`).join(', '));
        }

        // 2. Start Express Server
        app.listen(config.port, host, () => {
            console.log(`Server running in ${config.env} mode on http://${host}:${config.port}`);
        });

    } catch (error) {
        console.error('Server failed to start:', error);
        process.exit(1);
    }
};

startServer();
