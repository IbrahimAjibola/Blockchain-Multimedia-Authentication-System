const crypto = require('crypto');
const sharp = require('sharp');
const { createHash } = require('crypto');

class HashService {
  /**
   * Generate SHA-256 hash of file buffer
   * @param {Buffer} fileBuffer - File buffer
   * @returns {string} SHA-256 hash
   */
  generateSHA256(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Generate content hash combining file and metadata
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} metadata - File metadata
   * @returns {string} Content hash
   */
  generateContentHash(fileBuffer, metadata) {
    const combinedData = Buffer.concat([
      fileBuffer,
      Buffer.from(JSON.stringify(metadata, Object.keys(metadata).sort()))
    ]);
    return crypto.createHash('sha256').update(combinedData).digest('hex');
  }

  /**
   * Generate provenance hash for tracking file history
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} metadata - File metadata
   * @param {string} uploader - Uploader address
   * @param {number} timestamp - Upload timestamp
   * @returns {string} Provenance hash
   */
  generateProvenanceHash(fileBuffer, metadata, uploader, timestamp) {
    const provenanceData = {
      contentHash: this.generateContentHash(fileBuffer, metadata),
      uploader,
      timestamp,
      metadata
    };
    return crypto.createHash('sha256').update(JSON.stringify(provenanceData)).digest('hex');
  }

  /**
   * Generate perceptual hash for image similarity detection
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<string>} Perceptual hash
   */
  async generatePerceptualHash(imageBuffer) {
    try {
      // Resize image to 8x8 for hash generation
      const resized = await sharp(imageBuffer)
        .resize(8, 8, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();

      // Calculate average pixel value
      const pixels = new Uint8Array(resized);
      const average = pixels.reduce((sum, pixel) => sum + pixel, 0) / pixels.length;

      // Generate hash based on pixel values above/below average
      let hash = '';
      for (let i = 0; i < pixels.length; i++) {
        hash += pixels[i] > average ? '1' : '0';
      }

      return hash;
    } catch (error) {
      console.error('Error generating perceptual hash:', error);
      return null;
    }
  }

  /**
   * Calculate Hamming distance between two perceptual hashes
   * @param {string} hash1 - First perceptual hash
   * @param {string} hash2 - Second perceptual hash
   * @returns {number} Hamming distance
   */
  calculateHammingDistance(hash1, hash2) {
    if (hash1.length !== hash2.length) {
      throw new Error('Hash lengths must be equal');
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    return distance;
  }

  /**
   * Check if two images are similar based on perceptual hash
   * @param {string} hash1 - First perceptual hash
   * @param {string} hash2 - Second perceptual hash
   * @param {number} threshold - Similarity threshold (default: 10)
   * @returns {boolean} True if images are similar
   */
  areImagesSimilar(hash1, hash2, threshold = 10) {
    const distance = this.calculateHammingDistance(hash1, hash2);
    return distance <= threshold;
  }

  /**
   * Generate file fingerprint for duplicate detection
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} mimeType - File MIME type
   * @returns {Promise<Object>} File fingerprint
   */
  async generateFileFingerprint(fileBuffer, mimeType) {
    const sha256 = this.generateSHA256(fileBuffer);
    let perceptualHash = null;

    // Generate perceptual hash for images
    if (mimeType.startsWith('image/')) {
      perceptualHash = await this.generatePerceptualHash(fileBuffer);
    }

    return {
      sha256,
      perceptualHash,
      fileSize: fileBuffer.length,
      mimeType
    };
  }

  /**
   * Generate metadata hash
   * @param {Object} metadata - File metadata
   * @returns {string} Metadata hash
   */
  generateMetadataHash(metadata) {
    const sortedMetadata = JSON.stringify(metadata, Object.keys(metadata).sort());
    return crypto.createHash('sha256').update(sortedMetadata).digest('hex');
  }

  /**
   * Generate verification hash for blockchain verification
   * @param {string} ipfsHash - IPFS hash
   * @param {string} contentHash - Content hash
   * @param {string} uploader - Uploader address
   * @param {number} timestamp - Upload timestamp
   * @returns {string} Verification hash
   */
  generateVerificationHash(ipfsHash, contentHash, uploader, timestamp) {
    const verificationData = {
      ipfsHash,
      contentHash,
      uploader,
      timestamp
    };
    return crypto.createHash('sha256').update(JSON.stringify(verificationData)).digest('hex');
  }

  /**
   * Generate Merkle root for batch verification
   * @param {Array<string>} hashes - Array of hashes
   * @returns {string} Merkle root
   */
  generateMerkleRoot(hashes) {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const merkleTree = [];
    merkleTree.push(hashes);

    let currentLevel = hashes;
    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combined = left + right;
        nextLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
      }
      merkleTree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Generate proof of existence hash
   * @param {string} ipfsHash - IPFS hash
   * @param {string} contentHash - Content hash
   * @param {number} blockNumber - Blockchain block number
   * @returns {string} Proof of existence hash
   */
  generateProofOfExistence(ipfsHash, contentHash, blockNumber) {
    const proofData = {
      ipfsHash,
      contentHash,
      blockNumber,
      timestamp: Date.now()
    };
    return crypto.createHash('sha256').update(JSON.stringify(proofData)).digest('hex');
  }

  /**
   * Verify file integrity
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} expectedHash - Expected hash
   * @returns {boolean} True if file integrity is valid
   */
  verifyFileIntegrity(fileBuffer, expectedHash) {
    const actualHash = this.generateSHA256(fileBuffer);
    return actualHash === expectedHash;
  }

  /**
   * Generate hash chain for file versioning
   * @param {Array<Object>} versions - Array of file versions
   * @returns {string} Hash chain
   */
  generateHashChain(versions) {
    if (versions.length === 0) return '';

    let chain = versions[0].hash;
    for (let i = 1; i < versions.length; i++) {
      const previousChain = chain;
      const currentHash = versions[i].hash;
      chain = crypto.createHash('sha256').update(previousChain + currentHash).digest('hex');
    }

    return chain;
  }

  /**
   * Generate timestamped hash
   * @param {string} hash - Original hash
   * @param {number} timestamp - Timestamp
   * @returns {string} Timestamped hash
   */
  generateTimestampedHash(hash, timestamp) {
    const timestampedData = {
      hash,
      timestamp
    };
    return crypto.createHash('sha256').update(JSON.stringify(timestampedData)).digest('hex');
  }

  /**
   * Generate batch hash for multiple files
   * @param {Array<Object>} files - Array of file objects with hashes
   * @returns {string} Batch hash
   */
  generateBatchHash(files) {
    const batchData = files.map(file => ({
      ipfsHash: file.ipfsHash,
      contentHash: file.contentHash,
      timestamp: file.timestamp
    }));

    return crypto.createHash('sha256').update(JSON.stringify(batchData)).digest('hex');
  }
}

module.exports = new HashService(); 