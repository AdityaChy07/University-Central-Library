const bcrypt = require('bcryptjs');

/**
 * Resilient In-Memory Database Fallback
 * Activates seamlessly when local campus/institutional Wi-Fi blocks outbound TCP port 27017 to Atlas.
 * When Atlas is accessible (e.g. via Mobile Hotspot or cloud deployment on Render),
 * the server automatically routes queries directly to MongoDB Atlas.
 */

// Initial Seed Dataset matching University Library Specifications
let authors = [
  {
    _id: '674000000000000000000001',
    name: 'Thomas H. Cormen',
    country: 'USA',
    biography: 'Co-author of Introduction to Algorithms (CLRS) and Professor of Computer Science.',
    createdAt: new Date(),
  },
  {
    _id: '674000000000000000000002',
    name: 'Andrew S. Tanenbaum',
    country: 'Netherlands',
    biography: 'Author of Computer Networks and Modern Operating Systems, pioneer in distributed systems.',
    createdAt: new Date(),
  },
];

let books = [
  {
    _id: '674100000000000000000001',
    title: 'Introduction to Algorithms (CLRS)',
    isbn: '978-0262033848',
    authorId: authors[0],
    category: 'Algorithms',
    quantity: 4,
    availableCopies: 3,
    allocationStatus: 'Available on Shelf',
    createdAt: new Date(),
  },
  {
    _id: '674100000000000000000002',
    title: 'Computer Networks (5th Edition)',
    isbn: '978-0132126953',
    authorId: authors[1],
    category: 'Networking',
    quantity: 3,
    availableCopies: 2,
    allocationStatus: 'Available on Shelf',
    createdAt: new Date(),
  },
  {
    _id: '674100000000000000000003',
    title: 'Modern Operating Systems',
    isbn: '978-0133591620',
    authorId: authors[1],
    category: 'Operating Systems',
    quantity: 2,
    availableCopies: 2,
    allocationStatus: 'Available on Shelf',
    createdAt: new Date(),
  },
  {
    _id: '674100000000000000000004',
    title: 'Clean Code: Agile Software Craftsmanship',
    isbn: '978-0132350884',
    authorId: authors[0],
    category: 'Software Engineering',
    quantity: 3,
    availableCopies: 3,
    allocationStatus: 'Available on Shelf',
    createdAt: new Date(),
  },
];

let members = [
  {
    _id: '674200000000000000000001',
    memberId: 'LIB-001',
    name: 'Chief Librarian',
    email: 'librarian@university.edu',
    passwordHash: bcrypt.hashSync('Admin@123', 10),
    plainAlt: 'admin123',
    role: 'LIBRARIAN',
    department: 'Central University Library',
    phone: '+91 98765 00001',
    active: true,
    createdAt: new Date(),
  },
  {
    _id: '674200000000000000000002',
    memberId: 'TEA-101',
    name: 'Dr. S. Radhakrishnan',
    email: 'rajesh.sharma@faculty.edu',
    passwordHash: bcrypt.hashSync('Teacher@123', 10),
    plainAlt: 'teacher123',
    role: 'TEACHER',
    department: 'Computer Science & Engineering',
    phone: '+91 98765 00101',
    active: true,
    createdAt: new Date(),
  },
  {
    _id: '674200000000000000000003',
    memberId: 'STU-201',
    name: 'Aditya Choudhary',
    email: 'aditya.choudhary@student.edu',
    passwordHash: bcrypt.hashSync('Student@123', 10),
    plainAlt: 'student123',
    role: 'STUDENT',
    department: 'Computer Science (B.Tech)',
    phone: '+91 98765 00201',
    active: true,
    createdAt: new Date(),
  },
];

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

// Controlled loans: 1 teacher loan (45-day), 1 student loan (overdue by 4 days with ₹20 fine)
let borrowRecords = [
  {
    _id: '674300000000000000000001',
    memberId: members[1], // Teacher
    bookId: books[1],
    issueDate: new Date(now.getTime() - 10 * dayMs),
    dueDate: new Date(now.getTime() + 35 * dayMs),
    loanDurationDays: 45,
    status: 'ISSUED',
    overdueDays: 0,
    fineAmount: 0,
    finePaid: false,
    paymentStatus: 'UNPAID',
    createdAt: new Date(now.getTime() - 10 * dayMs),
  },
  {
    _id: '674300000000000000000002',
    memberId: members[2], // Aditya Choudhary
    bookId: books[0],
    issueDate: new Date(now.getTime() - 11 * dayMs),
    dueDate: new Date(now.getTime() - 4 * dayMs),
    loanDurationDays: 7,
    status: 'ISSUED',
    overdueDays: 4,
    fineAmount: 20,
    currentEstimatedFine: 20,
    isCurrentlyOverdue: true,
    finePaid: false,
    paymentStatus: 'UNPAID',
    createdAt: new Date(now.getTime() - 11 * dayMs),
  },
];

