const {
    queueUpsertStructuredEntity,
    queueDeleteStructuredEntity,
} = require('../../services/structuredMirrorService');

const attachStructuredMirror = (entity) => (schema) => {
    schema.post('save', function postSave(doc) {
        queueUpsertStructuredEntity(entity, doc);
    });

    schema.post('findOneAndUpdate', function postFindOneAndUpdate(doc) {
        if (!doc) return;
        queueUpsertStructuredEntity(entity, doc);
    });

    schema.post('findOneAndDelete', function postFindOneAndDelete(doc) {
        if (!doc?._id) return;
        queueDeleteStructuredEntity(entity, doc._id);
    });

    schema.post('deleteOne', { document: true, query: false }, function postDeleteOne() {
        queueDeleteStructuredEntity(entity, this._id);
    });
};

module.exports = attachStructuredMirror;

