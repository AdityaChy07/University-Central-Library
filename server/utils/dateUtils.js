/**
 * Strict date utilities respecting Asia/Kolkata timezone and calendar-day boundaries
 * Supports both Student (7-day loan) and Teacher (45-day loan) rules.
 */

const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';
const DAILY_FINE_RATE = 5; // ₹5 per overdue day
const STUDENT_LOAN_DAYS = 7; // Students: 7 calendar days
const TEACHER_LOAN_DAYS = 45; // Teachers: 45 calendar days!

/**
 * Get date parts (YYYY, MM, DD) in configured timezone
 */
const getZonedDateParts = (dateObj = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(dateObj); // "YYYY-MM-DD"
  const [year, month, day] = parts.split('-').map(Number);
  return { year, month, day, dateStr: parts };
};

/**
 * Returns a midnight Date object in UTC corresponding to the calendar day in timezone
 */
const getZonedCalendarMidnight = (dateObj = new Date()) => {
  const { year, month, day } = getZonedDateParts(dateObj);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

/**
 * Calculates calendar days between two dates using timezone date boundaries.
 */
const calendarDaysBetween = (date1, date2) => {
  const d1 = getZonedCalendarMidnight(date1);
  const d2 = getZonedCalendarMidnight(date2);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Computes automatic due date from issue date based on user role:
 * - STUDENT: +7 calendar days
 * - TEACHER: +45 calendar days!
 */
const computeDueDate = (issueDate = new Date(), role = 'STUDENT') => {
  const due = new Date(issueDate);
  const loanDays = role === 'TEACHER' ? TEACHER_LOAN_DAYS : STUDENT_LOAN_DAYS;
  due.setDate(due.getDate() + loanDays);
  return { dueDate: due, loanDays };
};

/**
 * Calculates fine and overdue days for a given due date and return date
 * - On or before due date: 0 overdue days, ₹0 fine
 * - The first overdue day is the calendar day after the due date.
 * - fineAmount = overdueDays * 5
 */
const calculateFine = (dueDate, returnDate = new Date()) => {
  const daysDiff = calendarDaysBetween(dueDate, returnDate);
  const overdueDays = Math.max(0, daysDiff);
  const fineAmount = overdueDays * DAILY_FINE_RATE;
  return {
    overdueDays,
    fineAmount,
    isOverdue: overdueDays > 0,
    dailyRate: DAILY_FINE_RATE,
  };
};

const formatDate = (dateObj) => {
  if (!dateObj) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateObj));
};

const formatDateOnly = (dateObj) => {
  if (!dateObj) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateObj));
};

module.exports = {
  TIMEZONE,
  DAILY_FINE_RATE,
  STUDENT_LOAN_DAYS,
  TEACHER_LOAN_DAYS,
  getZonedDateParts,
  getZonedCalendarMidnight,
  calendarDaysBetween,
  computeDueDate,
  calculateFine,
  formatDate,
  formatDateOnly,
};