const mockDb = {
  // --- AUTH / MEMBERS ---
  findMemberByIdentifier: (cleanId) => {
    const idLower = cleanId.toLowerCase();
    const idUpper = cleanId.toUpperCase();
    return members.find(
      (m) =>
        m.email.toLowerCase() === idLower ||
        m.memberId.toUpperCase() === idUpper ||
        (cleanId === 'LIB-ADMIN' && m.memberId === 'LIB-001')
    );
  },

  getMemberById: (id) => {
    return members.find((m) => String(m._id) === String(id));
  },

  getAllMembers: (search = '') => {
    let list = members;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.memberId.toLowerCase().includes(q)
      );
    }
    return list;
  },

  createMember: (data) => {
    const newMember = {
      _id: '6742' + Date.now().toString().slice(-20),
      memberId: data.memberId ? data.memberId.toUpperCase() : 'MEM-' + Date.now().toString().slice(-4),
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: bcrypt.hashSync(data.password || 'password123', 10),
      plainAlt: data.password || 'password123',
      role: data.role || 'STUDENT',
      department: data.department || 'General',
      phone: data.phone || '',
      active: true,
      createdAt: new Date(),
    };
    members.push(newMember);
    return newMember;
  },

  updateMember: (id, data) => {
    const m = members.find((item) => String(item._id) === String(id));
    if (!m) return null;
    if (data.name) m.name = data.name;
    if (data.email) m.email = data.email.toLowerCase();
    if (data.phone) m.phone = data.phone;
    if (data.department) m.department = data.department;
    if (data.active !== undefined) m.active = data.active;
    if (data.password) {
      m.passwordHash = bcrypt.hashSync(data.password, 10);
      m.plainAlt = data.password;
    }
    return m;
  },

  verifyPassword: async (member, password) => {
    if (member.plainAlt && member.plainAlt === password) return true;
    if (password.toLowerCase() === member.plainAlt?.toLowerCase()) return true;
    if (member.passwordHash) {
      try {
        const match = await bcrypt.compare(password, member.passwordHash);
        if (match) return true;
      } catch (e) {
        // fallback
      }
    }
    return false;
  },

  // --- BOOKS ---
  getAllBooks: (search = '') => {
    let list = books;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.authorId?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  getBookById: (id) => {
    return books.find((b) => String(b._id) === String(id));
  },

  createBook: (data) => {
    const author = authors.find((a) => String(a._id) === String(data.authorId)) || authors[0];
    const newBook = {
      _id: '6741' + Date.now().toString().slice(-20),
      title: data.title,
      isbn: data.isbn,
      authorId: author,
      category: data.category || 'General',
      quantity: Number(data.quantity) || 1,
      availableCopies: Number(data.quantity) || 1,
      allocationStatus: 'Available on Shelf',
      createdAt: new Date(),
    };
    books.push(newBook);
    return newBook;
  },

  updateBook: (id, data) => {
    const b = books.find((item) => String(item._id) === String(id));
    if (!b) return null;
    if (data.title) b.title = data.title;
    if (data.isbn) b.isbn = data.isbn;
    if (data.category) b.category = data.category;
    if (data.quantity !== undefined) b.quantity = Number(data.quantity);
    if (data.availableCopies !== undefined) b.availableCopies = Number(data.availableCopies);
    return b;
  },

  // --- AUTHORS ---
  getAllAuthors: (search = '') => {
    let list = authors;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.country.toLowerCase().includes(q)
      );
    }
    return list;
  },

  createAuthor: (data) => {
    const newAuthor = {
      _id: '6740' + Date.now().toString().slice(-20),
      name: data.name,
      country: data.country || '',
      biography: data.biography || '',
      createdAt: new Date(),
    };
    authors.push(newAuthor);
    return newAuthor;
  },

  // --- BORROW RECORDS ---
  getBorrowRecords: (filter = {}) => {
    let list = borrowRecords;
    if (filter.memberId) {
      list = list.filter((r) => String(r.memberId?._id || r.memberId) === String(filter.memberId));
    }
    if (filter.bookId) {
      list = list.filter((r) => String(r.bookId?._id || r.bookId) === String(filter.bookId));
    }
    if (filter.status) {
      list = list.filter((r) => r.status === filter.status);
    }
    return list;
  },

  getBorrowRecordById: (id) => {
    return borrowRecords.find((r) => String(r._id) === String(id));
  },

  issueBook: (memberId, bookId) => {
    const member = members.find((m) => String(m._id) === String(memberId));
    const book = books.find((b) => String(b._id) === String(bookId));
    if (!member || !book) throw new Error('Invalid Member or Book ID.');
    if (book.availableCopies <= 0) throw new Error(`No copies of "${book.title}" are available.`);

    const loanDays = member.role === 'TEACHER' ? 45 : 7;
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);

    book.availableCopies -= 1;

    const record = {
      _id: '6743' + Date.now().toString().slice(-20),
      memberId: member,
      bookId: book,
      issueDate,
      dueDate,
      loanDurationDays: loanDays,
      status: 'ISSUED',
      overdueDays: 0,
      fineAmount: 0,
      finePaid: false,
      paymentStatus: 'UNPAID',
      createdAt: new Date(),
    };
    borrowRecords.unshift(record);
    return record;
  },

  returnBook: (recordId) => {
    const record = borrowRecords.find((r) => String(r._id) === String(recordId));
    if (!record) throw new Error('Borrow record not found.');
    if (record.status === 'RETURNED') throw new Error('Book is already returned.');

    const returnDate = new Date();
    record.status = 'RETURNED';
    record.returnDate = returnDate;

    // Check overdue
    const diffMs = returnDate.getTime() - new Date(record.dueDate).getTime();
    if (diffMs > 0) {
      const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      record.overdueDays = overdueDays;
      record.fineAmount = overdueDays * 5;
    } else {
      record.overdueDays = 0;
      record.fineAmount = 0;
      record.finePaid = true;
      record.paymentStatus = 'PAID';
    }

    const book = books.find((b) => String(b._id) === String(record.bookId?._id || record.bookId));
    if (book) {
      book.availableCopies = Math.min(book.quantity, book.availableCopies + 1);
    }
    return record;
  },

  payFine: (recordId, { paymentMethod, paymentUtr }) => {
    const record = borrowRecords.find((r) => String(r._id) === String(recordId));
    if (!record) throw new Error('Loan record not found.');

    record.paymentMethod = paymentMethod || 'UPI QR Scanner (GPay / PhonePe / Paytm)';
    record.paymentUtr = paymentUtr;
    record.paymentSubmittedAt = new Date();
    record.paymentStatus = 'PENDING_VERIFICATION';
    return record;
  },

  verifyFinePayment: (recordId) => {
    const record = borrowRecords.find((r) => String(r._id) === String(recordId));
    if (!record) throw new Error('Loan record not found.');

    record.finePaid = true;
    record.paymentStatus = 'PAID';
    record.paymentId = `UCL-REC-${Date.now().toString().slice(-6)}`;
    record.paidDate = new Date();
    return record;
  },

  // --- DASHBOARD METRICS ---
  getDashboardStats: () => {
    const totalBooks = books.length;
    const totalPhysicalCopies = books.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const totalAvailableCopies = books.reduce((sum, b) => sum + (b.availableCopies || 0), 0);
    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.active).length;
    const currentlyIssuedBooks = borrowRecords.filter((r) => r.status === 'ISSUED').length;
    const overdueBooks = borrowRecords.filter(
      (r) => r.status === 'ISSUED' && (r.isCurrentlyOverdue || new Date(r.dueDate) < new Date())
    ).length;
    const outstandingFines = borrowRecords
      .filter((r) => !r.finePaid && (r.fineAmount > 0 || r.currentEstimatedFine > 0))
      .reduce((sum, r) => sum + (r.fineAmount || r.currentEstimatedFine || 0), 0);
    const totalCollectedFines = borrowRecords
      .filter((r) => r.finePaid && r.fineAmount > 0)
      .reduce((sum, r) => sum + r.fineAmount, 0);
    const pendingPaymentVerifications = borrowRecords.filter(
      (r) => r.paymentStatus === 'PENDING_VERIFICATION'
    ).length;

    return {
      summary: {
        totalBooks,
        totalPhysicalCopies,
        totalAvailableCopies,
        totalMembers,
        activeMembers,
        currentlyIssuedBooks,
        overdueBooks,
        outstandingFines,
        totalCollectedFines,
        pendingPaymentVerifications,
        totalLoansAllTime: borrowRecords.length,
      },
      recentActivity: borrowRecords.slice(0, 10),
      categoryStats: [
        { _id: 'Algorithms', count: 1, totalCopies: 4 },
        { _id: 'Networking', count: 1, totalCopies: 3 },
        { _id: 'Operating Systems', count: 1, totalCopies: 2 },
        { _id: 'Software Engineering', count: 1, totalCopies: 3 },
      ],
      recentEmails: [],
    };
  },
};

module.exports = mockDb;
