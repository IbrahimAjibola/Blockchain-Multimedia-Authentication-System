const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to authenticate Web3 wallet signature
 */
const authenticateWallet = async (req, res, next) => {
  try {
    const { address, signature, message, nonce } = req.body;

    if (!address || !signature || !message || !nonce) {
      return res.status(400).json({ 
        error: 'Missing required authentication parameters' 
      });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if nonce is valid (you might want to implement nonce validation)
    // For now, we'll just verify the signature

    // Create user object
    req.user = {
      address: address.toLowerCase(),
      type: 'wallet'
    };

    next();
  } catch (error) {
    console.error('Wallet authentication error:', error);
    return res.status(401).json({ error: 'Invalid wallet authentication' });
  }
};

/**
 * Middleware to authenticate either JWT or Web3 wallet
 */
const authenticateUser = async (req, res, next) => {
  // Check for JWT token first
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      // JWT failed, try wallet authentication
    }
  }

  // Try wallet authentication
  try {
    const { address, signature, message, nonce } = req.body;

    if (address && signature && message && nonce) {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
        req.user = {
          address: address.toLowerCase(),
          type: 'wallet'
        };
        return next();
      }
    }
  } catch (error) {
    console.error('Wallet authentication error:', error);
  }

  return res.status(401).json({ error: 'Authentication required' });
};

/**
 * Middleware to check if user is the owner of a resource
 */
const checkOwnership = (resourceField = 'uploader') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userAddress = req.user.address || req.user.id;
    
    if (req.params[resourceField] && req.params[resourceField] !== userAddress) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

/**
 * Middleware to check if user has admin privileges
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user is admin (you can implement your own admin logic)
  const adminAddresses = process.env.ADMIN_ADDRESSES ? 
    process.env.ADMIN_ADDRESSES.split(',') : [];

  if (!adminAddresses.includes(req.user.address)) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  next();
};

/**
 * Middleware to rate limit requests
 */
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(key)) {
      requests.set(key, requests.get(key).filter(time => time > windowStart));
    } else {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);
    
    if (userRequests.length >= max) {
      return res.status(429).json({ 
        error: 'Too many requests, please try again later' 
      });
    }

    userRequests.push(now);
    next();
  };
};

/**
 * Middleware to validate file upload
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Check file size
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (req.file.size > maxSize) {
    return res.status(400).json({ 
      error: 'File size too large. Maximum size is 100MB.' 
    });
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/mp3'
  ];

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: 'Invalid file type. Only images, videos, and audio files are allowed.' 
    });
  }

  next();
};

/**
 * Middleware to log requests
 */
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};

/**
 * Middleware to handle CORS
 */
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

/**
 * Middleware to validate blockchain address
 */
const validateAddress = (req, res, next) => {
  const { address } = req.params;

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid blockchain address' });
  }

  next();
};

/**
 * Middleware to validate IPFS hash
 */
const validateIPFSHash = (req, res, next) => {
  const { ipfsHash } = req.params;

  // Basic IPFS hash validation (starts with Qm and is 46 characters)
  if (!ipfsHash || !ipfsHash.startsWith('Qm') || ipfsHash.length !== 46) {
    return res.status(400).json({ error: 'Invalid IPFS hash' });
  }

  next();
};

/**
 * Middleware to validate token ID
 */
const validateTokenId = (req, res, next) => {
  const { tokenId } = req.params;

  if (!tokenId || isNaN(tokenId) || parseInt(tokenId) < 0) {
    return res.status(400).json({ error: 'Invalid token ID' });
  }

  next();
};

module.exports = {
  authenticateToken,
  authenticateWallet,
  authenticateUser,
  checkOwnership,
  requireAdmin,
  rateLimit,
  validateFileUpload,
  logRequest,
  corsOptions,
  validateAddress,
  validateIPFSHash,
  validateTokenId
}; 