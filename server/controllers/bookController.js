const mongoose = require('mongoose');
const Book = require('../models/Book');
const Author = require('../models/Author');
const BorrowRecord = require('../models/BorrowRecord');
const mockDb = require('../services/mockDbService');
const { syncBook, deleteBookNode } = require('../services/graphService');

/**
 * Create a new Book
 * POST /api/books
 */
const createBook = async (req, res) => {
  try {
    const { title, isbn, authorId, category, quantity, availableCopies } = req.body;

    if (!title || !isbn || !authorId) {
      return res.status(400).json({
        success: false,
        message: 'Title, ISBN, and Author are required fields.',
      });
    }

    if (mongoose.connection.readyState === 1) {
      const cleanIsbn = isbn.trim().toUpperCase();
      const existing = await Book.findOne({ isbn: cleanIsbn });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Book with ISBN "${cleanIsbn}" already exists (${existing.title}).`,
        });
      }

      const author = await Author.findById(authorId);
      if (!author) {
        return res.status(404).json({ success: false, message: 'Referenced Author not found.' });
      }

      const totalQty = Number.isInteger(Number(quantity)) ? Number(quantity) : 1;
      const availQty = availableCopies !== undefined ? Number(availableCopies) : totalQty;

      const book = await Book.create({
        title: title.trim(),
        isbn: cleanIsbn,
        authorId: author._id,
        category: category ? category.trim() : 'General',
        quantity: totalQty,
        availableCopies: availQty,
      });

      const populated = await Book.findById(book._id).populate('authorId');
      syncBook(populated).catch((err) =>
        console.warn('[Neo4j] Sync deferred for created book:', err.message)
      );

      return res.status(201).json({
        success: true,
        data: populated,
        message: 'Book created and synchronized successfully.',
      });
    }

    const created = mockDb.createBook({
      title: title.trim(),
      isbn: isbn.trim().toUpperCase(),
      authorId,
      category,
      quantity,
    });

    return res.status(201).json({
      success: true,
      data: created,
      message: 'Book created successfully in local catalog.',
    });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List / search books
 * GET /api/books
 */
const getBooks = async (req, res) => {
  try {
    const { search, category, availableOnly } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = {};

      if (search && search.trim()) {
        const q = search.trim();
        filter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { isbn: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
        ];
      }

      if (category && category !== 'All') {
        filter.category = category;
      }

      if (availableOnly === 'true') {
        filter.availableCopies = { $gt: 0 };
      }

      const books = await Book.find(filter)
        .populate('authorId', 'name country biography')
        .sort({ createdAt: -1 });

      const activeLoans = await BorrowRecord.find({
        bookId: { $in: books.map((b) => b._id) },
        status: 'ISSUED',
      }).sort({ dueDate: 1 });

      const earliestDueMap = {};
      activeLoans.forEach((loan) => {
        const bId = loan.bookId.toString();
        if (!earliestDueMap[bId]) {
          earliestDueMap[bId] = loan.dueDate;
        }
      });

      const enrichedBooks = books.map((b) => {
        const obj = b.toObject();
        if (obj.availableCopies === 0) {
          const nextDue = earliestDueMap[b._id.toString()];
          obj.expectedAllocationDate = nextDue || null;
          obj.allocationStatus = nextDue
            ? `Expected back on ${new Date(nextDue).toLocaleDateString()}`
            : 'Waitlist Allocation Pending';
        } else {
          obj.expectedAllocationDate = new Date();
          obj.allocationStatus = 'Available Today for Immediate Issue';
        }
        return obj;
      });

      return res.status(200).json({ success: true, count: enrichedBooks.length, data: enrichedBooks });
    }

    const fallbackBooks = mockDb.getAllBooks(search);
    return res.status(200).json({ success: true, count: fallbackBooks.length, data: fallbackBooks });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get one Book by ID
 * GET /api/books/:id
 */
const getBookById = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const book = await Book.findById(req.params.id).populate('authorId');
      if (!book) {
        return res.status(404).json({ success: false, message: 'Book not found.' });
      }

      const recentLoans = await BorrowRecord.find({ bookId: book._id })
        .populate('memberId', 'name memberId email')
        .sort({ createdAt: -1 })
        .limit(10);

      return res.status(200).json({ success: true, data: { ...book.toObject(), recentLoans } });
    }

    const book = mockDb.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    return res.status(200).json({ success: true, data: book });
  } catch (error) {
    console.error('Error fetching book by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Book
 * PUT /api/books/:id
 */
const updateBook = async (req, res) => {
  try {
    const { title, isbn, category, quantity, availableCopies } = req.body;

    if (mongoose.connection.readyState === 1) {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ success: false, message: 'Book not found.' });
      }

      if (title && title.trim()) book.title = title.trim();
      if (category && category.trim()) book.category = category.trim();
      if (quantity !== undefined) book.quantity = Number(quantity);
      if (availableCopies !== undefined) book.availableCopies = Number(availableCopies);

      await book.save();
      const populated = await Book.findById(book._id).populate('authorId');
      syncBook(populated).catch(() => {});

      return res.status(200).json({
        success: true,
        data: populated,
        message: 'Book updated successfully.',
      });
    }

    const updated = mockDb.updateBook(req.params.id, {
      title,
      isbn,
      category,
      quantity,
      availableCopies,
    });
    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Book updated successfully in local catalog.',
    });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete Book
 * DELETE /api/books/:id
 */
const deleteBook = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ success: false, message: 'Book not found.' });
      }

      const activeLoans = await BorrowRecord.countDocuments({
        bookId: book._id,
        status: 'ISSUED',
      });
      if (activeLoans > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete book "${book.title}" because ${activeLoans} copy/copies are currently issued.`,
        });
      }

      await Book.findByIdAndDelete(req.params.id);
      deleteBookNode(req.params.id).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `Book "${book.title}" removed from catalog successfully.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Book removed from local catalog.',
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
};
