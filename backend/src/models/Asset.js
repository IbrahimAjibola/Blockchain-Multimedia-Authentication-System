const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ipfsHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  metadataHash: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  originalCreator: {
    type: String,
    required: true
  },
  uploader: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  provenanceHash: {
    type: String,
    required: true
  },
  contentHash: {
    type: String,
    required: true
  },
  perceptualHash: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationTimestamp: {
    type: Date
  },
  verifier: {
    type: String
  },
  isLicensed: {
    type: Boolean,
    default: false
  },
  licenseType: {
    type: String,
    default: ''
  },
  licensePrice: {
    type: Number,
    default: 0
  },
  transactionHash: {
    type: String,
    required: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  network: {
    type: String,
    required: true,
    default: 'sepolia'
  },
  status: {
    type: String,
    enum: ['pending', 'registered', 'verified', 'licensed', 'expired'],
    default: 'pending'
  },
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  ratings: [{
    user: String,
    rating: Number,
    comment: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  gatewayUrl: {
    type: String
  },
  thumbnailUrl: {
    type: String
  },
  dimensions: {
    width: Number,
    height: Number
  },
  duration: {
    type: Number // for video/audio files
  },
  bitrate: {
    type: Number
  },
  frameRate: {
    type: Number
  },
  codec: {
    type: String
  },
  exifData: {
    type: mongoose.Schema.Types.Mixed
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
assetSchema.index({ uploader: 1, createdAt: -1 });
assetSchema.index({ fileType: 1, createdAt: -1 });
assetSchema.index({ isVerified: 1, createdAt: -1 });
assetSchema.index({ isLicensed: 1, createdAt: -1 });
assetSchema.index({ tags: 1 });
assetSchema.index({ status: 1, createdAt: -1 });

// Virtual for formatted file size
assetSchema.virtual('formattedFileSize').get(function() {
  const bytes = this.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for age
assetSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Method to update views
assetSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to update downloads
assetSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

// Method to add rating
assetSchema.methods.addRating = function(user, rating, comment = '') {
  // Remove existing rating from this user
  this.ratings = this.ratings.filter(r => r.user !== user);
  
  // Add new rating
  this.ratings.push({ user, rating, comment });
  
  // Calculate average rating
  const totalRating = this.ratings.reduce((sum, r) => sum + r.rating, 0);
  this.rating = totalRating / this.ratings.length;
  
  return this.save();
};

// Method to get average rating
assetSchema.methods.getAverageRating = function() {
  if (this.ratings.length === 0) return 0;
  const totalRating = this.ratings.reduce((sum, r) => sum + r.rating, 0);
  return totalRating / this.ratings.length;
};

// Static method to find assets by creator
assetSchema.statics.findByCreator = function(creator) {
  return this.find({ originalCreator: creator }).sort({ createdAt: -1 });
};

// Static method to find verified assets
assetSchema.statics.findVerified = function() {
  return this.find({ isVerified: true }).sort({ createdAt: -1 });
};

// Static method to find licensed assets
assetSchema.statics.findLicensed = function() {
  return this.find({ isLicensed: true }).sort({ createdAt: -1 });
};

// Static method to search assets
assetSchema.statics.search = function(query) {
  return this.find({
    $or: [
      { originalName: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { originalCreator: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  }).sort({ createdAt: -1 });
};

// Pre-save middleware to update status
assetSchema.pre('save', function(next) {
  if (this.isVerified && this.status === 'registered') {
    this.status = 'verified';
  }
  if (this.isLicensed && this.status === 'verified') {
    this.status = 'licensed';
  }
  next();
});

module.exports = mongoose.model('Asset', assetSchema); 