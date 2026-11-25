const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');
const Member = require('../models/Member');
const BorrowRecord = require('../models/BorrowRecord');
const mockDb = require('../services/mockDbService');
const {
  getGraphData,
  rebuildGraphFromMongo,
  runCustomCypher,
} = require('../services/graphService');
const { getNeo4jStatus } = require('../config/neo4j');
const { getMongoStatus } = require('../config/db');

const buildFallbackGraphFromRecords = (authors, books, members, borrows) => {
  const nodes = [
    ...authors.map((a) => ({ id: a._id.toString(), label: 'Author', name: a.name, country: a.country })),
    ...books.map((b) => ({
      id: b._id.toString(),
      label: 'Book',
      name: b.title,
      isbn: b.isbn,
      category: b.category,
      quantity: b.quantity,
      availableCopies: b.availableCopies,
    })),
    ...members.map((m) => ({
      id: m._id.toString(),
      label: 'Member',
      name: m.name,
      memberId: m.memberId,
      email: m.email,
      active: m.active,
    })),
  ];

  const links = [
    ...books.map((b) => ({
      source: (b.authorId?._id || b.authorId).toString(),
      target: b._id.toString(),
      type: 'WROTE',
      color: '#6366f1',
    })),
    ...borrows.map((r) => ({
      source: (r.memberId?._id || r.memberId).toString(),
      target: (r.bookId?._id || r.bookId).toString(),
      type: 'BORROWED',
      status: r.status,
      fineAmount: r.fineAmount,
      color: r.status === 'ISSUED' ? '#ef4444' : '#10b981',
    })),
  ];

  return { nodes, links };
};

/**
 * Get Graph Data for Visualization
 * GET /api/graph/relationships
 */
const getRelationships = async (req, res) => {
  try {
    const graphData = await getGraphData();

    // If Neo4j is offline, synthesize graph visualization data from Atlas or Local Fallback
    if (!graphData.connected) {
      const isMongoConnected = mongoose.connection.readyState === 1;
      const authors = isMongoConnected ? await Author.find() : mockDb.getAllAuthors();
      const books = isMongoConnected ? await Book.find() : mockDb.getAllBooks();
      const members = isMongoConnected ? await Member.find() : mockDb.getAllMembers();
      const borrows = isMongoConnected ? await BorrowRecord.find() : mockDb.getBorrowRecords();

      const { nodes, links } = buildFallbackGraphFromRecords(authors, books, members, borrows);

      return res.status(200).json({
        success: true,
        connected: false,
        source: isMongoConnected ? 'MONGODB_FALLBACK' : 'LOCAL_FALLBACK',
        message: isMongoConnected
          ? 'Graph generated from MongoDB collections (Neo4j offline).'
          : 'Graph generated from Local Fallback repository (Atlas auth/network pending).',
        nodes,
        links,
      });
    }

    res.status(200).json({ success: true, source: 'NEO4J', ...graphData });
  } catch (error) {
    console.error('Error fetching graph relationships:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Rebuild / Resync Neo4j from MongoDB collections
 * POST /api/graph/sync
 */
const syncFullGraph = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        message: 'Knowledge Graph running in projected Local Fallback mode while MongoDB Atlas is connecting.',
        data: { fallback: true },
      });
    }
    const result = await rebuildGraphFromMongo(Author, Book, Member, BorrowRecord);
    res.status(200).json({
      success: true,
      message: 'Neo4j graph rebuilt and synchronized from MongoDB records successfully.',
      data: result,
    });
  } catch (error) {
    console.error('Error synchronizing graph:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Run Custom Cypher Query
 * POST /api/graph/query
 */
const queryCypher = async (req, res) => {
  try {
    const { query, params } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Cypher query string is required.' });
    }

    const result = await runCustomCypher(query, params || {}, {
      Author,
      Book,
      Member,
      BorrowRecord,
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error executing Cypher query:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Database Connection Status
 * GET /api/graph/status
 */
const getSystemStatus = async (req, res) => {
  try {
    const mongo = getMongoStatus();
    const neo4j = await getNeo4jStatus();

    res.status(200).json({
      success: true,
      databases: {
        mongodb: mongo,
        neo4j: neo4j,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRelationships,
  syncFullGraph,
  queryCypher,
  getSystemStatus,
};
