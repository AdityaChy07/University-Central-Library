const express = require('express');
const router = express.Router();
const {
  issueBook,
  returnBook,
  getBorrowHistory,
  getOverdueLoans,
  sendOverdueReminderNow,
  payFine,
  verifyFinePayment,
} = require('../controllers/borrowController');
const { runOverdueEmailScan } = require('../jobs/overdueScheduler');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Issue and Return
router.post('/issue', protect, authorizeRoles('LIBRARIAN'), issueBook);
router.put('/return/:recordId', protect, authorizeRoles('LIBRARIAN'), returnBook);

// Fine Payment (Student / Teacher submit, Librarian verify & update)
router.post('/pay-fine/:recordId', protect, payFine);
router.put('/verify-payment/:recordId', protect, authorizeRoles('LIBRARIAN'), verifyFinePayment);

// History and Overdue
router.get('/', getBorrowHistory);
router.get('/overdue', getOverdueLoans);
router.post('/overdue/send-reminder/:recordId', protect, authorizeRoles('LIBRARIAN'), sendOverdueReminderNow);

// Manual trigger for testing/demo viva
router.post('/trigger-cron-scan', protect, authorizeRoles('LIBRARIAN'), async (req, res) => {
  const result = await runOverdueEmailScan();
  res.status(200).json(result);
});

module.exports = router;
