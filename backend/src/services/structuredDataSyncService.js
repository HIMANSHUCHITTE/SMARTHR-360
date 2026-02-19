const StructuredEntity = require('../models/postgres/StructuredEntity');
const { normalizeDocument } = require('./structuredMirrorService');

const structuredModelRegistry = [
    { entity: 'User', model: require('../models/User') },
    { entity: 'Organization', model: require('../models/Organization') },
    { entity: 'Role', model: require('../models/Role') },
    { entity: 'EmploymentState', model: require('../models/EmploymentState') },
    { entity: 'JobPosting', model: require('../models/JobPosting') },
    { entity: 'Application', model: require('../models/Application') },
    { entity: 'Attendance', model: require('../models/Attendance') },
    { entity: 'Leave', model: require('../models/Leave') },
    { entity: 'Notification', model: require('../models/Notification') },
    { entity: 'PaymentTransaction', model: require('../models/PaymentTransaction') },
    { entity: 'Settings', model: require('../models/Settings') },
    { entity: 'SupportTicket', model: require('../models/SupportTicket') },
    { entity: 'WorkHistory', model: require('../models/WorkHistory') },
    { entity: 'AuditLog', model: require('../models/AuditLog') },
    { entity: 'Announcement', model: require('../models/Announcement') },
    { entity: 'Connection', model: require('../models/Connection') },
];

const BATCH_SIZE = 500;

const syncModelToStructuredStore = async ({ entity, model }) => {
    let processed = 0;
    let page = 0;

    while (true) {
        const rows = await model.find({})
            .skip(page * BATCH_SIZE)
            .limit(BATCH_SIZE)
            .lean();

        if (!rows.length) break;

        const batch = rows
            .map((row) => normalizeDocument(row))
            .filter((row) => row?.sourceId)
            .map((row) => ({
                entity,
                sourceId: row.sourceId,
                data: row.data,
                sourceCreatedAt: row.sourceCreatedAt,
                sourceUpdatedAt: row.sourceUpdatedAt,
            }));

        if (batch.length) {
            await StructuredEntity.bulkCreate(batch, {
                updateOnDuplicate: ['data', 'sourceCreatedAt', 'sourceUpdatedAt', 'updatedAt'],
            });
            processed += batch.length;
        }

        page += 1;
    }

    return processed;
};

const syncStructuredCollections = async () => {
    const summary = [];
    for (const entry of structuredModelRegistry) {
        const processed = await syncModelToStructuredStore(entry);
        summary.push({ entity: entry.entity, processed });
    }
    return summary;
};

module.exports = {
    syncStructuredCollections,
    structuredModelRegistry,
};

