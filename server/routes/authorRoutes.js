const express = require('express');
const router = express.Router();
const {
  createAuthor,
  getAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
} = require('../controllers/authorController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, authorizeRoles('LIBRARIAN'), createAuthor)
  .get(getAuthors);

router.route('/:id')
  .get(getAuthorById)
  .put(protect, authorizeRoles('LIBRARIAN'), updateAuthor)
  .delete(protect, authorizeRoles('LIBRARIAN'), deleteAuthor);

module.exports = router;
