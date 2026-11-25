const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { initNeo4j, closeNeo4j } = require('./config/neo4j');
const { initScheduler } = require('./jobs/overdueScheduler');
const { seedIfEmpty } = require('./utils/seedData');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const authorRoutes = require('./routes/authorRoutes');
const bookRoutes = require('./routes/bookRoutes');
const memberRoutes = require('./routes/memberRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const graphRoutes = require('./routes/graphRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
app.set('trust proxy', 1);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Smart Library Management System',
    timestamp: new Date().toISOString(),
    version: '1.0.0 (University Level)',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`,
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

// Initialize connections and start server
const startServer = async () => {
  console.log('----------------------------------------------------');
  console.log('  SMART LIBRARY MANAGEMENT SYSTEM - BACKEND START   ');
  console.log('----------------------------------------------------');

  // Connect MongoDB Atlas & initialize empty cluster if needed
  const dbReady = await connectDB();
  if (dbReady) {
    await seedIfEmpty();
  }

  // Initialize Neo4j Driver
  initNeo4j();

  // Initialize Overdue Scheduler
  initScheduler();

  const server = app.listen(PORT, () => {
    console.log(`[Express] Server running on http://localhost:${PORT}`);
    console.log(`[Express] Health check available at http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('\n[Express] Graceful shutdown initiated...');
    server.close(async () => {
      await closeNeo4j();
      console.log('[Express] Server shut down gracefully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();

module.exports = app;
