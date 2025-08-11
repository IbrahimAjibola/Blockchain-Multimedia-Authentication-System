const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const ipfsService = require('../services/ipfsService');
const blockchainService = require('../services/blockchainService');
const Asset = require('../models/Asset');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and audio files
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Upload and mint new asset
router.post('/upload', 
  authenticateToken,
  upload.single('file'),
  [
    body('originalCreator').notEmpty().withMessage('Original creator is required'),
    body('description').optional().isString(),
    body('tags').optional().isArray(),
    body('licenseType').optional().isString(),
    body('licensePrice').optional().isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const {
        originalCreator,
        description,
        tags,
        licenseType,
        licensePrice
      } = req.body;

      // Upload file to IPFS
      const uploadResult = await ipfsService.uploadFile(
        req.file.buffer,
        req.file.originalname
      );

      // Create metadata
      const metadata = {
        name: req.file.originalname,
        description: description || '',
        originalCreator,
        tags: tags ? JSON.parse(tags) : [],
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadDate: new Date().toISOString(),
        uploader: req.user.address
      };

      // Upload metadata to IPFS
      const metadataResult = await ipfsService.uploadMetadata(metadata);

      // Generate provenance hash
      const provenanceHash = ipfsService.generateProvenanceHash(
        req.file.buffer,
        metadata
      );

      // Mint NFT on blockchain
      const mintResult = await blockchainService.mintAsset({
        ipfsHash: uploadResult.ipfsHash,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        originalCreator,
        provenanceHash,
        tokenURI: metadataResult.ipfsHash
      });

      // Save to database
      const asset = new Asset({
        tokenId: mintResult.tokenId,
        ipfsHash: uploadResult.ipfsHash,
        metadataHash: metadataResult.ipfsHash,
        originalCreator,
        uploader: req.user.address,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        description: description || '',
        tags: tags ? JSON.parse(tags) : [],
        transactionHash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        isLicensed: false,
        licenseType: licenseType || '',
        licensePrice: licensePrice || 0
      });

      await asset.save();

      res.status(201).json({
        success: true,
        asset: {
          tokenId: asset.tokenId,
          ipfsHash: asset.ipfsHash,
          metadataHash: asset.metadataHash,
          originalCreator: asset.originalCreator,
          fileType: asset.fileType,
          fileSize: asset.fileSize,
          transactionHash: asset.transactionHash,
          gatewayUrl: ipfsService.getGatewayUrl(asset.ipfsHash)
        }
      });

    } catch (error) {
      console.error('Asset upload error:', error);
      res.status(500).json({ error: 'Failed to upload asset' });
    }
  }
);

// Get all assets
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, creator, fileType } = req.query;
    
    const query = {};
    if (creator) query.originalCreator = creator;
    if (fileType) query.fileType = fileType;

    const assets = await Asset.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Asset.countDocuments(query);

    res.json({
      assets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ error: 'Failed to get assets' });
  }
});

// Get asset by token ID
router.get('/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Get from database
    const asset = await Asset.findOne({ tokenId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Get blockchain data
    const blockchainAsset = await blockchainService.getAsset(tokenId);
    const licenses = await blockchainService.getTokenLicenses(tokenId);

    // Get metadata from IPFS
    const metadata = await ipfsService.getMetadata(asset.metadataHash);

    res.json({
      ...asset.toObject(),
      blockchainData: blockchainAsset,
      licenses,
      metadata,
      gatewayUrl: ipfsService.getGatewayUrl(asset.ipfsHash)
    });
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ error: 'Failed to get asset' });
  }
});

// Get user's assets
router.get('/user/:address', authenticateToken, async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const rawAssets = await Asset.find({ uploader: address })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Transform assets to include type and metadata fields expected by frontend
    const assets = rawAssets.map(asset => ({
      ...asset.toObject(),
      type: asset.mimeType?.startsWith('image/') ? 'image' : 
            asset.mimeType?.startsWith('video/') ? 'video' :
            asset.mimeType?.startsWith('audio/') ? 'audio' : 'document',
      metadata: {
        description: asset.description || asset.originalName,
        name: asset.originalName,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
        dimensions: asset.dimensions,
        duration: asset.duration
      }
    }));

    const total = await Asset.countDocuments({ uploader: address });

    res.json({
      assets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get user assets error:', error);
    res.status(500).json({ error: 'Failed to get user assets' });
  }
});

// Update asset metadata
router.put('/:tokenId', 
  authenticateToken,
  [
    body('description').optional().isString(),
    body('tags').optional().isArray(),
    body('licenseType').optional().isString(),
    body('licensePrice').optional().isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tokenId } = req.params;
      const { description, tags, licenseType, licensePrice } = req.body;

      const asset = await Asset.findOne({ tokenId });
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      if (asset.uploader !== req.user.address) {
        return res.status(403).json({ error: 'Not authorized to update this asset' });
      }

      // Update database
      if (description !== undefined) asset.description = description;
      if (tags !== undefined) asset.tags = tags;
      if (licenseType !== undefined) asset.licenseType = licenseType;
      if (licensePrice !== undefined) asset.licensePrice = licensePrice;

      await asset.save();

      // Update blockchain if license info changed
      if (licenseType !== undefined || licensePrice !== undefined) {
        await blockchainService.setLicense(tokenId, {
          isLicensed: licenseType && licenseType !== '',
          licensePrice: licensePrice || 0,
          licenseType: licenseType || ''
        });
      }

      res.json({ success: true, asset });
    } catch (error) {
      console.error('Update asset error:', error);
      res.status(500).json({ error: 'Failed to update asset' });
    }
  }
);

// Download asset file
router.get('/:tokenId/download', async (req, res) => {
  try {
    const { tokenId } = req.params;

    const asset = await Asset.findOne({ tokenId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const fileBuffer = await ipfsService.getFile(asset.ipfsHash);
    
    res.setHeader('Content-Type', asset.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${asset.originalName || 'asset'}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download asset error:', error);
    res.status(500).json({ error: 'Failed to download asset' });
  }
});

// Serve asset file for display
router.get('/:tokenId/file', async (req, res) => {
  try {
    const { tokenId } = req.params;

    const asset = await Asset.findOne({ tokenId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const fileBuffer = await ipfsService.getFile(asset.ipfsHash);
    
    res.setHeader('Content-Type', asset.fileType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(fileBuffer);
  } catch (error) {
    console.error('Serve asset file error:', error);
    res.status(500).json({ error: 'Failed to serve asset file' });
  }
});

// Verify asset authenticity
router.get('/:tokenId/verify', async (req, res) => {
  try {
    const { tokenId } = req.params;

    const asset = await Asset.findOne({ tokenId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Get blockchain data
    const blockchainAsset = await blockchainService.getAsset(tokenId);
    
    // Verify IPFS hash exists on blockchain
    const hashExists = await blockchainService.checkIPFSHashExists(asset.ipfsHash);
    
    // Get current file from IPFS
    const currentFile = await ipfsService.getFile(asset.ipfsHash);
    const currentHash = ipfsService.generateProvenanceHash(currentFile, {});

    const verification = {
      tokenId,
      ipfsHash: asset.ipfsHash,
      blockchainVerified: hashExists,
      fileIntegrity: currentHash === asset.provenanceHash,
      blockchainData: blockchainAsset,
      verified: hashExists && currentHash === asset.provenanceHash
    };

    res.json(verification);
  } catch (error) {
    console.error('Verify asset error:', error);
    res.status(500).json({ error: 'Failed to verify asset' });
  }
});

module.exports = router; 