const StructuredEntity = require('../models/postgres/StructuredEntity');

const toPlainValue = (value) => {
    if (value === null || typeof value === 'undefined') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(toPlainValue);
    if (typeof value === 'object') {
        // Mongoose ObjectId support and non-plain object support
        if (typeof value.toHexString === 'function') return value.toHexString();
        if (typeof value.toString === 'function' && value.constructor?.name === 'ObjectId') {
            return value.toString();
        }

        const src = typeof value.toObject === 'function'
            ? value.toObject({ depopulate: true, getters: false, virtuals: false })
            : value;

        const out = {};
        Object.keys(src).forEach((key) => {
            out[key] = toPlainValue(src[key]);
        });
        return out;
    }
    return value;
};

const normalizeDocument = (doc) => {
    if (!doc) return null;
    const plain = toPlainValue(doc);
    if (!plain || typeof plain !== 'object') return null;

    const sourceId = plain._id ? String(plain._id) : null;
    const sourceCreatedAt = plain.createdAt ? new Date(plain.createdAt) : null;
    const sourceUpdatedAt = plain.updatedAt ? new Date(plain.updatedAt) : null;

    return {
        sourceId,
        sourceCreatedAt: sourceCreatedAt && !Number.isNaN(sourceCreatedAt.getTime()) ? sourceCreatedAt : null,
        sourceUpdatedAt: sourceUpdatedAt && !Number.isNaN(sourceUpdatedAt.getTime()) ? sourceUpdatedAt : null,
        data: plain,
    };
};

const upsertStructuredEntity = async (entity, doc) => {
    const normalized = normalizeDocument(doc);
    if (!normalized?.sourceId) return;

    await StructuredEntity.upsert({
        entity,
        sourceId: normalized.sourceId,
        data: normalized.data,
        sourceCreatedAt: normalized.sourceCreatedAt,
        sourceUpdatedAt: normalized.sourceUpdatedAt,
    });
};

const deleteStructuredEntity = async (entity, sourceId) => {
    if (!sourceId) return;
    await StructuredEntity.destroy({
        where: {
            entity,
            sourceId: String(sourceId),
        },
    });
};

const queueUpsertStructuredEntity = (entity, doc) => {
    setImmediate(() => {
        upsertStructuredEntity(entity, doc).catch((error) => {
            console.error(`Structured mirror upsert failed for ${entity}`, error.message);
        });
    });
};

const queueDeleteStructuredEntity = (entity, sourceId) => {
    setImmediate(() => {
        deleteStructuredEntity(entity, sourceId).catch((error) => {
            console.error(`Structured mirror delete failed for ${entity}`, error.message);
        });
    });
};

module.exports = {
    upsertStructuredEntity,
    deleteStructuredEntity,
    queueUpsertStructuredEntity,
    queueDeleteStructuredEntity,
    normalizeDocument,
};

