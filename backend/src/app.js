const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const config = require('./config/env');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const roleRoutes = require('./routes/roleRoutes');
// const payrollRoutes = require('./routes/payrollRoutes');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = ['https://smarthr360.com'];
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
        const isLanIpv4 = /^http:\/\/(?:192\.168|10\.\d+|172\.(?:1[6-9]|2\d|3[0-1]))\.\d+\.\d+:\d+$/.test(origin);
        if (allowedOrigins.indexOf(origin) !== -1 || isLocalhost || isLanIpv4) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging Middleware
if (config.env === 'development') {
    app.use(morgan('dev'));
}

// Sync Postgres Models (Dev only)
const PayrollRecord = require('./models/postgres/PayrollRecord');
const LoginAudit = require('./models/postgres/LoginAudit');
const StructuredEntity = require('./models/postgres/StructuredEntity');
const { sequelize, mongoose } = require('./config/db');
sequelize.sync({ alter: true }).then(() => console.log('✅ Postgres Synced')).catch(err => console.log('❌ PG Sync Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/admin', adminRoutes);

// Tenant Routes (Protected by default in their files, but good to group)
app.use('/api/organization', organizationRoutes);
app.use('/api/organization/employees', employeeRoutes);

app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/recruitment', require('./routes/recruitmentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/network', require('./routes/networkRoutes'));
app.use('/api/advanced', require('./routes/advancedRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/owner', require('./routes/ownerRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.get('/health/db', async (req, res) => {
    const mongoConnected = mongoose.connection.readyState === 1;
    let postgresConnected = false;
    try {
        await sequelize.authenticate();
        postgresConnected = true;
    } catch {
        postgresConnected = false;
    }

    res.status(mongoConnected && postgresConnected ? 200 : 503).json({
        mongo: mongoConnected ? 'UP' : 'DOWN',
        postgres: postgresConnected ? 'UP' : 'DOWN',
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: err.message || 'Internal Server Error',
        stack: config.env === 'development' ? err.stack : undefined,
    });
});

module.exports = app;

