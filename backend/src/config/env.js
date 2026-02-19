const dotenv = require('dotenv');
const joi = require('joi');

dotenv.config();

const envSchema = joi.object({
    PORT: joi.number().default(5000),
    NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),

    MONGO_URI: joi.string().required(),

    PG_USER: joi.string().required(),
    PG_HOST: joi.string().required(),
    PG_DATABASE: joi.string().required(),
    PG_PASSWORD: joi.string().required(),
    PG_PORT: joi.number().default(5432),
    STRUCTURED_SYNC_ON_BOOT: joi.boolean().default(true),

    JWT_SECRET: joi.string().required(),
    JWT_EXPIRES_IN: joi.string().default('15m'),
    REFRESH_TOKEN_SECRET: joi.string().required(),
    REFRESH_TOKEN_EXPIRES_IN: joi.string().default('7d'),
}).unknown().required();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    mongo: {
        uri: envVars.MONGO_URI,
    },
    postgres: {
        user: envVars.PG_USER,
        host: envVars.PG_HOST,
        database: envVars.PG_DATABASE,
        password: envVars.PG_PASSWORD,
        port: envVars.PG_PORT,
    },
    structuredSyncOnBoot: envVars.STRUCTURED_SYNC_ON_BOOT,
    jwt: {
        secret: envVars.JWT_SECRET,
        expiresIn: envVars.JWT_EXPIRES_IN,
        refreshSecret: envVars.REFRESH_TOKEN_SECRET,
        refreshExpiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN,
    },
};
