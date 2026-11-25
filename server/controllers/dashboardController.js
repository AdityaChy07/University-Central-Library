const mongoose = require('mongoose');
const Book = require('../models/Book');
const Member = require('../models/Member');
const Author = require('../models/Author');
const BorrowRecord = require('../models/BorrowRecord');
const mockDb = require('../services/mockDbService');
const { calculateFine } = require('../utils/dateUtils');
const { getEmailLogs } = require('../services/emailService');
const { seedDatabase } = require('../utils/seedData');

/**
 * Trigger Database Seeding from Admin UI
 * POST /api/dashboard/seed
 */
const triggerSeeding = async (req, res) => {
  try {
    const result = await seedDatabase();
    res.status(200).json({
      success: true,
      message: 'Demo dataset seeded successfully into MongoDB and synchronized with Neo4j.',
      data: result,
    });
  } catch (error) {
    console.error('Error during API seeding:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Dashboard Totals and KPI Statistics
 * GET /api/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        data: mockDb.getDashboardStats(),
      });
    }

    const now = new Date();

    // 1. Total counts
    const totalBooks = await Book.countDocuments();
    const totalAuthors = await Author.countDocuments();
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ active: true });

    // 2. Physical & available copies
    const copyAgg = await Book.aggregate([
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          totalAvailable: { $sum: '$availableCopies' },
        },
      },
    ]);
    const totalPhysicalCopies = copyAgg[0]?.totalQuantity || 0;
    const totalAvailableCopies = copyAgg[0]?.totalAvailable || 0;

    // 3. Borrow stats
    const totalLoansAllTime = await BorrowRecord.countDocuments();
    const activeLoans = await BorrowRecord.countDocuments({ status: 'ISSUED' });
    const returnedLoans = await BorrowRecord.countDocuments({ status: 'RETURNED' });

    // 4. Overdue records & fines
    const overdueRecords = await BorrowRecord.find({
      status: 'ISSUED',
      dueDate: { $lt: now },
    });
    const overdueBooks = overdueRecords.length;

    // Outstanding fines
    const returnedFinesAgg = await BorrowRecord.aggregate([
      { $match: { finePaid: false, fineAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$fineAmount' } } },
    ]);
    const returnedUnpaidFines = returnedFinesAgg[0]?.total || 0;

    // Dynamic unreturned active fines
    const activeOverdueFineSum = overdueRecords.reduce((acc, r) => {
      const { fineAmount } = calculateFine(r.dueDate, now);
      return acc + fineAmount;
    }, 0);

    const outstandingFines = returnedUnpaidFines + activeOverdueFineSum;

    // Verified collected fines
    const collectedAgg = await BorrowRecord.aggregate([
      { $match: { finePaid: true, fineAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$fineAmount' } } },
    ]);
    const totalCollectedFines = collectedAgg[0]?.total || 0;

    // Pending payment verification count
    const pendingPaymentVerifications = await BorrowRecord.countDocuments({
      paymentStatus: 'PENDING_VERIFICATION',
    });

    // 5. Recent circulation activity
    const recentActivity = await BorrowRecord.find()
      .populate('memberId', 'name email memberId role')
      .populate('bookId', 'title isbn category')
      .sort({ createdAt: -1 })
      .limit(8);

    // 6. Category breakdown
    const categoryStats = await Book.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalCopies: { $sum: '$quantity' },
          availableCopies: { $sum: '$availableCopies' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    // 7. Recent Email Logs
    const recentEmails = getEmailLogs().slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBooks,
          totalAuthors,
          totalMembers,
          activeMembers,
          totalPhysicalCopies,
          totalAvailableCopies,
          totalLoansAllTime,
          currentlyIssuedBooks: activeLoans,
          overdueBooks,
          outstandingFines,
          totalCollectedFines,
          pendingPaymentVerifications,
        },
        recentActivity,
        categoryStats,
        recentEmails,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  triggerSeeding,
  getDashboardStats,
};
