const express = require('express');
const router = express.Router();
const { getDashboardStats, triggerSeeding } = require('../controllers/dashboardController');
const { getEmailLogs } = require('../services/emailService');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/stats', protect, authorizeRoles('LIBRARIAN'), getDashboardStats);
router.post('/seed', protect, authorizeRoles('LIBRARIAN'), triggerSeeding);
router.get('/emails', protect, authorizeRoles('LIBRARIAN'), (req, res) => {
  res.status(200).json({ success: true, data: getEmailLogs() });
});

module.exports = router;
