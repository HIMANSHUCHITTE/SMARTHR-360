const express = require('express');
const {
    getFeed,
    createPost,
    toggleLikePost,
    addComment,
    getSuggestions,
    searchPeople,
    getConnections,
    sendConnectionRequest,
} = require('../controllers/networkController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/feed', getFeed);
router.post('/posts', createPost);
router.post('/posts/:postId/like', toggleLikePost);
router.post('/posts/:postId/comment', addComment);
router.get('/suggestions', getSuggestions);
router.get('/search', searchPeople);
router.get('/connections', getConnections);
router.post('/connect/:userId', sendConnectionRequest);

module.exports = router;
