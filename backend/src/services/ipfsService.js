const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class IPFSService {
  constructor() {
    // Temporarily disable IPFS for development
    this.ipfs = null;
    this.storageDir = path.join(__dirname, '../../uploads');
    
    // Ensure storage directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    
    console.log('IPFS service initialized (disabled for development)');
    console.log('Files will be stored locally in:', this.storageDir);
  }

  async uploadFile(fileBuffer, fileName) {
    try {
      // Generate content hash for provenance
      const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Generate a unique hash for the file
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 44);
      const mockIpfsHash = `Qm${fileHash}`;
      
      // Store file locally
      const filePath = path.join(this.storageDir, `${mockIpfsHash}_${fileName}`);
      fs.writeFileSync(filePath, fileBuffer);
      
      console.log(`File stored locally: ${filePath}`);

      return {
        ipfsHash: mockIpfsHash,
        contentHash,
        fileName,
        size: fileBuffer.length,
        localPath: filePath
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
      // For development, try to find the file locally
      console.log(`Looking for file with hash: ${ipfsHash}`);
      
      const files = fs.readdirSync(this.storageDir);
      const targetFile = files.find(file => file.startsWith(ipfsHash));
      
      if (targetFile) {
        const filePath = path.join(this.storageDir, targetFile);
        console.log(`Found file locally: ${filePath}`);
        return fs.readFileSync(filePath);
      } else {
        console.log(`File not found locally for hash: ${ipfsHash}`);
        return Buffer.from('File not found');
      }
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
    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io';
    return `${gateway}/ipfs/${ipfsHash}`;
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