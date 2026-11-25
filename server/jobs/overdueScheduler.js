const cron = require('node-cron');
const mongoose = require('mongoose');
const BorrowRecord = require('../models/BorrowRecord');
const mockDb = require('../services/mockDbService');
const { calculateFine, getZonedDateParts } = require('../utils/dateUtils');
const { sendOverdueEmail } = require('../services/emailService');

/**
 * Daily Overdue Email Scheduler
 * Specification Section 7 & 10:
 * Run a daily job at 09:00 Asia/Kolkata:
 * 1. Find BorrowRecords where status = ISSUED and dueDate < today.
 * 2. For each record, calculate current overdue days and estimated fine.
 * 3. If lastOverdueEmailDate is not today's local date:
 *      send overdue email to the member
 *      update lastOverdueEmailDate
 * 4. Catch-up policy: send one current overdue notice, not a burst of missed messages.
 */

const runOverdueEmailScan = async () => {
  console.log('[Scheduler] Running scheduled overdue check...');
  const now = new Date();
  const todayParts = getZonedDateParts(now).dateStr; // "YYYY-MM-DD" in Asia/Kolkata

  try {
    const overdueLoans =
      mongoose.connection.readyState === 1
        ? await BorrowRecord.find({
            status: 'ISSUED',
            dueDate: { $lt: now },
          })
            .populate('memberId')
            .populate('bookId')
        : mockDb
            .getBorrowRecords({ status: 'ISSUED' })
            .filter((r) => r.isCurrentlyOverdue || new Date(r.dueDate) < now);

    console.log(`[Scheduler] Found ${overdueLoans.length} active overdue loan(s).`);

    let sentCount = 0;
    let skippedCount = 0;
    let failureCount = 0;

    for (const record of overdueLoans) {
      if (!record.memberId || !record.bookId) continue;

      // Check if already sent today in Asia/Kolkata timezone
      let alreadySentToday = false;
      if (record.lastOverdueEmailDate) {
        const lastSentStr = getZonedDateParts(record.lastOverdueEmailDate).dateStr;
        if (lastSentStr === todayParts) {
          alreadySentToday = true;
        }
      }

      if (alreadySentToday) {
        skippedCount++;
        continue;
      }

      const { overdueDays, fineAmount } = calculateFine(record.dueDate, now);

      if (overdueDays > 0) {
        const res = await sendOverdueEmail({
          member: record.memberId,
          book: record.bookId,
          borrowRecord: record,
          overdueDays,
          estimatedFine: fineAmount,
        });

        if (res.success) {
          record.lastOverdueEmailDate = now;
          if (typeof record.save === 'function') {
            await record.save();
          }
          sentCount++;
        } else {
          failureCount++;
        }
      }
    }

    console.log(
      `[Scheduler] Overdue check complete. Sent: ${sentCount}, Already notified today: ${skippedCount}, Failed: ${failureCount}.`
    );
    return {
      success: true,
      totalOverdue: overdueLoans.length,
      sent: sentCount,
      skipped: skippedCount,
      failed: failureCount,
    };
  } catch (error) {
    console.error('[Scheduler] Error in overdue scan job:', error.message);
    return { success: false, error: error.message };
  }
};

const initScheduler = () => {
  // Cron schedule: At 09:00 AM every day
  // Syntax: minute hour day-of-month month day-of-week
  const cronTime = '0 9 * * *';

  cron.schedule(
    cronTime,
    () => {
      console.log('[Scheduler] Triggering 09:00 AM daily overdue email reminder job...');
      runOverdueEmailScan();
    },
    {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'Asia/Kolkata',
    }
  );

  console.log(`[Scheduler] Overdue email cron job registered: "${cronTime}" (${process.env.TIMEZONE || 'Asia/Kolkata'})`);
};

module.exports = {
  initScheduler,
  runOverdueEmailScan,
};
