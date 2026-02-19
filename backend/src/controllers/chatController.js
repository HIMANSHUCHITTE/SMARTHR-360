const Message = require('../models/Message');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

const conversationUserSelect = 'email profile.firstName profile.surname profile.lastName';
const MAX_CONVERSATIONS = 80;

exports.getConversations = async (req, res) => {
    try {
        const rows = await Message.aggregate([
            {
                $match: {
                    $or: [{ senderId: req.user._id }, { recipientId: req.user._id }],
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    text: 1,
                    createdAt: 1,
                    peerId: {
                        $cond: [{ $eq: ['$senderId', req.user._id] }, '$recipientId', '$senderId'],
                    },
                },
            },
            {
                $group: {
                    _id: '$peerId',
                    lastMessage: { $first: '$text' },
                    lastAt: { $first: '$createdAt' },
                },
            },
            { $sort: { lastAt: -1 } },
            { $limit: MAX_CONVERSATIONS },
        ]);

        if (!rows.length) {
            return res.json([]);
        }

        const peerIds = rows.map((row) => row._id);
        const users = await User.find({ _id: { $in: peerIds } })
            .select(conversationUserSelect)
            .lean();

        const userMap = new Map(users.map((user) => [String(user._id), user]));
        const conversations = rows
            .map((row) => ({
                user: userMap.get(String(row._id)),
                lastMessage: row.lastMessage,
                lastAt: row.lastAt,
            }))
            .filter((row) => Boolean(row.user));

        res.json(conversations);
    } catch (error) {
        console.error('Chat getConversations error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getThread = async (req, res) => {
    try {
        const peerId = req.params.userId;
        const messages = await Message.find({
            $or: [
                { senderId: req.user._id, recipientId: peerId },
                { senderId: peerId, recipientId: req.user._id },
            ],
        })
            .sort('createdAt')
            .limit(200)
            .populate('senderId', conversationUserSelect)
            .populate('recipientId', conversationUserSelect)
            .lean();

        await Message.updateMany(
            { senderId: peerId, recipientId: req.user._id, readAt: null },
            { $set: { readAt: new Date() } }
        );

        res.json(messages);
    } catch (error) {
        console.error('Chat getThread error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const peerId = req.params.userId;
        const text = String(req.body.text || '').trim();
        if (!text) return res.status(400).json({ message: 'Message text is required' });

        const peer = await User.findById(peerId).select('_id').lean();
        if (!peer) return res.status(404).json({ message: 'Recipient not found' });

        const message = await Message.create({
            senderId: req.user._id,
            recipientId: peerId,
            text,
        });

        if (String(peerId) !== String(req.user._id)) {
            try {
                await notificationService.send(peerId, {
                    type: 'INFO',
                    title: 'New message',
                    message: 'You have received a new chat message.',
                });
            } catch (error) {
                console.error('Chat sendMessage notification error', error?.message || error);
            }
        }

        await Promise.all([
            message.populate('senderId', conversationUserSelect),
            message.populate('recipientId', conversationUserSelect),
        ]);
        res.status(201).json(message);
    } catch (error) {
        console.error('Chat sendMessage error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
