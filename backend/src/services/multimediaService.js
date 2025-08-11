const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');
const exifReader = require('exifreader');
const path = require('path');
const fs = require('fs').promises;

class MultimediaService {
  constructor() {
    this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
    this.supportedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
    this.supportedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/mp3'];
  }

  /**
   * Process and analyze multimedia file
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} mimeType - File MIME type
   * @param {string} originalName - Original filename
   * @returns {Promise<Object>} Processed file information
   */
  async processMultimediaFile(fileBuffer, mimeType, originalName) {
    const result = {
      originalName,
      mimeType,
      fileSize: fileBuffer.length,
      dimensions: null,
      duration: null,
      bitrate: null,
      frameRate: null,
      codec: null,
      exifData: null,
      thumbnail: null,
      processingStatus: 'completed'
    };

    try {
      // Extract EXIF data for images
      if (this.supportedImageTypes.includes(mimeType)) {
        result.exifData = await this.extractExifData(fileBuffer);
        result.dimensions = await this.getImageDimensions(fileBuffer);
        result.thumbnail = await this.generateThumbnail(fileBuffer);
      }

      // Process video files
      if (this.supportedVideoTypes.includes(mimeType)) {
        const videoInfo = await this.getVideoInfo(fileBuffer);
        result.dimensions = videoInfo.dimensions;
        result.duration = videoInfo.duration;
        result.bitrate = videoInfo.bitrate;
        result.frameRate = videoInfo.frameRate;
        result.codec = videoInfo.codec;
        result.thumbnail = await this.generateVideoThumbnail(fileBuffer);
      }

      // Process audio files
      if (this.supportedAudioTypes.includes(mimeType)) {
        const audioInfo = await this.getAudioInfo(fileBuffer);
        result.duration = audioInfo.duration;
        result.bitrate = audioInfo.bitrate;
        result.codec = audioInfo.codec;
      }

    } catch (error) {
      console.error('Error processing multimedia file:', error);
      result.processingStatus = 'failed';
      result.processingError = error.message;
    }

    return result;
  }

  /**
   * Extract EXIF data from image
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Object>} EXIF data
   */
  async extractExifData(imageBuffer) {
    try {
      // Check if exifReader is available
      if (typeof exifReader !== 'function') {
        console.warn('exifReader not available, skipping EXIF extraction');
        return null;
      }
      
      const tags = exifReader(imageBuffer);
      return this.sanitizeExifData(tags);
    } catch (error) {
      console.error('Error extracting EXIF data:', error);
      return null;
    }
  }

  /**
   * Sanitize EXIF data to remove sensitive information
   * @param {Object} exifData - Raw EXIF data
   * @returns {Object} Sanitized EXIF data
   */
  sanitizeExifData(exifData) {
    const sanitized = {};
    const allowedTags = [
      'ImageWidth', 'ImageLength', 'Make', 'Model', 'Software',
      'DateTime', 'Artist', 'Copyright', 'GPSLatitude', 'GPSLongitude',
      'Orientation', 'ColorSpace', 'XResolution', 'YResolution'
    ];

    for (const tag of allowedTags) {
      if (exifData[tag]) {
        sanitized[tag] = exifData[tag].description || exifData[tag].value;
      }
    }

    return sanitized;
  }

