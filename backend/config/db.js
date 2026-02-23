const mongoose = require('mongoose');
const logger = require('./logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;
let retryCount = 0;

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    logger.error('MONGO_URI is not set in environment variables');
    process.exit(1);
  }

  const connectWithRetry = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });

      retryCount = 0;
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      logger.info(`Database: ${conn.connection.name}`);

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
        setTimeout(connectWithRetry, RETRY_DELAY_MS);
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected successfully');
      });

    } catch (error) {
      retryCount++;
      logger.error(`MongoDB connection attempt ${retryCount} failed:`, error.message);

      if (retryCount < MAX_RETRIES) {
        logger.info(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
        setTimeout(connectWithRetry, RETRY_DELAY_MS);
      } else {
        logger.error('Max retry attempts reached. Exiting...');
        process.exit(1);
      }
    }
  };

  await connectWithRetry();
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

module.exports = { connectDB, disconnectDB, getDBStatus };
