const express = require('express');
const router = express.Router();
const {
  registerMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
} = require('../controllers/memberController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, authorizeRoles('LIBRARIAN'), registerMember)
  .get(getMembers);

router.route('/:id')
  .get(getMemberById)
  .put(protect, authorizeRoles('LIBRARIAN'), updateMember)
  .delete(protect, authorizeRoles('LIBRARIAN'), deleteMember);

module.exports = router;
