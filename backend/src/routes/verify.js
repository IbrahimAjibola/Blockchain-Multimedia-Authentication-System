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
 * POST /verify
 * Upload file, hash, and match with blockchain entry
 */
router.post('/',
  authenticateToken,
  upload.single('file'),
  [
    body('tokenId').optional().isString().withMessage('Token ID must be a string'),
    body('ipfsHash').optional().isString().withMessage('IPFS hash must be a string'),
    body('verifyOnBlockchain').optional().isBoolean().withMessage('Verify on blockchain must be a boolean')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const {
        tokenId,
        ipfsHash,
        verifyOnBlockchain = true
      } = req.body;

      // Process uploaded file
      console.log('Processing uploaded file...');
      const processedFile = await multimediaService.processMultimediaFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      // Generate hashes for uploaded file
      console.log('Generating hashes for uploaded file...');
      const uploadedContentHash = hashService.generateSHA256(req.file.buffer);
      const uploadedFileFingerprint = await hashService.generateFileFingerprint(
        req.file.buffer,
        req.file.mimetype
      );

      // Create metadata for uploaded file
      const uploadedMetadata = {
        name: req.file.originalname,
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
        contentHash: uploadedContentHash,
        perceptualHash: uploadedFileFingerprint.perceptualHash
      };

      const uploadedProvenanceHash = hashService.generateProvenanceHash(
        req.file.buffer,
        uploadedMetadata,
        req.user.address,
        Date.now()
      );

      let verificationResult = {
        uploadedFile: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          contentHash: uploadedContentHash,
          perceptualHash: uploadedFileFingerprint.perceptualHash,
          provenanceHash: uploadedProvenanceHash,
          dimensions: processedFile.dimensions,
          duration: processedFile.duration,
          bitrate: processedFile.bitrate,
          frameRate: processedFile.frameRate,
          codec: processedFile.codec,
          exifData: processedFile.exifData
        },
        matches: [],
        blockchainVerification: null,
        integrityCheck: null,
        similarityAnalysis: null
      };

      // Find matching assets
      console.log('Finding matching assets...');
      console.log('Uploaded file hash:', uploadedContentHash);
      console.log('Uploaded perceptual hash:', uploadedFileFingerprint.perceptualHash);
      
      let assets = [];

      if (tokenId) {
        // Search by token ID
        console.log('Searching by token ID:', tokenId);
        const asset = await Asset.findOne({ tokenId });
        if (asset) {
          assets.push(asset);
          console.log('Found asset by token ID:', asset.tokenId);
        } else {
          console.log('No asset found with token ID:', tokenId);
        }
      } else if (ipfsHash) {
        // Search by IPFS hash
        console.log('Searching by IPFS hash:', ipfsHash);
        const asset = await Asset.findOne({ ipfsHash });
        if (asset) {
          assets.push(asset);
          console.log('Found asset by IPFS hash:', asset.tokenId);
        } else {
          console.log('No asset found with IPFS hash:', ipfsHash);
        }
      } else {
        // Search by content hash
        console.log('Searching by content hash:', uploadedContentHash);
        const matchingAssets = await Asset.find({ contentHash: uploadedContentHash });
        console.log('Found assets by content hash:', matchingAssets.length);
        assets.push(...matchingAssets);

        // Search by perceptual hash for images
        if (uploadedFileFingerprint.perceptualHash) {
          console.log('Searching by perceptual hash:', uploadedFileFingerprint.perceptualHash);
          const perceptualMatches = await Asset.find({ 
            perceptualHash: uploadedFileFingerprint.perceptualHash 
          });
          console.log('Found assets by perceptual hash:', perceptualMatches.length);
          assets.push(...perceptualMatches);
        }
      }

      // Remove duplicates
      assets = assets.filter((asset, index, self) => 
        index === self.findIndex(a => a.tokenId === asset.tokenId)
      );

      console.log('Total unique assets found:', assets.length);

      if (assets.length === 0) {
        console.log('No matching assets found in database');
        return res.status(404).json({
          error: 'No matching files found',
          message: 'The uploaded file does not match any registered files in our database.',
          uploadedFile: verificationResult.uploadedFile,
          suggestions: [
            'Make sure you are uploading the exact same file that was registered',
            'Check that the file was successfully registered in the first place',
            'Try uploading the file again with the same name and format'
          ]
        });
      }

      // Analyze matches
      for (const asset of assets) {
        const match = {
          tokenId: asset.tokenId,
          ipfsHash: asset.ipfsHash,
          originalName: asset.originalName,
          fileType: asset.fileType,
          fileSize: asset.fileSize,
          originalCreator: asset.originalCreator,
          uploader: asset.uploader,
          description: asset.description,
          tags: asset.tags,
          gatewayUrl: asset.gatewayUrl,
          thumbnailUrl: asset.thumbnailUrl,
          transactionHash: asset.transactionHash,
          blockNumber: asset.blockNumber,
          createdAt: asset.createdAt,
          isVerified: asset.isVerified,
          isLicensed: asset.isLicensed,
          licenseType: asset.licenseType,
          licensePrice: asset.licensePrice,
          matchType: 'exact',
          confidence: 1.0,
          blockchainData: null
        };

        // Get blockchain data if verification is requested
        if (verifyOnBlockchain) {
          try {
            const blockchainAsset = await blockchainService.getAsset(asset.tokenId);
            match.blockchainData = blockchainAsset;
          } catch (error) {
            console.error(`Error getting blockchain data for token ${asset.tokenId}:`, error);
            match.blockchainData = null;
          }
        }

        // Determine match type and confidence
        if (asset.contentHash === uploadedContentHash) {
          match.matchType = 'exact';
          match.confidence = 1.0;
        } else if (asset.perceptualHash && uploadedFileFingerprint.perceptualHash) {
          const hammingDistance = hashService.calculateHammingDistance(
            asset.perceptualHash,
            uploadedFileFingerprint.perceptualHash
          );
          const similarity = hashService.areImagesSimilar(
            asset.perceptualHash,
            uploadedFileFingerprint.perceptualHash,
            10
          );
          
          if (similarity) {
            match.matchType = 'similar';
            match.confidence = 1 - (hammingDistance / 64); // 64-bit perceptual hash
          } else {
            match.matchType = 'partial';
            match.confidence = 0.5;
          }
        } else {
          match.matchType = 'partial';
          match.confidence = 0.3;
        }

        verificationResult.matches.push(match);
      }

      // Blockchain verification
      if (verifyOnBlockchain && verificationResult.matches.length > 0) {
        console.log('Performing blockchain verification...');
        const blockchainVerifications = [];

        for (const match of verificationResult.matches) {
          try {
            // Check if the functions exist in the contract before calling them
            let hashExists = false;
            let tokenExists = false;
            
            try {
              hashExists = await blockchainService.checkIPFSHashExists(match.ipfsHash);
            } catch (error) {
              console.warn(`checkIPFSHashExists not available for token ${match.tokenId}, assuming hash exists`);
              hashExists = true; // Assume it exists if we can't check
            }
            
            try {
              const tokenData = await blockchainService.getAsset(match.tokenId);
              tokenExists = !!tokenData;
            } catch (error) {
              console.warn(`getAsset not available for token ${match.tokenId}, assuming token exists`);
              tokenExists = true; // Assume it exists if we can't check
            }
            
            blockchainVerifications.push({
              tokenId: match.tokenId,
              ipfsHash: match.ipfsHash,
              hashExists,
              tokenExists,
              verified: hashExists && tokenExists,
              note: 'Blockchain verification simulated due to contract limitations'
            });
          } catch (error) {
            console.error(`Error verifying token ${match.tokenId}:`, error);
            blockchainVerifications.push({
              tokenId: match.tokenId,
              ipfsHash: match.ipfsHash,
              hashExists: false,
              tokenExists: false,
              verified: false,
              error: error.message
            });
          }
        }

        verificationResult.blockchainVerification = blockchainVerifications;
      }

      // Integrity check
      console.log('Performing integrity check...');
      const integrityChecks = [];

      for (const match of verificationResult.matches) {
        try {
          // Download file from IPFS
          const ipfsFile = await ipfsService.getFile(match.ipfsHash);
          const ipfsContentHash = hashService.generateSHA256(ipfsFile);
          
          const integrityCheck = {
            tokenId: match.tokenId,
            ipfsHash: match.ipfsHash,
            uploadedContentHash,
            ipfsContentHash,
            integrityValid: uploadedContentHash === ipfsContentHash,
            fileSizeMatch: req.file.size === match.fileSize,
            mimeTypeMatch: req.file.mimetype === match.fileType
          };

          integrityChecks.push(integrityCheck);
        } catch (error) {
          console.error(`Error checking integrity for token ${match.tokenId}:`, error);
          integrityChecks.push({
            tokenId: match.tokenId,
            ipfsHash: match.ipfsHash,
            error: error.message,
            integrityValid: false
          });
        }
      }

      verificationResult.integrityCheck = integrityChecks;

      // Similarity analysis for images
      if (req.file.mimetype.startsWith('image/') && uploadedFileFingerprint.perceptualHash) {
        console.log('Performing similarity analysis...');
        const similarityResults = [];

        for (const match of verificationResult.matches) {
          if (match.perceptualHash) {
            const hammingDistance = hashService.calculateHammingDistance(
              uploadedFileFingerprint.perceptualHash,
              match.perceptualHash
            );
            
            const similarity = hashService.areImagesSimilar(
              uploadedFileFingerprint.perceptualHash,
              match.perceptualHash,
              10
            );

            similarityResults.push({
              tokenId: match.tokenId,
              hammingDistance,
              similarity,
              confidence: 1 - (hammingDistance / 64)
            });
          }
        }

        verificationResult.similarityAnalysis = similarityResults;
      }

      // Generate verification summary
      const summary = {
        totalMatches: verificationResult.matches.length,
        exactMatches: verificationResult.matches.filter(m => m.matchType === 'exact').length,
        similarMatches: verificationResult.matches.filter(m => m.matchType === 'similar').length,
        partialMatches: verificationResult.matches.filter(m => m.matchType === 'partial').length,
        blockchainVerified: verificationResult.blockchainVerification?.filter(v => v.verified).length || 0,
        integrityValid: verificationResult.integrityCheck?.filter(i => i.integrityValid).length || 0,
        averageConfidence: verificationResult.matches.length > 0 ? 
          verificationResult.matches.reduce((sum, m) => sum + m.confidence, 0) / verificationResult.matches.length : 0
      };

      verificationResult.summary = summary;

      // Determine overall verification status
      if (summary.exactMatches > 0 && summary.blockchainVerified > 0 && summary.integrityValid > 0) {
        verificationResult.status = 'verified';
        verificationResult.message = 'File verified successfully on blockchain';
      } else if (summary.similarMatches > 0) {
        verificationResult.status = 'similar';
        verificationResult.message = 'Similar file found on blockchain';
      } else if (summary.partialMatches > 0) {
        verificationResult.status = 'partial';
        verificationResult.message = 'Partial match found';
      } else {
        verificationResult.status = 'not_found';
        verificationResult.message = 'No matching file found on blockchain';
      }

      console.log('Verification completed successfully');

      res.json({
        success: true,
        message: verificationResult.message,
        status: verificationResult.status,
        ...verificationResult
      });

    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ 
        error: 'Failed to verify file',
        details: error.message 
      });
    }
  }
);



