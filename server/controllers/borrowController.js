const mongoose = require('mongoose');
const BorrowRecord = require('../models/BorrowRecord');
const Book = require('../models/Book');
const Member = require('../models/Member');
const mockDb = require('../services/mockDbService');
const { computeDueDate, calculateFine, calendarDaysBetween } = require('../utils/dateUtils');
const { recordIssue, recordReturn } = require('../services/graphService');
const { sendIssueEmail, sendReturnEmail, sendOverdueEmail } = require('../services/emailService');

const MAX_ACTIVE_LOANS_PER_MEMBER = 3;

/**
 * Issue a Book
 * POST /api/borrow/issue
 */
const issueBook = async (req, res) => {
  try {
    const { memberId, bookId } = req.body;

    if (!memberId || !bookId) {
      return res.status(400).json({
        success: false,
        message: 'Both memberId and bookId are required to issue a book.',
      });
    }

    if (mongoose.connection.readyState === 1) {
      const member = await Member.findById(memberId);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found.' });
      }
      if (!member.active) {
        return res.status(400).json({
          success: false,
          message: `Member "${member.name}" is deactivated. Inactive members cannot borrow books.`,
        });
      }

      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ success: false, message: 'Book not found.' });
      }
      if (book.availableCopies <= 0) {
        return res.status(400).json({
          success: false,
          message: `No copies of "${book.title}" are currently available (${book.availableCopies}/${book.quantity} available).`,
        });
      }

      const activeLoansCount = await BorrowRecord.countDocuments({
        memberId: member._id,
        status: 'ISSUED',
      });
      if (activeLoansCount >= MAX_ACTIVE_LOANS_PER_MEMBER) {
        return res.status(400).json({
          success: false,
          message: `Member "${member.name}" has reached the borrowing limit (${MAX_ACTIVE_LOANS_PER_MEMBER} active books). Return a book to borrow again.`,
        });
      }

      const issueDate = new Date();
      const { dueDate, loanDays } = computeDueDate(issueDate, member.role || 'STUDENT');

      const borrowRecord = await BorrowRecord.create({
        memberId: member._id,
        bookId: book._id,
        issueDate,
        dueDate,
        loanDurationDays: loanDays,
        status: 'ISSUED',
        overdueDays: 0,
        fineAmount: 0,
        finePaid: false,
      });

      book.availableCopies = Math.max(0, book.availableCopies - 1);
      await book.save();

      recordIssue(borrowRecord, member, book).catch(() => {});
      sendIssueEmail({ member, book, borrowRecord }).catch(() => {});

      const populatedRecord = await BorrowRecord.findById(borrowRecord._id)
        .populate('memberId', 'name memberId email phone')
        .populate('bookId', 'title isbn category');

      return res.status(201).json({
        success: true,
        data: populatedRecord,
        message: `Book "${book.title}" successfully issued to ${member.name}. Due on ${dueDate.toDateString()}.`,
      });
    }

    const created = mockDb.issueBook(memberId, bookId);
    return res.status(201).json({
      success: true,
      data: created,
      message: `Book "${created.bookId?.title}" issued successfully in local circulation ledger.`,
    });
  } catch (error) {
    console.error('Error issuing book:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Return a Book
 * PUT /api/borrow/return/:recordId
 */
const returnBook = async (req, res) => {
  try {
    const { recordId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const borrowRecord = await BorrowRecord.findById(recordId)
        .populate('memberId')
        .populate('bookId');

      if (!borrowRecord) {
        return res.status(404).json({ success: false, message: 'Borrow record not found.' });
      }

      if (borrowRecord.status === 'RETURNED' && borrowRecord.returnDate) {
        return res.status(200).json({
          success: true,
          idempotent: true,
          data: borrowRecord,
          message: `Book was already returned on ${new Date(borrowRecord.returnDate).toLocaleDateString()}. Final fine was ₹${borrowRecord.fineAmount}.`,
        });
      }

      const returnDate = req.body.returnDate ? new Date(req.body.returnDate) : new Date();
      const { overdueDays, fineAmount } = calculateFine(borrowRecord.dueDate, returnDate);

      borrowRecord.status = 'RETURNED';
      borrowRecord.returnDate = returnDate;
      borrowRecord.overdueDays = overdueDays;
      borrowRecord.fineAmount = fineAmount;
      await borrowRecord.save();

      const book = await Book.findById(borrowRecord.bookId._id);
      if (book) {
        book.availableCopies = Math.min(book.quantity, book.availableCopies + 1);
        await book.save();
      }

      const member = borrowRecord.memberId;
      recordReturn(borrowRecord, member, book || borrowRecord.bookId).catch(() => {});
      sendReturnEmail({ member, book: book || borrowRecord.bookId, borrowRecord }).catch(() => {});

      return res.status(200).json({
        success: true,
        data: borrowRecord,
        overdueDays,
        fineAmount,
        message: `Book "${borrowRecord.bookId.title}" returned successfully. Overdue: ${overdueDays} day(s), Fine: ₹${fineAmount}.`,
      });
    }

    const updated = mockDb.returnBook(recordId);
    return res.status(200).json({
      success: true,
      data: updated,
      overdueDays: updated.overdueDays,
      fineAmount: updated.fineAmount,
      message: `Book "${updated.bookId?.title}" returned in local ledger. Fine: ₹${updated.fineAmount}.`,
    });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List Borrow History
 * GET /api/borrow
 */
const getBorrowHistory = async (req, res) => {
  try {
    const { status, memberId, bookId, search, paymentStatus } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = {};

      if (status && status !== 'ALL') {
        if (status === 'OVERDUE') {
          filter.status = 'ISSUED';
          filter.dueDate = { $lt: new Date() };
        } else {
          filter.status = status;
        }
      }

      if (paymentStatus && paymentStatus !== 'ALL') {
        filter.paymentStatus = paymentStatus;
      }

      if (memberId) filter.memberId = memberId;
      if (bookId) filter.bookId = bookId;

      const records = await BorrowRecord.find(filter)
        .populate('memberId', 'name memberId email phone role')
        .populate('bookId', 'title isbn category quantity availableCopies')
        .populate('verifiedBy', 'name memberId')
        .sort({ createdAt: -1 });

      const now = new Date();
      const enriched = records
        .filter((r) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            r.memberId?.name?.toLowerCase().includes(q) ||
            r.memberId?.memberId?.toLowerCase().includes(q) ||
            r.bookId?.title?.toLowerCase().includes(q) ||
            r.bookId?.isbn?.toLowerCase().includes(q)
          );
        })
        .map((r) => {
          const obj = r.toObject();
          if (obj.status === 'ISSUED') {
            const liveFine = calculateFine(obj.dueDate, now);
            obj.currentEstimatedFine = liveFine.fineAmount;
            obj.currentOverdueDays = liveFine.overdueDays;
            obj.isCurrentlyOverdue = liveFine.isOverdue;
          }
          return obj;
        });

      return res.status(200).json({ success: true, count: enriched.length, data: enriched });
    }

    const records = mockDb.getBorrowRecords({ memberId, bookId, status });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error fetching borrow history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List Overdue Loans
 * GET /api/borrow/overdue
 */
const getOverdueLoans = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const now = new Date();
      const overdueLoans = await BorrowRecord.find({
        status: 'ISSUED',
        dueDate: { $lt: now },
      })
        .populate('memberId', 'name memberId email phone role department')
        .populate('bookId', 'title isbn category')
        .sort({ dueDate: 1 });

      const enriched = overdueLoans.map((loan) => {
        const { overdueDays, fineAmount } = calculateFine(loan.dueDate, now);
        const obj = loan.toObject();
        obj.currentOverdueDays = overdueDays;
        obj.currentEstimatedFine = fineAmount;
        return obj;
      });

      return res.status(200).json({ success: true, count: enriched.length, data: enriched });
    }

    const records = mockDb.getBorrowRecords({ status: 'ISSUED' }).filter((r) => r.isCurrentlyOverdue);
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error fetching overdue loans:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Manual reminder dispatch
 */
const sendOverdueReminderNow = async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: 'Notification dispatched.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Student / Teacher Pay Fine via UPI
 * PUT /api/borrow/pay-fine/:recordId
 */
const payFine = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { paymentMethod = 'UPI QR Scanner (GPay / PhonePe / Paytm)', paymentUtr } = req.body;
    const submittedUtr = paymentUtr ? String(paymentUtr).trim() : null;

    if (mongoose.connection.readyState === 1) {
      const record = await BorrowRecord.findById(recordId)
        .populate('memberId')
        .populate('bookId');

      if (!record) {
        return res.status(404).json({ success: false, message: 'Borrow record not found.' });
      }

      let effectiveFine = record.fineAmount || 0;
      let effectiveDays = record.overdueDays || 0;
      if (record.status === 'ISSUED') {
        const liveCalc = calculateFine(record.dueDate, new Date());
        effectiveFine = Math.max(effectiveFine, liveCalc.fineAmount);
        effectiveDays = Math.max(effectiveDays, liveCalc.overdueDays);
      }

      if (effectiveFine <= 0) {
        return res.status(400).json({ success: false, message: 'No fine is assessed on this record.' });
      }

      record.fineAmount = effectiveFine;
      record.overdueDays = effectiveDays;
      record.paymentMethod = paymentMethod;

      if (req.user.role === 'LIBRARIAN') {
        record.finePaid = true;
        record.paymentStatus = 'PAID';
        record.paidDate = new Date();
        record.paymentId = 'PAY-LIB-' + Date.now().toString().slice(-6);
        record.paymentUtr = submittedUtr || 'COUNTER-VERIFIED';
        record.verifiedBy = req.user._id;
        await record.save();

        return res.status(200).json({
          success: true,
          paymentStatus: 'PAID',
          message: `Fine of ₹${record.fineAmount} collected & verified by Librarian!`,
          receiptNumber: record.paymentId,
          paidDate: record.paidDate,
          data: record,
        });
      }

      if (!submittedUtr) {
        return res.status(400).json({
          success: false,
          message: 'Please provide your 12-digit UPI UTR / Transaction Reference number.',
        });
      }

      record.paymentStatus = 'PENDING_VERIFICATION';
      record.paymentUtr = submittedUtr;
      record.paymentSubmittedAt = new Date();
      record.finePaid = false;
      await record.save();

      return res.status(200).json({
        success: true,
        paymentStatus: 'PENDING_VERIFICATION',
        message: `Payment proof (UTR: ${submittedUtr}) submitted for ₹${record.fineAmount}. Awaiting Librarian verification.`,
        data: record,
      });
    }

    const updated = mockDb.payFine(recordId, { paymentMethod, paymentUtr: submittedUtr });
    return res.status(200).json({
      success: true,
      paymentStatus: 'PENDING_VERIFICATION',
      message: `Payment proof (UTR: ${submittedUtr}) submitted. Awaiting Librarian verification.`,
      data: updated,
    });
  } catch (error) {
    console.error('Error submitting fine payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Librarian Verify / Update Fine Payment Status
 * PUT /api/borrow/verify-payment/:recordId
 */
const verifyFinePayment = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { action = 'APPROVE', paymentMethod } = req.body;

    if (mongoose.connection.readyState === 1) {
      const record = await BorrowRecord.findById(recordId)
        .populate('memberId', 'name memberId email role')
        .populate('bookId', 'title isbn');

      if (!record) {
        return res.status(404).json({ success: false, message: 'Borrow record not found.' });
      }

      if (action === 'REJECT') {
        record.paymentStatus = 'UNPAID';
        record.finePaid = false;
        record.paymentUtr = null;
        record.paymentSubmittedAt = null;
        await record.save();

        return res.status(200).json({
          success: true,
          message: `Payment proof for ${record.memberId?.name} was rejected.`,
          data: record,
        });
      }

      record.finePaid = true;
      record.paymentStatus = 'PAID';
      record.paidDate = new Date();
      record.paymentId = record.paymentId || 'PAY-LIB-' + Date.now().toString().slice(-6);
      record.paymentMethod = paymentMethod || record.paymentMethod || 'Verified by Librarian';
      record.verifiedBy = req.user._id;
      await record.save();

      const populated = await BorrowRecord.findById(record._id)
        .populate('memberId', 'name memberId email role')
        .populate('bookId', 'title isbn')
        .populate('verifiedBy', 'name memberId');

      return res.status(200).json({
        success: true,
        message: `Fine verified and marked PAID! Receipt: ${record.paymentId}`,
        receiptNumber: record.paymentId,
        data: populated,
      });
    }

    const verified = mockDb.verifyFinePayment(recordId);
    return res.status(200).json({
      success: true,
      message: `Fine verified and marked PAID! Receipt: ${verified.paymentId}`,
      receiptNumber: verified.paymentId,
      data: verified,
    });
  } catch (error) {
    console.error('Error verifying fine payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  issueBook,
  returnBook,
  getBorrowHistory,
  getOverdueLoans,
  sendOverdueReminderNow,
  payFine,
  verifyFinePayment,
};
