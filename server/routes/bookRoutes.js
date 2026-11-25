const express = require('express');
const router = express.Router();
const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
} = require('../controllers/bookController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, authorizeRoles('LIBRARIAN'), createBook)
  .get(getBooks);

router.route('/:id')
  .get(getBookById)
  .put(protect, authorizeRoles('LIBRARIAN'), updateBook)
  .delete(protect, authorizeRoles('LIBRARIAN'), deleteBook);

module.exports = router;
