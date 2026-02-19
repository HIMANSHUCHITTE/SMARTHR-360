const { Client } = require('pg');
require('dotenv').config();

const config = {
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: 'postgres', // Connect to default 'postgres' db first
};

const targetDb = process.env.PG_DATABASE || 'SMARTHR-360';

const initDb = async () => {
    const client = new Client(config);

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL (default db)');

        // Check if database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${targetDb}'`);

        if (res.rowCount === 0) {
            console.log(`Database ${targetDb} does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${targetDb}"`);
            console.log(`✅ Database ${targetDb} created successfully!`);
        } else {
            console.log(`ℹ️  Database ${targetDb} already exists.`);
        }

    } catch (err) {
        console.error('❌ Error initializing PostgreSQL:', err);
        process.exit(1);
    } finally {
        await client.end();
        process.exit(0);
    }
};

initDb();
