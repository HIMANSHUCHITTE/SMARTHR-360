const mongoose = require('mongoose');
const attachStructuredMirror = require('./plugins/attachStructuredMirror');

const settingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true, // e.g., 'MAINTENANCE_MODE', 'ALLOWED_DOMAINS'
    },
    value: mongoose.Schema.Types.Mixed,
    description: String,
}, {
    timestamps: true,
});

settingsSchema.plugin(attachStructuredMirror('Settings'));

module.exports = mongoose.model('Settings', settingsSchema);

