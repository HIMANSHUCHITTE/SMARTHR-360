const Settings = require('../models/Settings');

// @desc    Get Global Settings
// @route   GET /api/settings
// @access  Public (or semi-private)
exports.getSettings = async (req, res) => {
    try {
        const settings = await Settings.find();
        // Convert array to object
        const config = {};
        settings.forEach(s => config[s.key] = s.value);
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update Global Settings
// @route   PATCH /api/settings
// @access  SuperAdmin
exports.updateSettings = async (req, res) => {
    const { key, value } = req.body;
    try {
        const setting = await Settings.findOneAndUpdate(
            { key },
            { value },
            { new: true, upsert: true }
        );
        res.json(setting);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
