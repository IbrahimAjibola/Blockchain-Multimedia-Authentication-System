const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const assetsRoutes = require('./routes/assets');
const registerRoutes = require('./routes/register');
const verifyRoutes = require('./routes/verify');

// Import middleware
const { logRequest, corsOptions } = require('./middleware/auth');

// Import database connection
const { connectDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "ipfs.io", "gateway.ipfs.io"],
      connectSrc: ["'self'", "https://ipfs.io", "https://gateway.ipfs.io"]
    }
  }
}));

// CORS configuration
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));
app.use(logRequest);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/verify', verifyRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Blockchain Multimedia Authentication API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      assets: '/api/assets',
      register: '/api/register',
      verify: '/api/verify'
    },
    documentation: '/api/docs'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist.`,
    availableEndpoints: [
      'GET /health',
      'GET /',
      'GET /api/assets',
      'POST /api/register',
      'POST /api/verify'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'The uploaded file exceeds the maximum allowed size of 100MB.'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      message: 'The uploaded file field name is not expected.'
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message,
      details: error.details
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided authentication token is invalid.'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'The provided authentication token has expired.'
    });
  }

  // Handle MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate entry',
        message: 'A record with this information already exists.'
      });
    }
  }

  // Handle IPFS errors
  if (error.message && error.message.includes('IPFS')) {
    return res.status(503).json({
      error: 'IPFS service error',
      message: 'Unable to interact with IPFS. Please try again later.'
    });
  }

  // Handle blockchain errors
  if (error.message && error.message.includes('blockchain')) {
    return res.status(503).json({
      error: 'Blockchain service error',
      message: 'Unable to interact with blockchain. Please try again later.'
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log configuration
  console.log('📋 Configuration:');
  console.log(`   - MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log(`   - IPFS: ${process.env.IPFS_HOST ? 'Configured' : 'Not configured'}`);
  console.log(`   - Blockchain: ${process.env.NETWORK || 'Not configured'}`);
  console.log(`   - Rate Limiting: ${limiter.max} requests per ${limiter.windowMs / 1000 / 60} minutes`);
});

module.exports = app; 