const Role = require('../models/Role');

const RESERVED_ROLE_NAMES = new Set(['owner', 'admin', 'superadmin']);

// @desc    Get all roles for current organization
// @route   GET /api/roles
// @access  Private (Admin/Owner)
exports.getRoles = async (req, res) => {
    try {
        const query = { $or: [{ isSystem: true }, { organizationId: req.organizationId }] };

        const roles = await Role.find(query);
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a new role
// @route   POST /api/roles
// @access  Private (Admin/Owner)
exports.createRole = async (req, res) => {
    try {
        const { name, permissions } = req.body;

        // Check format
        if (!name) return res.status(400).json({ message: 'Role name required' });
        if (RESERVED_ROLE_NAMES.has(String(name).trim().toLowerCase())) {
            return res.status(400).json({ message: `Role '${name}' is reserved and cannot be created manually` });
        }

        const role = await Role.create({
            name,
            permissions,
            organizationId: req.organizationId,
            isSystem: false
        });

        res.status(201).json(role);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private
exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ message: 'Role not found' });

        if (role.isSystem) {
            return res.status(400).json({ message: 'Cannot delete system role' });
        }

        await role.deleteOne();
        res.json({ message: 'Role removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
