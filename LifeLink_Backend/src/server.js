// src/server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`🚀 LifeLink server running on port ${PORT}`);
      logger.info(`📡 Socket.IO enabled`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to database:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = server;
