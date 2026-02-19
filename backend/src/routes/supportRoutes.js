const express = require('express');
const { raiseTicket, getMyTickets } = require('../controllers/supportController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(protect);

router.post('/tickets', raiseTicket);
router.get('/tickets', getMyTickets);

module.exports = router;