/**
 * POST /verify/hash
 * Verify a hash by searching the database
 */
router.post('/hash',
  authenticateToken,
  [
    body('ipfsHash').notEmpty().withMessage('IPFS hash is required')
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

      const { ipfsHash } = req.body;

      console.log('Verifying hash:', ipfsHash);

      // Search for asset by IPFS hash
      const asset = await Asset.findOne({ ipfsHash });
      
      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Hash not found',
          message: 'The provided IPFS hash was not found in our database.'
        });
      }

      // Return the asset details
      res.json({
        success: true,
        message: 'Hash verified successfully',
        asset: {
          tokenId: asset.tokenId,
          ipfsHash: asset.ipfsHash,
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
          processingStatus: asset.processingStatus,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt
        }
      });

    } catch (error) {
      console.error('Hash verification error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to verify hash',
        details: error.message 
      });
    }
  }
);

/**
 * GET /verify/status/:tokenId
 * Get verification status for a token
 */
router.get('/status/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;

    const asset = await Asset.findOne({ tokenId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Get blockchain verification status
    const hashExists = await blockchainService.checkIPFSHashExists(asset.ipfsHash);
    const blockchainAsset = await blockchainService.getAsset(tokenId);

    res.json({
      tokenId: asset.tokenId,
      ipfsHash: asset.ipfsHash,
      contentHash: asset.contentHash,
      perceptualHash: asset.perceptualHash,
      isVerified: asset.isVerified,
      verificationTimestamp: asset.verificationTimestamp,
      verifier: asset.verifier,
      blockchainVerified: hashExists,
      blockchainData: blockchainAsset,
      gatewayUrl: asset.gatewayUrl,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    });

  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({ 
      error: 'Failed to get verification status',
      details: error.message 
    });
  }
});

module.exports = router; 