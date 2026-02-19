const express = require('express');
const { createPost, getFeed } = require('../controllers/postController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createPost);
router.get('/', getFeed);

module.exports = router;
