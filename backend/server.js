const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const { env } = require('./config/env');
const logger = require('./config/logger');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const donationRoutes = require('./routes/donationRoutes');
const contactRoutes = require('./routes/contactRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const pickupRoutes = require('./routes/pickupRoutes');
const Donation = require('./models/Donation');

const app = express();
const server = http.createServer(app);
let isShuttingDown = false;

const productionOrigin = env.CLIENT_URL;
const developmentOrigins = ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = env.NODE_ENV === 'production'
  ? [productionOrigin]
  : [...developmentOrigins, productionOrigin];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

connectDB();

const AUTO_EXPIRE_INTERVAL_MS = 10 * 60 * 1000;
const NON_EXPIRABLE_STATUSES = ['delivered', 'cancelled', 'expired'];

async function runAutoExpireJob() {
  try {
    const result = await Donation.updateMany(
      {
        pickupTime: { $lt: new Date() },
        status: { $nin: NON_EXPIRABLE_STATUSES }
      },
      {
        $set: {
          status: 'expired',
          priorityScore: 0
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Auto-expire job updated ${result.modifiedCount} donation(s)`);
    }
  } catch (error) {
    logger.error('Auto-expire background job error:', error);
  }
}

const autoExpireInterval = setInterval(runAutoExpireJob, AUTO_EXPIRE_INTERVAL_MS);
const autoExpireWarmupTimeout = setTimeout(runAutoExpireJob, 15 * 1000);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin/non-browser requests (no Origin header) and known front-end origins.
    const isAllowed = !origin || allowedOrigins.includes(origin);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(helmet());

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", ...allowedOrigins]
  }
}));

app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

app.use(hpp());

const morgan = require('morgan');
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev', { stream: logger.stream }));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pickups', pickupRoutes);

const { errorHandler } = require('./middleware/errorHandler');

app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    success: true,
    message: 'FoodBridge API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0',
    services: {
      database: {
        status: dbStatus,
        name: 'MongoDB'
      },
      socket: {
        status: 'active'
      }
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress. Ignoring ${signal}.`);
    return;
  }
  isShuttingDown = true;

  logger.info(`\n${signal} received. Shutting down gracefully...`);
  clearInterval(autoExpireInterval);
  clearTimeout(autoExpireWarmupTimeout);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

const PORT = env.PORT;
const RESOLVED_PORT = Number(process.env.PORT) || PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${RESOLVED_PORT} is already in use.`);
    process.exit(1);
  }
  logger.error('Server startup error:', err);
  process.exit(1);
});

server.listen(RESOLVED_PORT, () => {
  logger.info(`Server running on port ${RESOLVED_PORT} in ${env.NODE_ENV} mode`);
  logger.info(`Health check available at http://localhost:${RESOLVED_PORT}/api/health`);
});

module.exports = { app, server };
