const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const ipfsService = require('../services/ipfsService');
const blockchainService = require('../services/blockchainService');
const hashService = require('../services/hashService');
const multimediaService = require('../services/multimediaService');
const Asset = require('../models/Asset');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and audio files
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/mp3'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and audio files are allowed.'), false);
    }
  }
});

/**
 * POST /register
 * Upload, hash, and mint NFT for multimedia file
 */
router.post('/',
  authenticateToken,
  upload.single('file'),
  [
    body('originalCreator').notEmpty().withMessage('Original creator is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('tags').optional().custom((value) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          throw new Error('Tags must be a valid JSON array');
        }
      }
      return value;
    }).withMessage('Tags must be an array'),
    body('licenseType').optional().isString().withMessage('License type must be a string'),
    body('licensePrice').optional().isNumeric().withMessage('License price must be a number'),
    body('optimize').optional().isBoolean().withMessage('Optimize must be a boolean')
  ],
  async (req, res) => {
    try {
      console.log('Registration request received:', {
        hasFile: !!req.file,
        fileSize: req.file?.size,
        fileName: req.file?.originalname,
        body: req.body,
        user: req.user
      });

      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const {
        originalCreator,
        description = '',
        tags = [],
        licenseType = '',
        licensePrice = 0,
        optimize = false
      } = req.body;

      // Process multimedia file
      console.log('Processing multimedia file...');
      const processedFile = await multimediaService.processMultimediaFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      // Generate hashes
      console.log('Generating hashes...');
      const contentHash = hashService.generateSHA256(req.file.buffer);
      const fileFingerprint = await hashService.generateFileFingerprint(
        req.file.buffer,
        req.file.mimetype
      );

      // Create metadata
      const metadata = {
        name: req.file.originalname,
        description,
        originalCreator,
        tags: Array.isArray(tags) ? tags : JSON.parse(tags || '[]'),
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadDate: new Date().toISOString(),
        uploader: req.user.address,
        dimensions: processedFile.dimensions,
        duration: processedFile.duration,
        bitrate: processedFile.bitrate,
        frameRate: processedFile.frameRate,
        codec: processedFile.codec,
        exifData: processedFile.exifData,
        contentHash,
        perceptualHash: fileFingerprint.perceptualHash
      };

      // Generate provenance hash
      const provenanceHash = hashService.generateProvenanceHash(
        req.file.buffer,
        metadata,
        req.user.address,
        Date.now()
      );

      // Upload file to IPFS
      console.log('Uploading file to IPFS...');
      let fileBuffer = req.file.buffer;
      
      // Optimize image if requested
      if (optimize && processedFile.mimeType.startsWith('image/')) {
        fileBuffer = await multimediaService.optimizeImage(fileBuffer);
      }

      const uploadResult = await ipfsService.uploadFile(fileBuffer, req.file.originalname);

      // Upload metadata to IPFS
      console.log('Uploading metadata to IPFS...');
      const metadataResult = await ipfsService.uploadMetadata(metadata);

      // Check if IPFS hash already exists on blockchain
      console.log('Checking IPFS hash existence...');
      const hashExists = await blockchainService.checkIPFSHashExists(uploadResult.ipfsHash);
      if (hashExists) {
        return res.status(409).json({ 
          error: 'File already registered on blockchain',
          ipfsHash: uploadResult.ipfsHash 
        });
      }

      // Mint NFT on blockchain
      console.log('Minting NFT on blockchain...');
      const mintResult = await blockchainService.mintAsset({
        ipfsHash: uploadResult.ipfsHash,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        originalCreator,
        provenanceHash,
        tokenURI: metadataResult.ipfsHash
      });

      // Upload thumbnail to IPFS if available
      let thumbnailHash = null;
      if (processedFile.thumbnail) {
        console.log('Uploading thumbnail to IPFS...');
        const thumbnailResult = await ipfsService.uploadFile(
          processedFile.thumbnail,
          `thumb_${req.file.originalname}`
        );
        thumbnailHash = thumbnailResult.ipfsHash;
      }

      // Save to database
      console.log('Saving to database...');
      const asset = new Asset({
        tokenId: mintResult.tokenId,
        ipfsHash: uploadResult.ipfsHash,
        metadataHash: metadataResult.ipfsHash,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        originalCreator,
        uploader: req.user.address,
        description,
        tags: Array.isArray(tags) ? tags : JSON.parse(tags || '[]'),
        provenanceHash,
        contentHash,
        perceptualHash: fileFingerprint.perceptualHash,
        isLicensed: licenseType && licenseType !== '',
        licenseType,
        licensePrice: parseFloat(licensePrice) || 0,
        transactionHash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        network: process.env.NETWORK || 'sepolia',
        status: 'registered',
        gatewayUrl: ipfsService.getGatewayUrl(uploadResult.ipfsHash),
        thumbnailUrl: thumbnailHash ? ipfsService.getGatewayUrl(thumbnailHash) : null,
        dimensions: processedFile.dimensions,
        duration: processedFile.duration,
        bitrate: processedFile.bitrate,
        frameRate: processedFile.frameRate,
        codec: processedFile.codec,
        exifData: processedFile.exifData,
        processingStatus: processedFile.processingStatus,
        processingError: processedFile.processingError
      });

      await asset.save();

      // Set license on blockchain if provided
      if (licenseType && licenseType !== '') {
        console.log('Setting license on blockchain...');
        await blockchainService.setLicense(mintResult.tokenId, {
          licenseType,
          licensePrice: parseFloat(licensePrice) || 0,
          duration: 86400, // 1 day default
          terms: `License for ${req.file.originalname}`
        });
      }

      console.log('Registration completed successfully');

      res.status(201).json({
        success: true,
        message: 'File registered and NFT minted successfully',
        asset: {
          tokenId: asset.tokenId,
          ipfsHash: asset.ipfsHash,
          metadataHash: asset.metadataHash,
          originalName: asset.originalName,
          fileType: asset.fileType,
          fileSize: asset.fileSize,
          originalCreator: asset.originalCreator,
          uploader: asset.uploader,
          description: asset.description,
          tags: asset.tags,
          transactionHash: asset.transactionHash,
          blockNumber: asset.blockNumber,
          gatewayUrl: asset.gatewayUrl,
          thumbnailUrl: asset.thumbnailUrl,
          dimensions: asset.dimensions,
          duration: asset.duration,
          isLicensed: asset.isLicensed,
          licenseType: asset.licenseType,
          licensePrice: asset.licensePrice,
          processingStatus: asset.processingStatus
        },
        blockchain: {
          tokenId: mintResult.tokenId,
          transactionHash: mintResult.transactionHash,
          blockNumber: mintResult.blockNumber
        },
        ipfs: {
          fileHash: uploadResult.ipfsHash,
          metadataHash: metadataResult.ipfsHash,
          thumbnailHash,
          gatewayUrl: asset.gatewayUrl
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: 'Failed to register file',
        details: error.message 
      });
    }
  }
);

