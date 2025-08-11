const express = require('express');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { body, validationResult } = require('express-validator');

const router = express.Router();

/**
 * POST /auth/login
 * Authenticate user with wallet signature
 */
router.post('/login',
  [
    body('address').notEmpty().withMessage('Wallet address is required'),
    body('signature').notEmpty().withMessage('Signature is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('nonce').notEmpty().withMessage('Nonce is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const { address, signature, message, nonce } = req.body;

      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          address: address.toLowerCase(),
          type: 'wallet',
          nonce 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: {
          address: address.toLowerCase(),
          type: 'wallet'
        }
      });

    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ 
        error: 'Authentication failed',
        details: error.message 
      });
    }
  }
);

/**
 * POST /auth/verify
 * Verify JWT token
 */
router.post('/verify',
  async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      res.json({
        success: true,
        user: decoded
      });

    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ 
        error: 'Invalid or expired token',
        details: error.message 
      });
    }
  }
);

/**
 * POST /auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout',
  async (req, res) => {
    try {
      // In a stateless JWT system, logout is handled client-side
      // by removing the token from storage
      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        error: 'Logout failed',
        details: error.message 
      });
    }
  }
);

module.exports = router;
