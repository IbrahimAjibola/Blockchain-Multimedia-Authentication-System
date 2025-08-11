const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Generate placeholder images for existing database entries
const generatePlaceholders = async () => {
  const assets = [
    {
      tokenId: '1754684430669939',
      ipfsHash: 'Qm19bd978cffb1757349bb25e8767446c91a2fd6921485',
      originalName: 'Screenshot 2025-08-08 at 7.13.32 PM.png',
      description: 'oilukyfjtcgvhbkj',
      creator: 'kugjfhgc'
    },
    {
      tokenId: '1',
      ipfsHash: 'Qmd9ff73637ee6598b9748b8a7bac5b3d9b201cb32de06',
      originalName: 'Screenshot 2025-08-08 at 5.13.34 PM.png',
      description: 'oiuyghvbjknfldekpfvsoiulgj',
      creator: 'Deji Snow'
    }
  ];

  for (const asset of assets) {
    try {
      // Create a placeholder image with the NFT information
      const width = 400;
      const height = 300;
      
      // Create SVG with NFT info
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)"/>
          <rect x="20" y="20" width="${width-40}" height="${height-40}" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          <text x="50%" y="40%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">NFT #${asset.tokenId}</text>
          <text x="50%" y="55%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12">${asset.description}</text>
          <text x="50%" y="70%" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="10">by ${asset.creator}</text>
          <text x="50%" y="85%" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="Arial, sans-serif" font-size="10">${asset.originalName}</text>
        </svg>
      `;

      // Convert SVG to PNG
      const pngBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

      // Save the file
      const fileName = `${asset.ipfsHash}_${asset.originalName}`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, pngBuffer);
      
      console.log(`Generated placeholder for ${asset.tokenId}: ${filePath}`);
    } catch (error) {
      console.error(`Error generating placeholder for ${asset.tokenId}:`, error);
    }
  }
};

generatePlaceholders().then(() => {
  console.log('Placeholder generation complete!');
  process.exit(0);
}).catch(error => {
  console.error('Error generating placeholders:', error);
  process.exit(1);
});
