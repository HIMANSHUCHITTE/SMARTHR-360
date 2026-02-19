const Message = require('../models/Message');
const User = require('../models/User');

const userSelect = 'profile professional email';

exports.getConversations = async (req, res) => {
    try {
        const myId = String(req.user._id);
        const messages = await Message.find({
            $or: [{ senderId: req.user._id }, { recipientId: req.user._id }],
        })
            .sort('-createdAt')
            .limit(500)
            .populate('senderId', userSelect)
            .populate('recipientId', userSelect);

        const map = new Map();
        messages.forEach((msg) => {
            const other = String(msg.senderId._id) === myId ? msg.recipientId : msg.senderId;
            const key = String(other._id);
            if (!map.has(key)) {
                map.set(key, {
                    user: other,
                    lastMessage: msg.text,
                    lastAt: msg.createdAt,
                });
            }
        });

        res.json(Array.from(map.values()));
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
            .populate('senderId', userSelect)
            .populate('recipientId', userSelect);

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

        const peer = await User.findById(peerId).select('_id');
        if (!peer) return res.status(404).json({ message: 'Recipient not found' });

        const message = await Message.create({
            senderId: req.user._id,
            recipientId: peerId,
            text,
        });

        await message.populate('senderId', userSelect);
        await message.populate('recipientId', userSelect);
        res.status(201).json(message);
    } catch (error) {
        console.error('Chat sendMessage error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
