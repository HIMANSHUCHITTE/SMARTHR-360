const express = require('express');
const { getConversations, getThread, sendMessage } = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/conversations', getConversations);
router.get('/thread/:userId', getThread);
router.post('/thread/:userId', sendMessage);

module.exports = router;
