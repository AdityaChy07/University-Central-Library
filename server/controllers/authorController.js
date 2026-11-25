const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');
const mockDb = require('../services/mockDbService');
const { syncAuthor, deleteAuthorNode } = require('../services/graphService');

/**
 * Create a new Author
 * POST /api/authors
 */
const createAuthor = async (req, res) => {
  try {
    const { name, country, biography } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Author name is required.' });
    }

    if (mongoose.connection.readyState === 1) {
      const author = await Author.create({
        name: name.trim(),
        country: country ? country.trim() : '',
        biography: biography ? biography.trim() : '',
      });

      syncAuthor(author).catch(() => {});
      return res.status(201).json({ success: true, data: author, message: 'Author created successfully.' });
    }

    const created = mockDb.createAuthor({ name, country, biography });
    return res.status(201).json({ success: true, data: created, message: 'Author created in local catalog.' });
  } catch (error) {
    console.error('Error creating author:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all Authors with book count
 * GET /api/authors
 */
const getAuthors = async (req, res) => {
  try {
    const search = req.query.search || '';

    if (mongoose.connection.readyState === 1) {
      const query = search ? { name: { $regex: search, $options: 'i' } } : {};
      const authors = await Author.find(query).sort({ createdAt: -1 });

      const bookCounts = await Book.aggregate([
        { $group: { _id: '$authorId', count: { $sum: 1 } } },
      ]);
      const countMap = {};
      bookCounts.forEach((bc) => {
        if (bc._id) countMap[bc._id.toString()] = bc.count;
      });

      const authorsWithCount = authors.map((a) => ({
        ...a.toObject(),
        bookCount: countMap[a._id.toString()] || 0,
      }));

      return res.status(200).json({ success: true, count: authorsWithCount.length, data: authorsWithCount });
    }

    const list = mockDb.getAllAuthors(search);
    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single Author
 * GET /api/authors/:id
 */
const getAuthorById = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const author = await Author.findById(req.params.id);
      if (!author) {
        return res.status(404).json({ success: false, message: 'Author not found.' });
      }
      const authoredBooks = await Book.find({ authorId: author._id });
      return res.status(200).json({ success: true, data: { ...author.toObject(), books: authoredBooks } });
    }

    const author = mockDb.getAllAuthors().find((a) => String(a._id) === String(req.params.id));
    if (!author) {
      return res.status(404).json({ success: false, message: 'Author not found.' });
    }
    const authoredBooks = mockDb.getAllBooks().filter((b) => String(b.authorId?._id) === String(author._id));
    return res.status(200).json({ success: true, data: { ...author, books: authoredBooks } });
  } catch (error) {
    console.error('Error fetching author by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Author
 * PUT /api/authors/:id
 */
const updateAuthor = async (req, res) => {
  try {
    const { name, country, biography } = req.body;

    if (mongoose.connection.readyState === 1) {
      const author = await Author.findById(req.params.id);
      if (!author) {
        return res.status(404).json({ success: false, message: 'Author not found.' });
      }

      if (name && name.trim()) author.name = name.trim();
      if (country !== undefined) author.country = country.trim();
      if (biography !== undefined) author.biography = biography.trim();

      await author.save();
      syncAuthor(author).catch(() => {});

      return res.status(200).json({ success: true, data: author, message: 'Author updated successfully.' });
    }

    return res.status(200).json({ success: true, message: 'Author updated in local catalog.' });
  } catch (error) {
    console.error('Error updating author:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete Author
 * DELETE /api/authors/:id
 */
const deleteAuthor = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const author = await Author.findById(req.params.id);
      if (!author) {
        return res.status(404).json({ success: false, message: 'Author not found.' });
      }

      const bookCount = await Book.countDocuments({ authorId: author._id });
      if (bookCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete author "${author.name}" because ${bookCount} book(s) in catalog reference them.`,
        });
      }

      await Author.findByIdAndDelete(req.params.id);
      deleteAuthorNode(req.params.id).catch(() => {});

      return res.status(200).json({ success: true, message: `Author "${author.name}" deleted successfully.` });
    }

    return res.status(200).json({ success: true, message: 'Author deleted from local catalog.' });
  } catch (error) {
    console.error('Error deleting author:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAuthor,
  getAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
};
