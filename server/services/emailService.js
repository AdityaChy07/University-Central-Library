const nodemailer = require('nodemailer');
const { formatDate, formatDateOnly } = require('../utils/dateUtils');

/**
 * In-memory email activity audit log
 * Allows the admin UI to see email delivery status, timestamps, and preview links.
 */
const emailLogs = [];
const MAX_LOGS = 100;

const logEmail = (entry) => {
  emailLogs.unshift({
    id: 'MAIL-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (emailLogs.length > MAX_LOGS) {
    emailLogs.pop();
  }
};

let transporter = null;
let isEthereal = false;

const initTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass && !user.includes('your_test_email') && !pass.includes('password')) {
    // Configured real SMTP
    transporter = nodemailer.createTransport({
      host: host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
    console.log(`[EmailService] Configured with SMTP host: ${host}`);
  } else {
    // Auto-fallback test account using Ethereal
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      isEthereal = true;
      console.log(`[EmailService] SMTP credentials not set; created Ethereal test inbox: ${testAccount.user}`);
    } catch (err) {
      // Offline fallback: simulated logger
      console.warn('[EmailService] Unable to create Ethereal test account. Running in simulation mode.');
      transporter = null;
    }
  }
};

// Initialize right away
initTransporter().catch((err) => console.warn('[EmailService] Transporter init:', err.message));

/**
 * Common send handler with HTML design and fault-tolerance
 */
const sendMailSafe = async ({ to, subject, text, html, eventType, memberName, bookTitle }) => {
  const from = process.env.MAIL_FROM || '"Smart Library System" <library@university.edu>';

  try {
    if (!transporter) {
      // Simulation mode
      console.log(`[EmailService:Simulated] [${eventType}] TO: ${to} | SUBJECT: ${subject}`);
      logEmail({
        eventType,
        recipient: to,
        memberName,
        bookTitle,
        subject,
        status: 'SIMULATED',
        previewUrl: null,
        message: 'Sent in simulation mode (no SMTP configured).',
      });
      return { success: true, simulated: true };
    }

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    console.log(`[EmailService] Email sent: ${info.messageId}${previewUrl ? ' Preview: ' + previewUrl : ''}`);

    logEmail({
      eventType,
      recipient: to,
      memberName,
      bookTitle,
      subject,
      status: 'SENT',
      messageId: info.messageId,
      previewUrl,
      isEthereal,
    });

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
    logEmail({
      eventType,
      recipient: to,
      memberName,
      bookTitle,
      subject,
      status: 'FAILED',
      error: error.message,
    });
    // Requirement Page 4 & 6: Don't throw and kill the loan transaction; log error and allow retry
    return { success: false, error: error.message };
  }
};

/**
 * 1. Book Issued Email
 * Subject: Library book issued — due on [due date]
 */
