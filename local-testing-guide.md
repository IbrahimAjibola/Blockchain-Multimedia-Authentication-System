# Local Testing Guide for Multimedia Authentication System

This guide provides step-by-step instructions for testing all components of the multimedia authentication system locally.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Blockchain Setup](#local-blockchain-setup)
3. [Backend Testing](#backend-testing)
4. [Frontend Testing](#frontend-testing)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
```bash
# Node.js 18+
node --version  # Should be 18.0.0 or higher

# pnpm package manager
pnpm --version  # Should be 8.0.0 or higher

# Docker and Docker Compose
docker --version
docker-compose --version

# Git
git --version

# MetaMask browser extension
# Download from: https://metamask.io/
```

### Clone and Setup Repository
```bash
# Clone the repository
git clone https://github.com/your-username/multimedia-auth-system.git
cd multimedia-auth-system

# Install dependencies
pnpm install
pnpm install --recursive
```

## Local Blockchain Setup

### 1. Start Local Hardhat Network

```bash
# Navigate to contracts directory
cd contracts

# Start local Hardhat network
npx hardhat node

# This will start a local blockchain on http://127.0.0.1:8545
# Keep this terminal running
```

### 2. Deploy Contracts Locally

In a new terminal:
```bash
cd contracts

# Deploy contracts to local network
npx hardhat run scripts/deploy.js --network localhost

# Expected output:
# 🚀 Deploying contracts to localhost...
# 📦 MultimediaNFT deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
# 📦 LicensingContract deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
# 📦 MultimediaRegistry deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
# ✅ All contracts deployed successfully!
```

### 3. Configure MetaMask for Local Network

1. **Open MetaMask** in your browser
2. **Add Network**:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

3. **Import Test Account**:
   - Copy a private key from the Hardhat node output
   - Import account in MetaMask
   - You'll have 10,000 ETH for testing

### 4. Verify Contract Deployment

```bash
# Test contract interaction
npx hardhat run scripts/test-local.js --network localhost

# This should show contract addresses and basic functionality
```

## Backend Testing

### 1. Environment Setup

```bash
# Navigate to backend directory
cd backend

# Copy environment template
cp .env.example .env
```

Edit `backend/.env`:
```bash
# Server Configuration
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/multimedia_auth_test

# JWT
JWT_SECRET=your-local-jwt-secret-key

# IPFS Configuration
IPFS_API_URL=https://api.ipfs.io
IPFS_PROJECT_ID=your-ipfs-project-id
IPFS_PROJECT_SECRET=your-ipfs-project-secret

# Blockchain Configuration
ETHEREUM_RPC_URL=http://127.0.0.1:8545
MULTIMEDIA_NFT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
LICENSING_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=100000000
```

### 2. Start Local Services

#### Option A: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Check services
docker-compose ps

# View logs
docker-compose logs -f backend
```

#### Option B: Manual Setup

```bash
# Start MongoDB
mongod --dbpath ./data/db

# Start Redis (optional)
redis-server

# Start backend
cd backend
pnpm install
pnpm run dev
```

### 3. Test Backend API

```bash
# Test health endpoint
curl http://localhost:5000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "uptime": 123.456,
#   "version": "1.0.0"
# }

# Test API endpoints
curl http://localhost:5000/api/assets

# Test file upload (with actual file)
curl -X POST http://localhost:5000/api/register \
  -F "file=@test-image.jpg" \
  -F "originalCreator=Test User" \
  -F "description=Test image" \
  -F "tags=test,image"
```

### 4. Backend Unit Tests

```bash
cd backend

# Run all tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run specific test file
pnpm test -- --testPathPattern=register.test.js

# Watch mode for development
pnpm run test:watch
```

## Frontend Testing

### 1. Environment Setup

```bash
# Navigate to frontend directory
cd frontend

# Copy environment template
cp .env.example .env
```

Edit `frontend/.env`:
```bash
# Blockchain Configuration
REACT_APP_MULTIMEDIA_NFT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_LICENSING_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
REACT_APP_CHAIN_ID=31337
REACT_APP_RPC_URL=http://127.0.0.1:8545
REACT_APP_EXPLORER_URL=http://localhost:8545

# API Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_IPFS_GATEWAY=https://ipfs.io

# WalletConnect
REACT_APP_WALLETCONNECT_PROJECT_ID=your-project-id
```

### 2. Start Frontend Development Server

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Frontend will be available at http://localhost:3000
```

### 3. Test Frontend Components

#### Manual Testing Checklist

1. **Wallet Connection**:
   - [ ] Connect MetaMask
   - [ ] Switch to Hardhat network
   - [ ] Verify account balance
   - [ ] Test network switching

2. **Content Registration**:
   - [ ] Upload image file
   - [ ] Fill registration form
   - [ ] Submit registration
   - [ ] Verify NFT minting
   - [ ] Check transaction on Hardhat

3. **Content Verification**:
   - [ ] Upload file for verification
   - [ ] Test hash-based verification
   - [ ] Verify blockchain confirmation
   - [ ] Check verification results

4. **NFT Gallery**:
   - [ ] View owned NFTs
   - [ ] Filter by type
   - [ ] Sort by date/size
   - [ ] Download NFT files
   - [ ] Share NFT links

### 4. Frontend Unit Tests

```bash
cd frontend

# Run all tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run specific test
pnpm test -- --testPathPattern=FileUpload.test.js

# Watch mode
pnpm test --watch
```

## Integration Testing

### 1. End-to-End Workflow Test

#### Test Scenario: Complete Content Registration

```bash
# 1. Start all services
docker-compose up -d
npx hardhat node
pnpm dev  # Frontend

# 2. Test workflow
# - Connect wallet
# - Upload file
# - Register content
# - Verify on blockchain
# - View in gallery
```

#### Test Script

```javascript
// test-integration.js
const { ethers } = require('ethers');
const fs = require('fs');

async function testIntegration() {
  // 1. Connect to local network
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
  const signer = provider.getSigner();
  
  // 2. Get contract instances
  const nftContract = new ethers.Contract(
    '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    NFT_ABI,
    signer
  );
  
  // 3. Test file upload
  const formData = new FormData();
  formData.append('file', fs.createReadStream('./test-image.jpg'));
  formData.append('originalCreator', 'Test User');
  
  const response = await fetch('http://localhost:5000/api/register', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  console.log('Registration result:', result);
  
  // 4. Verify on blockchain
  const tokenId = result.asset.tokenId;
  const asset = await nftContract.getAsset(tokenId);
  console.log('Blockchain asset:', asset);
}

testIntegration().catch(console.error);
```

### 2. API Integration Tests

```bash
# Test registration endpoint
curl -X POST http://localhost:5000/api/register \
  -F "file=@test-files/sample-image.jpg" \
  -F "originalCreator=Test User" \
  -F "description=Test image for integration testing" \
  -F "tags=test,integration,image" \
  -F "licenseType=Personal" \
  -F "licensePrice=0.001" \
  -H "Content-Type: multipart/form-data"

# Test verification endpoint
curl -X POST http://localhost:5000/api/verify \
  -F "file=@test-files/sample-image.jpg" \
  -F "verifyOnBlockchain=true" \
  -H "Content-Type: multipart/form-data"

# Test assets endpoint
curl http://localhost:5000/api/assets

# Test specific asset
curl http://localhost:5000/api/assets/1
```

### 3. Blockchain Integration Tests

```bash
cd contracts

# Test contract interactions
npx hardhat run scripts/test-integration.js --network localhost

# Test NFT minting
npx hardhat run scripts/test-minting.js --network localhost

# Test license creation
npx hardhat run scripts/test-licensing.js --network localhost

# Test verification
npx hardhat run scripts/test-verification.js --network localhost
```

## End-to-End Testing

### 1. Complete User Journey Test

#### Test Case 1: Content Creator Journey

```bash
# Prerequisites
# - All services running
# - MetaMask connected to Hardhat
# - Test account with ETH

# Steps:
1. Open http://localhost:3000
2. Connect MetaMask wallet
3. Navigate to "Register Content"
4. Upload test image (JPG, PNG, or GIF)
5. Fill form:
   - Original Creator: "Test Artist"
   - Description: "Test artwork for blockchain authentication"
   - Tags: "test,art,blockchain"
   - License Type: "Personal"
   - License Price: "0.001"
6. Click "Register Content"
7. Confirm MetaMask transaction
8. Wait for confirmation
9. Navigate to "Gallery"
10. Verify NFT appears
11. Click on NFT to view details
12. Test download functionality
```

#### Test Case 2: Content Verifier Journey

```bash
# Steps:
1. Open http://localhost:3000
2. Connect MetaMask wallet
3. Navigate to "Verify Content"
4. Choose "Upload File" method
5. Upload the same test image
6. Click "Verify Content"
7. Wait for verification process
8. Review verification results:
   - Status: "Verified" or "Similar"
   - Confidence score
   - Blockchain confirmation
   - IPFS hash match
9. Test "Enter Hash" method
10. Enter IPFS hash from previous registration
11. Verify hash-based verification
```

### 2. Error Handling Tests

#### Test Invalid Inputs

```bash
# Test with invalid file types
curl -X POST http://localhost:5000/api/register \
  -F "file=@test-files/invalid.txt" \
  -F "originalCreator=Test User"

# Test with missing required fields
curl -X POST http://localhost:5000/api/register \
  -F "file=@test-files/sample-image.jpg"

# Test with invalid blockchain address
curl -X POST http://localhost:5000/api/register \
  -F "file=@test-files/sample-image.jpg" \
  -F "originalCreator=Test User" \
  -F "blockchainAddress=invalid-address"
```

#### Test Network Issues

```bash
# Test with disconnected blockchain
# 1. Stop Hardhat node
# 2. Try to register content
# 3. Verify error handling

# Test with slow network
# 1. Use network throttling in browser dev tools
# 2. Test file upload with large files
# 3. Verify progress indicators
```

### 3. Performance Tests

```bash
# Test with large files
curl -X POST http://localhost:5000/api/register \
  -F "file=@test-files/large-image.jpg" \
  -F "originalCreator=Test User"

# Test concurrent uploads
# Use multiple browser tabs or curl instances

# Test memory usage
# Monitor with: docker stats
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Hardhat Network Issues

```bash
# Problem: Hardhat node not starting
# Solution:
npx hardhat clean
npx hardhat compile
npx hardhat node

# Problem: Contracts not deploying
# Solution:
# Check if Hardhat node is running
# Verify network configuration in hardhat.config.js
# Check account balance
```

#### 2. Backend Connection Issues

```bash
# Problem: Backend not starting
# Solution:
cd backend
pnpm install
pnpm run dev

# Check logs:
docker-compose logs backend

# Problem: Database connection failed
# Solution:
# Check MongoDB is running
docker-compose up mongodb

# Problem: IPFS connection failed
# Solution:
# Check internet connection
# Verify IPFS API credentials
```

#### 3. Frontend Issues

```bash
# Problem: Frontend not loading
# Solution:
cd frontend
pnpm install
pnpm dev

# Problem: MetaMask connection failed
# Solution:
# Check MetaMask is installed
# Verify network configuration
# Check RPC URL in .env

# Problem: Contract interaction failed
# Solution:
# Verify contract addresses in .env
# Check if contracts are deployed
# Verify account has ETH
```

#### 4. File Upload Issues

```bash
# Problem: File upload failing
# Solution:
# Check file size limits
# Verify file type is supported
# Check upload directory permissions

# Problem: IPFS upload failing
# Solution:
# Check IPFS API credentials
# Verify internet connection
# Check IPFS service status
```

### Debug Commands

```bash
# Check all services status
docker-compose ps

# View all logs
docker-compose logs

# Check Hardhat network
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545

# Check backend health
curl http://localhost:5000/health

# Check frontend build
cd frontend && pnpm build

# Check contract deployment
npx hardhat run scripts/check-deployment.js --network localhost
```

### Performance Monitoring

```bash
# Monitor Docker resources
docker stats

# Monitor Node.js processes
ps aux | grep node

# Monitor network connections
netstat -tulpn | grep :5000
netstat -tulpn | grep :3000
netstat -tulpn | grep :8545

# Monitor file system
df -h
du -sh ./uploads
```

## Test Data

### Sample Files for Testing

Create a `test-files` directory with:

```bash
mkdir test-files
cd test-files

# Download sample images
curl -o sample-image.jpg https://picsum.photos/800/600
curl -o sample-video.mp4 https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4
curl -o sample-audio.mp3 https://www.soundjay.com/misc/sounds/bell-ringing-05.wav

# Create test files of different sizes
# Small: 1KB, Medium: 1MB, Large: 10MB
```

### Test Accounts

```bash
# Hardhat provides 20 test accounts
# Account 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
# Account 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
# Account 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
# ... and so on

# Each account has 10,000 ETH for testing
```

This comprehensive local testing guide ensures you can test all components of the multimedia authentication system locally with proper debugging and troubleshooting procedures. 