const mongoose = require('mongoose');

const borrowRecordSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member is required'],
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book is required'],
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    loanDurationDays: {
      type: Number,
      default: 7, // 7 for Student, 45 for Teacher
    },
    returnDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['ISSUED', 'RETURNED'],
      default: 'ISSUED',
      required: true,
    },
    overdueDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finePaid: {
      type: Boolean,
      default: false,
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PENDING_VERIFICATION', 'PAID'],
      default: 'UNPAID',
    },
    paymentMethod: {
      type: String,
      default: null,
    },
    paymentUtr: {
      type: String,
      default: null,
    },
    paymentSubmittedAt: {
      type: Date,
      default: null,
    },
    paidDate: {
      type: Date,
      default: null,
    },
    paymentId: {
      type: String,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
    lastOverdueEmailDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

borrowRecordSchema.index({ memberId: 1, status: 1 });
borrowRecordSchema.index({ bookId: 1, status: 1 });
borrowRecordSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model('BorrowRecord', borrowRecordSchema);