/**
 * POST /register/batch
 * Register multiple files in batch
 */
router.post('/batch',
  authenticateToken,
  upload.array('files', 10), // Max 10 files
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
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const {
        originalCreator,
        description = '',
        tags = [],
        licenseType = '',
        licensePrice = 0
      } = req.body;

      const results = [];
      const fileErrors = [];

      // Process files sequentially to avoid overwhelming the blockchain
      for (let i = 0; i < req.files.length; i++) {
        try {
          const file = req.files[i];
          console.log(`Processing file ${i + 1}/${req.files.length}: ${file.originalname}`);

          // Process multimedia file
          const processedFile = await multimediaService.processMultimediaFile(
            file.buffer,
            file.mimetype,
            file.originalname
          );

          // Generate hashes
          const contentHash = hashService.generateSHA256(file.buffer);
          const fileFingerprint = await hashService.generateFileFingerprint(
            file.buffer,
            file.mimetype
          );

          // Create metadata
          const metadata = {
            name: file.originalname,
            description,
            originalCreator,
            tags: Array.isArray(tags) ? tags : JSON.parse(tags || '[]'),
            fileType: file.mimetype,
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
            uploader: req.user.address,
            dimensions: processedFile.dimensions,
            duration: processedFile.duration,
            bitrate: processedFile.bitrate,
            frameRate: processedFile.frameRate,
            codec: processedFile.codec,
            exifData: processedFile.exifData,
            contentHash,
            perceptualHash: fileFingerprint.perceptualHash
          };

          // Generate provenance hash
          const provenanceHash = hashService.generateProvenanceHash(
            file.buffer,
            metadata,
            req.user.address,
            Date.now()
          );

          // Upload file to IPFS
          const uploadResult = await ipfsService.uploadFile(file.buffer, file.originalname);

          // Upload metadata to IPFS
          const metadataResult = await ipfsService.uploadMetadata(metadata);

          // Check if IPFS hash already exists
          const hashExists = await blockchainService.checkIPFSHashExists(uploadResult.ipfsHash);
          if (hashExists) {
            fileErrors.push({
              file: file.originalname,
              error: 'File already registered on blockchain',
              ipfsHash: uploadResult.ipfsHash
            });
            continue;
          }

          // Mint NFT on blockchain
          const mintResult = await blockchainService.mintAsset({
            ipfsHash: uploadResult.ipfsHash,
            fileType: file.mimetype,
            fileSize: file.size,
            originalCreator,
            provenanceHash,
            tokenURI: metadataResult.ipfsHash
          });

          // Save to database
          const asset = new Asset({
            tokenId: mintResult.tokenId,
            ipfsHash: uploadResult.ipfsHash,
            metadataHash: metadataResult.ipfsHash,
            originalName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            mimeType: file.mimetype,
            originalCreator,
            uploader: req.user.address,
            description,
            tags: Array.isArray(tags) ? tags : JSON.parse(tags || '[]'),
            provenanceHash,
            contentHash,
            perceptualHash: fileFingerprint.perceptualHash,
            isLicensed: licenseType && licenseType !== '',
            licenseType,
            licensePrice: parseFloat(licensePrice) || 0,
            transactionHash: mintResult.transactionHash,
            blockNumber: mintResult.blockNumber,
            network: process.env.NETWORK || 'sepolia',
            status: 'registered',
            gatewayUrl: ipfsService.getGatewayUrl(uploadResult.ipfsHash),
            dimensions: processedFile.dimensions,
            duration: processedFile.duration,
            bitrate: processedFile.bitrate,
            frameRate: processedFile.frameRate,
            codec: processedFile.codec,
            exifData: processedFile.exifData,
            processingStatus: processedFile.processingStatus
          });

          await asset.save();

          results.push({
            file: file.originalname,
            tokenId: asset.tokenId,
            ipfsHash: asset.ipfsHash,
            transactionHash: asset.transactionHash,
            gatewayUrl: asset.gatewayUrl
          });

          // Add delay between transactions
          if (i < req.files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          fileErrors.push({
            file: file.originalname,
            error: error.message
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Batch registration completed. ${results.length} files registered successfully.`,
        results,
        errors: fileErrors.length > 0 ? fileErrors : undefined
      });

    } catch (error) {
      console.error('Batch registration error:', error);
      res.status(500).json({ 
        error: 'Failed to register files in batch',
        details: error.message 
      });
    }
  }
);

/**
 * GET /register/status/:tokenId
 * Get registration status for a token
 */
router.get('/status/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;

    const asset = await Asset.findOne({ tokenId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Get blockchain data
    const blockchainAsset = await blockchainService.getAsset(tokenId);
    const isVerified = await blockchainService.checkIPFSHashExists(asset.ipfsHash);

    res.json({
      tokenId: asset.tokenId,
      status: asset.status,
      isVerified,
      blockchainData: blockchainAsset,
      ipfsHash: asset.ipfsHash,
      gatewayUrl: asset.gatewayUrl,
      transactionHash: asset.transactionHash,
      blockNumber: asset.blockNumber,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check registration status',
      details: error.message 
    });
  }
});

module.exports = router; 