  /**
   * Get image dimensions
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Object>} Image dimensions
   */
  async getImageDimensions(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      return null;
    }
  }

  /**
   * Generate thumbnail for image
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Buffer>} Thumbnail buffer
   */
  async generateThumbnail(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }

  /**
   * Get video information
   * @param {Buffer} videoBuffer - Video buffer
   * @returns {Promise<Object>} Video information
   */
  async getVideoInfo(videoBuffer) {
    return new Promise((resolve, reject) => {
      // Create temporary file for ffmpeg
      const tempPath = `/tmp/video_${Date.now()}.mp4`;
      
      fs.writeFile(tempPath, videoBuffer)
        .then(() => {
          ffmpeg.ffprobe(tempPath, (err, metadata) => {
            fs.unlink(tempPath).catch(() => {}); // Clean up temp file
            
            if (err) {
              reject(err);
              return;
            }

            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

            resolve({
              dimensions: videoStream ? {
                width: videoStream.width,
                height: videoStream.height
              } : null,
              duration: metadata.format.duration ? parseFloat(metadata.format.duration) : null,
              bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : null,
              frameRate: videoStream && videoStream.r_frame_rate ? 
                this.parseFrameRate(videoStream.r_frame_rate) : null,
              codec: videoStream ? videoStream.codec_name : null,
              audioCodec: audioStream ? audioStream.codec_name : null
            });
          });
        })
        .catch(reject);
    });
  }

  /**
   * Generate video thumbnail
   * @param {Buffer} videoBuffer - Video buffer
   * @returns {Promise<Buffer>} Thumbnail buffer
   */
  async generateVideoThumbnail(videoBuffer) {
    return new Promise((resolve, reject) => {
      const tempPath = `/tmp/video_${Date.now()}.mp4`;
      const thumbnailPath = `/tmp/thumb_${Date.now()}.jpg`;
      
      fs.writeFile(tempPath, videoBuffer)
        .then(() => {
          ffmpeg(tempPath)
            .screenshots({
              timestamps: ['50%'],
              filename: path.basename(thumbnailPath),
              folder: path.dirname(thumbnailPath),
              size: '300x300'
            })
            .on('end', async () => {
              try {
                const thumbnailBuffer = await fs.readFile(thumbnailPath);
                await fs.unlink(tempPath);
                await fs.unlink(thumbnailPath);
                resolve(thumbnailBuffer);
              } catch (error) {
                reject(error);
              }
            })
            .on('error', (err) => {
              fs.unlink(tempPath).catch(() => {});
              fs.unlink(thumbnailPath).catch(() => {});
              reject(err);
            });
        })
        .catch(reject);
    });
  }

  /**
   * Get audio information
   * @param {Buffer} audioBuffer - Audio buffer
   * @returns {Promise<Object>} Audio information
   */
  async getAudioInfo(audioBuffer) {
    return new Promise((resolve, reject) => {
      const tempPath = `/tmp/audio_${Date.now()}.mp3`;
      
      fs.writeFile(tempPath, audioBuffer)
        .then(() => {
          ffmpeg.ffprobe(tempPath, (err, metadata) => {
            fs.unlink(tempPath).catch(() => {});
            
            if (err) {
              reject(err);
              return;
            }

            const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

            resolve({
              duration: metadata.format.duration ? parseFloat(metadata.format.duration) : null,
              bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : null,
              codec: audioStream ? audioStream.codec_name : null,
              sampleRate: audioStream ? audioStream.sample_rate : null,
              channels: audioStream ? audioStream.channels : null
            });
          });
        })
        .catch(reject);
    });
  }

  /**
   * Parse frame rate string
   * @param {string} frameRate - Frame rate string (e.g., "30/1")
   * @returns {number} Frame rate as number
   */
  parseFrameRate(frameRate) {
    const parts = frameRate.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0]) / parseInt(parts[1]);
    }
    return parseFloat(frameRate);
  }

  /**
   * Validate file type
   * @param {string} mimeType - File MIME type
   * @returns {boolean} True if file type is supported
   */
  isSupportedFileType(mimeType) {
    return [
      ...this.supportedImageTypes,
      ...this.supportedVideoTypes,
      ...this.supportedAudioTypes
    ].includes(mimeType);
  }

  /**
   * Get file category
   * @param {string} mimeType - File MIME type
   * @returns {string} File category
   */
  getFileCategory(mimeType) {
    if (this.supportedImageTypes.includes(mimeType)) return 'image';
    if (this.supportedVideoTypes.includes(mimeType)) return 'video';
    if (this.supportedAudioTypes.includes(mimeType)) return 'audio';
    return 'other';
  }

  /**
   * Optimize image for web
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} options - Optimization options
   * @returns {Promise<Buffer>} Optimized image buffer
   */
  async optimizeImage(imageBuffer, options = {}) {
    const {
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg'
    } = options;

    try {
      let sharpInstance = sharp(imageBuffer);

      // Resize if needed
      const metadata = await sharpInstance.metadata();
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to specified format
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          return await sharpInstance.jpeg({ quality }).toBuffer();
        case 'png':
          return await sharpInstance.png({ quality }).toBuffer();
        case 'webp':
          return await sharpInstance.webp({ quality }).toBuffer();
        default:
          return await sharpInstance.jpeg({ quality }).toBuffer();
      }
    } catch (error) {
      console.error('Error optimizing image:', error);
      return imageBuffer; // Return original if optimization fails
    }
  }

  /**
   * Extract audio from video
   * @param {Buffer} videoBuffer - Video buffer
   * @returns {Promise<Buffer>} Audio buffer
   */
  async extractAudioFromVideo(videoBuffer) {
    return new Promise((resolve, reject) => {
      const tempVideoPath = `/tmp/video_${Date.now()}.mp4`;
      const tempAudioPath = `/tmp/audio_${Date.now()}.mp3`;
      
      fs.writeFile(tempVideoPath, videoBuffer)
        .then(() => {
          ffmpeg(tempVideoPath)
            .toFormat('mp3')
            .on('end', async () => {
              try {
                const audioBuffer = await fs.readFile(tempAudioPath);
                await fs.unlink(tempVideoPath);
                await fs.unlink(tempAudioPath);
                resolve(audioBuffer);
              } catch (error) {
                reject(error);
              }
            })
            .on('error', (err) => {
              fs.unlink(tempVideoPath).catch(() => {});
              fs.unlink(tempAudioPath).catch(() => {});
              reject(err);
            })
            .save(tempAudioPath);
        })
        .catch(reject);
    });
  }

  /**
   * Generate video preview
   * @param {Buffer} videoBuffer - Video buffer
   * @param {number} duration - Preview duration in seconds
   * @returns {Promise<Buffer>} Video preview buffer
   */
  async generateVideoPreview(videoBuffer, duration = 10) {
    return new Promise((resolve, reject) => {
      const tempInputPath = `/tmp/input_${Date.now()}.mp4`;
      const tempOutputPath = `/tmp/preview_${Date.now()}.mp4`;
      
      fs.writeFile(tempInputPath, videoBuffer)
        .then(() => {
          ffmpeg(tempInputPath)
            .duration(duration)
            .videoCodec('libx264')
            .audioCodec('aac')
            .size('640x360')
            .on('end', async () => {
              try {
                const previewBuffer = await fs.readFile(tempOutputPath);
                await fs.unlink(tempInputPath);
                await fs.unlink(tempOutputPath);
                resolve(previewBuffer);
              } catch (error) {
                reject(error);
              }
            })
            .on('error', (err) => {
              fs.unlink(tempInputPath).catch(() => {});
              fs.unlink(tempOutputPath).catch(() => {});
              reject(err);
            })
            .save(tempOutputPath);
        })
        .catch(reject);
    });
  }

  /**
   * Get file statistics
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} mimeType - File MIME type
   * @returns {Promise<Object>} File statistics
   */
  async getFileStatistics(fileBuffer, mimeType) {
    const stats = {
      fileSize: fileBuffer.length,
      mimeType,
      category: this.getFileCategory(mimeType),
      isSupported: this.isSupportedFileType(mimeType)
    };

    if (this.supportedImageTypes.includes(mimeType)) {
      try {
        const metadata = await sharp(fileBuffer).metadata();
        stats.dimensions = {
          width: metadata.width,
          height: metadata.height
        };
        stats.colorSpace = metadata.space;
        stats.channels = metadata.channels;
      } catch (error) {
        console.error('Error getting image statistics:', error);
      }
    }

    return stats;
  }
}

module.exports = new MultimediaService(); 