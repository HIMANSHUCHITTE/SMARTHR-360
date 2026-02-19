const SupportTicket = require('../models/SupportTicket');

exports.raiseTicket = async (req, res) => {
    try {
        const { subject, description, priority } = req.body;
        if (!subject || !description) {
            return res.status(400).json({ message: 'subject and description are required' });
        }

        const ticket = await SupportTicket.create({
            organizationId: req.organizationId || null,
            createdBy: req.user._id,
            subject,
            description,
            priority: priority || 'MEDIUM',
            status: 'OPEN',
        });

        res.status(201).json(ticket);
    } catch (error) {
        console.error('Support raiseTicket error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket.find({
            $or: [
                { createdBy: req.user._id },
                ...(req.organizationId ? [{ organizationId: req.organizationId }] : []),
            ],
        }).sort('-createdAt');

        res.json(tickets);
    } catch (error) {
        console.error('Support getMyTickets error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