const sendIssueEmail = async ({ member, book, borrowRecord }) => {
  const formattedIssueDate = formatDateOnly(borrowRecord.issueDate);
  const formattedDueDate = formatDateOnly(borrowRecord.dueDate);
  const subject = `Library book issued — due on ${formattedDueDate}`;

  const text = `Hello ${member.name},

You have borrowed "${book.title}". Issue date: ${formattedIssueDate}. Please return it by ${formattedDueDate} (7-day loan period). A late fine of ₹5 per day applies after the due date.

Best regards,
Smart Library Administration`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">Library Book Issue Confirmation</h2>
      <p>Hello <strong>${member.name}</strong>,</p>
      <p>You have successfully borrowed <strong>"${book.title}"</strong>.</p>
      <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>ISBN:</strong> ${book.isbn}</p>
        <p style="margin: 4px 0;"><strong>Issue Date:</strong> ${formattedIssueDate}</p>
        <p style="margin: 4px 0; color: #dc2626;"><strong>Due Date:</strong> ${formattedDueDate} (7-Day Loan Period)</p>
        <p style="margin: 4px 0;"><strong>Late Fine Rule:</strong> ₹5 per calendar day after due date</p>
      </div>
      <p>Please return the book on or before the due date to avoid overdue charges.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 12px;">Smart Library Management System • University Central Library</p>
    </div>
  `;

  return sendMailSafe({
    to: member.email,
    subject,
    text,
    html,
    eventType: 'BOOK_ISSUED',
    memberName: member.name,
    bookTitle: book.title,
  });
};

/**
 * 2. Book Returned Receipt Email
 * Subject: Library book returned — receipt
 */
const sendReturnEmail = async ({ member, book, borrowRecord }) => {
  const formattedReturnDate = formatDateOnly(borrowRecord.returnDate || new Date());
  const overdueDays = borrowRecord.overdueDays || 0;
  const fineAmount = borrowRecord.fineAmount || 0;
  const subject = `Library book returned — receipt`;

  const text = `Hello ${member.name},

We recorded the return of "${book.title}" on ${formattedReturnDate}. Overdue days: ${overdueDays}. Final fine: ₹${fineAmount}. Thank you.

Best regards,
Smart Library Administration`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #065f46; border-bottom: 2px solid #10b981; padding-bottom: 8px;">Library Book Return Receipt</h2>
      <p>Hello <strong>${member.name}</strong>,</p>
      <p>We recorded the return of <strong>"${book.title}"</strong> on <strong>${formattedReturnDate}</strong>.</p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>ISBN:</strong> ${book.isbn}</p>
        <p style="margin: 4px 0;"><strong>Overdue Days:</strong> ${overdueDays} day(s)</p>
        <p style="margin: 4px 0; font-size: 16px;"><strong>Final Fine:</strong> <span style="color: ${fineAmount > 0 ? '#b91c1c' : '#047857'}; font-weight: bold;">₹${fineAmount}</span></p>
      </div>
      <p>Thank you for using the Smart Library Management System.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 12px;">Smart Library Management System • University Central Library</p>
    </div>
  `;

  return sendMailSafe({
    to: member.email,
    subject,
    text,
    html,
    eventType: 'BOOK_RETURNED',
    memberName: member.name,
    bookTitle: book.title,
  });
};

/**
 * 3. Book Overdue Reminder Email
 * Subject: Reminder: library book is overdue
 */
const sendOverdueEmail = async ({ member, book, borrowRecord, overdueDays, estimatedFine }) => {
  const formattedDueDate = formatDateOnly(borrowRecord.dueDate);
  const subject = `Reminder: library book is overdue`;

  const text = `Hello ${member.name},

"${book.title}" was due on ${formattedDueDate}. It is currently ${overdueDays} day(s) overdue. The estimated fine is ₹${estimatedFine} as of today. Please return the book as soon as possible. The final fine is calculated on the return date.

Best regards,
Smart Library Administration`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fecaca; border-radius: 8px;">
      <h2 style="color: #991b1b; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">Overdue Book Notice</h2>
      <p>Hello <strong>${member.name}</strong>,</p>
      <p>Our records show that the following library book is currently overdue:</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Book Title:</strong> ${book.title}</p>
        <p style="margin: 4px 0;"><strong>Due Date:</strong> ${formattedDueDate}</p>
        <p style="margin: 4px 0; color: #b91c1c;"><strong>Overdue Duration:</strong> ${overdueDays} calendar day(s)</p>
        <p style="margin: 4px 0; font-size: 16px;"><strong>Estimated Current Fine:</strong> <span style="color: #b91c1c; font-weight: bold;">₹${estimatedFine}</span> (₹5 / day)</p>
      </div>
      <p style="color: #b91c1c;">Please return the book as soon as possible. The final fine will be recorded at the return desk upon return.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 12px;">Smart Library Management System • University Central Library</p>
    </div>
  `;

  return sendMailSafe({
    to: member.email,
    subject,
    text,
    html,
    eventType: 'BOOK_OVERDUE',
    memberName: member.name,
    bookTitle: book.title,
  });
};

const getEmailLogs = () => emailLogs;

module.exports = {
  sendIssueEmail,
  sendReturnEmail,
  sendOverdueEmail,
  getEmailLogs,
};
