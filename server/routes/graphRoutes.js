const express = require('express');
const router = express.Router();
const {
  getRelationships,
  syncFullGraph,
  queryCypher,
  getSystemStatus,
} = require('../controllers/graphController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/relationships', protect, authorizeRoles('LIBRARIAN', 'TEACHER'), getRelationships);
router.post('/sync', protect, authorizeRoles('LIBRARIAN'), syncFullGraph);
router.post('/query', protect, authorizeRoles('LIBRARIAN', 'TEACHER'), queryCypher);
router.get('/status', getSystemStatus);

module.exports = router;
