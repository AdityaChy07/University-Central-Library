require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { initNeo4j, closeNeo4j } = require('../config/neo4j');
const Author = require('../models/Author');
const Book = require('../models/Book');
const Member = require('../models/Member');
const BorrowRecord = require('../models/BorrowRecord');
const { rebuildGraphFromMongo } = require('../services/graphService');
const { calculateFine } = require('./dateUtils');

const seedDatabase = async () => {
  console.log('----------------------------------------------------');
  console.log('  SEEDING MINIMAL CLEAN UNIVERSITY LIBRARY DATABASE ');
  console.log('----------------------------------------------------');

  try {
    if (mongoose.connection.readyState !== 1) {
      const mongoConnected = await connectDB();
      if (!mongoConnected) {
        throw new Error('Cannot connect to MongoDB Atlas.');
      }
      initNeo4j();
    }

    // 1. Clear existing collections
    console.log('[Seeder] Resetting collections...');
    await BorrowRecord.deleteMany({});
    await Book.deleteMany({});
    await Author.deleteMany({});
    await Member.deleteMany({});

    // 2. Insert Minimal Authors (2 eminent authors)
    console.log('[Seeder] Seeding Authors...');
    const authors = await Author.insertMany([
      {
        name: 'Thomas H. Cormen',
        country: 'USA',
        biography: 'Co-author of Introduction to Algorithms (CLRS) and Professor of Computer Science.',
      },
      {
        name: 'Andrew S. Tanenbaum',
        country: 'Netherlands',
        biography: 'Author of Computer Networks and Modern Operating Systems, pioneer in distributed systems.',
      },
    ]);
    console.log(`[Seeder] Created ${authors.length} authors.`);

    const authorMap = {
      cormen: authors[0]._id,
      tanenbaum: authors[1]._id,
    };

    // 3. Insert Minimal Books (4 textbooks)
    console.log('[Seeder] Seeding Books...');
    const books = await Book.insertMany([
      {
        title: 'Introduction to Algorithms (CLRS)',
        isbn: '978-0262033848',
        authorId: authorMap.cormen,
        category: 'Algorithms',
        quantity: 4,
        availableCopies: 3, // 1 borrowed by Student
      },
      {
        title: 'Computer Networks (5th Edition)',
        isbn: '978-0132126953',
        authorId: authorMap.tanenbaum,
        category: 'Networking',
        quantity: 3,
        availableCopies: 2, // 1 borrowed by Teacher
      },
      {
        title: 'Modern Operating Systems',
        isbn: '978-0133591620',
        authorId: authorMap.tanenbaum,
        category: 'Operating Systems',
        quantity: 2,
        availableCopies: 2, // available
      },
      {
        title: 'Clean Code: Agile Software Craftsmanship',
        isbn: '978-0132350884',
        authorId: authorMap.cormen,
        category: 'Software Engineering',
        quantity: 3,
        availableCopies: 3, // available
      },
    ]);
    console.log(`[Seeder] Created ${books.length} books.`);

    // 4. Insert 3 Distinct Core Accounts (1 Librarian, 1 Teacher, 1 Student)
    console.log('[Seeder] Seeding 3 Core User Accounts...');
    const membersData = [
      {
        memberId: 'LIB-ADMIN',
        name: 'Chief Librarian',
        email: 'librarian@university.edu',
        password: 'admin123',
        role: 'LIBRARIAN',
        department: 'Central University Library',
        phone: '+91 98765 00001',
        active: true,
      },
      {
        memberId: 'TEA-101',
        name: 'Prof. Rajesh Sharma',
        email: 'rajesh.sharma@faculty.edu',
        password: 'teacher123',
        role: 'TEACHER', // 45-day retention privilege
        department: 'Computer Science & Engineering',
        phone: '+91 98765 00101',
        active: true,
      },
      {
        memberId: 'STU-201',
        name: 'Aditya Choudhary',
        email: 'aditya.choudhary@student.edu',
        password: 'student123',
        role: 'STUDENT', // 7-day retention rule, fee clearance
        department: 'Computer Science (B.Tech)',
        phone: '+91 98765 00201',
        active: true,
      },
    ];

    const members = [];
    for (const mData of membersData) {
      const m = await Member.create(mData);
      members.push(m);
    }
    console.log(`[Seeder] Created ${members.length} clean accounts.`);

    const [librarian, teacher, student] = members;
    const [bookAlgorithms, bookNetworks] = books;

    // 5. Seed Exactly 2 Controlled Borrow Records
    console.log('[Seeder] Seeding 2 Controlled Borrow Records...');
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    // Record 1: Teacher loan with 45-day retention (Issued 10 days ago, due in 35 days)
    const issueDateTeacher = new Date(now.getTime() - 10 * dayMs);
    const dueDateTeacher = new Date(issueDateTeacher.getTime() + 45 * dayMs);

    // Record 2: Student loan with 7-day rule, currently 4 days overdue -> fine = ₹20 for live scanner payment
    const issueDateStudent = new Date(now.getTime() - 11 * dayMs);
    const dueDateStudent = new Date(issueDateStudent.getTime() + 7 * dayMs);
    const overdueStudent = calculateFine(dueDateStudent, now);

    const borrowRecords = await BorrowRecord.insertMany([
      {
        memberId: teacher._id,
        bookId: bookNetworks._id,
        issueDate: issueDateTeacher,
        dueDate: dueDateTeacher,
        loanDurationDays: 45,
        status: 'ISSUED',
        overdueDays: 0,
        fineAmount: 0,
        finePaid: false,
      },
      {
        memberId: student._id,
        bookId: bookAlgorithms._id,
        issueDate: issueDateStudent,
        dueDate: dueDateStudent,
        loanDurationDays: 7,
        status: 'ISSUED',
        overdueDays: overdueStudent.overdueDays, // 4 days late
        fineAmount: overdueStudent.fineAmount, // ₹20 fine
        finePaid: false, // Ready for real UPI QR scanner testing
      },
    ]);
    console.log(`[Seeder] Created ${borrowRecords.length} borrow records.`);

    // 6. Neo4j Sync
    console.log('[Seeder] Synchronizing Neo4j...');
    try {
      await rebuildGraphFromMongo(Author, Book, Member, BorrowRecord);
      console.log('[Seeder] Neo4j graph synced successfully.');
    } catch (err) {
      console.warn('[Seeder] Neo4j synchronization skipped/offline:', err.message);
    }

    console.log('----------------------------------------------------');
    console.log('  CLEAN MINIMAL SEEDING COMPLETED SUCCESSFULLY!    ');
    console.log('----------------------------------------------------');

    return {
      authorsCount: authors.length,
      booksCount: books.length,
      membersCount: members.length,
      borrowRecordsCount: borrowRecords.length,
    };
  } catch (error) {
    console.error('[Seeder] Error during seeding:', error);
    throw error;
  }
};

/**
 * Seed only if database has zero members and zero books (safe for first cloud deployment boot)
 */
const seedIfEmpty = async () => {
  try {
    const memberCount = await Member.countDocuments();
    const bookCount = await Book.countDocuments();
    if (memberCount === 0 && bookCount === 0) {
      console.log('[Bootstrap] Empty Atlas database detected — seeding initial LIB-ADMIN & baseline catalog...');
      await seedDatabase();
    }
  } catch (err) {
    console.warn('[Bootstrap] Auto-seed check skipped:', err.message);
  }
};

// Allow CLI execution: `node utils/seedData.js`
if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await mongoose.disconnect();
      await closeNeo4j();
      process.exit(0);
    })
    .catch(async () => {
      await mongoose.disconnect();
      await closeNeo4j();
      process.exit(1);
    });
}

module.exports = { seedDatabase, seedIfEmpty };
