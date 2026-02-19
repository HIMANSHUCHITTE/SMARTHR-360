const express = require('express');
const {
    getFeed,
    createPost,
    uploadFeedMedia: uploadFeedMediaHandler,
    toggleLikePost,
    toggleDislikePost,
    addComment,
    toggleFollowUser,
    getMyFollows,
    getSuggestions,
    searchPeople,
    getConnections,
    getConnectionRequests,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
} = require('../controllers/networkController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadFeedMedia: uploadFeedMediaMiddleware } = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.use(protect);

router.get('/feed', getFeed);
router.post('/upload-media', uploadFeedMediaMiddleware.single('file'), uploadFeedMediaHandler);
router.post('/posts', createPost);
router.post('/posts/:postId/like', toggleLikePost);
router.post('/posts/:postId/dislike', toggleDislikePost);
router.post('/posts/:postId/comment', addComment);
router.post('/follow/:userId', toggleFollowUser);
router.get('/follows', getMyFollows);
router.get('/suggestions', getSuggestions);
router.get('/search', searchPeople);
router.get('/connections', getConnections);
router.get('/requests', getConnectionRequests);
router.post('/connect/:userId', sendConnectionRequest);
router.post('/requests/:requestId/accept', acceptConnectionRequest);
router.post('/requests/:requestId/reject', rejectConnectionRequest);

module.exports = router;
