const sharp = require('sharp');
const crypto = require('crypto');

class IPFSService {
  constructor() {
    // Temporarily disable IPFS for development
    this.ipfs = null;
    console.log('IPFS service initialized (disabled for development)');
  }

  async uploadFile(fileBuffer, fileName) {
    try {
      // Generate content hash for provenance
      const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // For development, return a mock IPFS hash
      const mockIpfsHash = `Qm${crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 44)}`;

      return {
        ipfsHash: mockIpfsHash,
        contentHash,
        fileName,
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async uploadImage(fileBuffer, fileName, options = {}) {
    try {
      const {
        width = 800,
        height = 600,
        quality = 80,
        format = 'jpeg'
      } = options;

      // Process image with Sharp
      let processedImage = sharp(fileBuffer);
      
      // Resize if dimensions provided
      if (width && height) {
        processedImage = processedImage.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to specified format
      let processedBuffer;
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          processedBuffer = await processedImage.jpeg({ quality }).toBuffer();
          break;
        case 'png':
          processedBuffer = await processedImage.png({ quality }).toBuffer();
          break;
        case 'webp':
          processedBuffer = await processedImage.webp({ quality }).toBuffer();
          break;
        default:
          processedBuffer = await processedImage.jpeg({ quality }).toBuffer();
      }

      // Upload processed image
      return await this.uploadFile(processedBuffer, fileName);
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error('Failed to process and upload image');
    }
  }

  async uploadMetadata(metadata) {
    try {
      const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
      const mockIpfsHash = `Qm${crypto.createHash('sha256').update(metadataBuffer).digest('hex').substring(0, 44)}`;

      return {
        ipfsHash: mockIpfsHash,
        metadata
      };
    } catch (error) {
      console.error('Metadata upload error:', error);
      throw new Error('Failed to upload metadata to IPFS');
    }
  }

  async getFile(ipfsHash) {
    try {
      // For development, return a mock response
      console.log(`Mock IPFS get file: ${ipfsHash}`);
      return Buffer.from('Mock file content for development');
    } catch (error) {
      console.error('IPFS retrieval error:', error);
      throw new Error('Failed to retrieve file from IPFS');
    }
  }

  async getMetadata(ipfsHash) {
    try {
      const fileBuffer = await this.getFile(ipfsHash);
      return JSON.parse(fileBuffer.toString());
    } catch (error) {
      console.error('Metadata retrieval error:', error);
      throw new Error('Failed to retrieve metadata from IPFS');
    }
  }

  async pinFile(ipfsHash) {
    try {
      // For development, just return success
      console.log(`Mock IPFS pin file: ${ipfsHash}`);
      return true;
    } catch (error) {
      console.error('IPFS pin error:', error);
      throw new Error('Failed to pin file to IPFS');
    }
  }

  async unpinFile(ipfsHash) {
    try {
      // For development, just return success
      console.log(`Mock IPFS unpin file: ${ipfsHash}`);
      return true;
    } catch (error) {
      console.error('IPFS unpin error:', error);
      throw new Error('Failed to unpin file from IPFS');
    }
  }

  getGatewayUrl(ipfsHash) {
    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    return `${gateway}${ipfsHash}`;
  }

  async checkFileExists(ipfsHash) {
    try {
      // For development, always return true
      console.log(`Mock IPFS check file exists: ${ipfsHash}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  generateProvenanceHash(fileBuffer, metadata) {
    const combinedData = Buffer.concat([
      fileBuffer,
      Buffer.from(JSON.stringify(metadata))
    ]);
    return crypto.createHash('sha256').update(combinedData).digest('hex');
  }
}

module.exports = new IPFSService(); 