# Blockchain Multimedia Authentication Smart Contracts

This directory contains the smart contracts for the Blockchain-based multimedia authentication and provenance system. The contracts provide NFT-based ownership, smart contract-enabled licensing, and decentralized storage capabilities.

## Contract Overview

### 1. MultimediaRegistry.sol
A comprehensive registry contract for multimedia content that handles:
- Content registration with IPFS hashes
- Content verification system
- License management and purchase
- Viewer authorization and permissions
- Fee management and withdrawal

### 2. MultimediaNFT.sol
An ERC-721 compliant NFT contract for multimedia assets featuring:
- Gas-efficient NFT minting
- Asset verification system
- License management
- Viewer permissions
- ERC-721Enumerable support

### 3. LicensingContract.sol
A dedicated licensing contract that manages:
- License creation and management
- License purchase and payment processing
- Royalty distribution
- Platform fee handling

## Features

### ✅ Core Functionality
- **Content Registration**: Register multimedia content with IPFS hashes
- **NFT Minting**: Create ERC-721 tokens representing ownership
- **Content Verification**: Verify content authenticity and provenance
- **License Management**: Set and manage content licenses
- **Viewer Authorization**: Control who can view licensed content
- **Payment Processing**: Handle license purchases and fee distribution

### ✅ Security Features
- **Reentrancy Protection**: All payable functions are protected
- **Access Control**: Owner-only functions for administrative tasks
- **Input Validation**: Comprehensive validation for all inputs
- **Gas Optimization**: Efficient contract structure and operations

### ✅ Gas Efficiency
- **Optimized Storage**: Efficient data structures and mappings
- **Batch Operations**: Support for batch operations where applicable
- **Minimal External Calls**: Reduced external contract interactions
- **Event Optimization**: Efficient event emission

## Installation

```bash
# Install dependencies
pnpm install

# Compile contracts
pnpm run compile

# Run tests
pnpm run test

# Generate coverage report
pnpm run coverage
```

## Deployment

### Local Development
```bash
# Start local Hardhat node
pnpm run node

# Deploy to local network
pnpm run deploy
```

### Sepolia Testnet
```bash
# Set environment variables
export PRIVATE_KEY="your-private-key"
export SEPOLIA_URL="https://sepolia.infura.io/v3/your-project-id"
export ETHERSCAN_API_KEY="your-etherscan-api-key"

# Deploy to Sepolia
pnpm run deploy:testnet
```

### Mainnet
```bash
# Set environment variables
export PRIVATE_KEY="your-private-key"
export MAINNET_URL="https://mainnet.infura.io/v3/your-project-id"
export ETHERSCAN_API_KEY="your-etherscan-api-key"

# Deploy to mainnet
pnpm run deploy:mainnet
```

## Contract Addresses

After deployment, the contracts will be available at:

- **MultimediaRegistry**: `0x...`
- **MultimediaNFT**: `0x...`
- **LicensingContract**: `0x...`

## Usage Examples

### Content Registration
```javascript
// Register multimedia content
const fee = await multimediaRegistry.registrationFee();
await multimediaRegistry.registerContent(
  "QmTestHash123",
  "QmMetadataHash123",
  "image/jpeg",
  1024000,
  "John Doe",
  "QmProvenanceHash123",
  "Commercial",
  ethers.parseEther("0.1"),
  86400,
  { value: fee }
);
```

### NFT Minting
```javascript
// Mint NFT for multimedia asset
const fee = await multimediaNFT.mintingFee();
await multimediaNFT.mintAsset(
  "QmTestHash123",
  "image/jpeg",
  1024000,
  "John Doe",
  "QmProvenanceHash123",
  "ipfs://QmMetadata123",
  { value: fee }
);
```

### License Management
```javascript
// Set license for NFT
await multimediaNFT.setLicense(
  1,
  "Commercial",
  ethers.parseEther("0.1"),
  86400,
  "Commercial use license"
);

// Purchase license
await multimediaNFT.purchaseLicense(1, { 
  value: ethers.parseEther("0.1") 
});
```

### Content Verification
```javascript
// Verify content
const verificationFee = await multimediaRegistry.verificationFee();
await multimediaRegistry.verifyContent(1, { value: verificationFee });

// Verify NFT asset
const verificationFee = await multimediaNFT.verificationFee();
await multimediaNFT.verifyAsset(1, { value: verificationFee });
```

## Testing

### Run All Tests
```bash
pnpm run test
```

### Run Specific Test Files
```bash
# Test MultimediaRegistry
pnpm run test test/MultimediaRegistry.test.js

# Test MultimediaNFT
pnpm run test test/MultimediaNFT.test.js

# Test LicensingContract
pnpm run test test/LicensingContract.test.js
```

### Coverage Report
```bash
pnpm run coverage
```

Expected coverage: **90%+**

## Gas Optimization

### Current Gas Usage
- **MultimediaRegistry Deployment**: ~2,500,000 gas
- **MultimediaNFT Deployment**: ~3,200,000 gas
- **LicensingContract Deployment**: ~1,800,000 gas

### Gas-Efficient Features
- **Batch Operations**: Support for batch minting and operations
- **Optimized Storage**: Efficient use of storage slots
- **Minimal External Calls**: Reduced external contract interactions
- **Event Optimization**: Efficient event emission patterns

## Security Considerations

### ✅ Implemented Security Measures
- **Reentrancy Protection**: All payable functions protected
- **Access Control**: Owner-only administrative functions
- **Input Validation**: Comprehensive validation for all inputs
- **Safe Math**: Using Solidity 0.8.20 built-in overflow protection
- **Ownable Pattern**: Secure ownership management

### 🔒 Security Best Practices
- **Audited Libraries**: Using OpenZeppelin audited contracts
- **Minimal Attack Surface**: Limited external interactions
- **Emergency Functions**: Emergency withdrawal capabilities
- **Upgradeable Design**: Contracts designed for future upgrades

## Network Support

### Supported Networks
- **Local Development**: Hardhat Network (Chain ID: 1337)
- **Testnet**: Sepolia (Chain ID: 11155111)
- **Mainnet**: Ethereum (Chain ID: 1)

### Network Configuration
```javascript
// hardhat.config.js
networks: {
  hardhat: {
    chainId: 1337
  },
  sepolia: {
    url: process.env.SEPOLIA_URL,
    accounts: [process.env.PRIVATE_KEY]
  },
  mainnet: {
    url: process.env.MAINNET_URL,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

## Environment Variables

### Required Variables
```bash
# Network Configuration
PRIVATE_KEY=your-private-key
SEPOLIA_URL=https://sepolia.infura.io/v3/your-project-id
MAINNET_URL=https://mainnet.infura.io/v3/your-project-id

# Etherscan API Key
ETHERSCAN_API_KEY=your-etherscan-api-key
```

### Optional Variables
```bash
# Gas Configuration
GAS_LIMIT=5000000
GAS_PRICE=20000000000

# Contract Configuration
MULTIMEDIA_REGISTRY_ADDRESS=0x...
MULTIMEDIA_NFT_ADDRESS=0x...
LICENSING_CONTRACT_ADDRESS=0x...
```

## Contract Verification

### Etherscan Verification
```bash
# Verify on Etherscan
npx hardhat verify --network sepolia 0xCONTRACT_ADDRESS
```

### Manual Verification
1. Deploy contracts
2. Copy contract addresses
3. Run verification command
4. Check Etherscan for verification status

## Monitoring and Analytics

### Events to Monitor
- `ContentRegistered`: New content registration
- `AssetMinted`: New NFT minting
- `ContentVerified`: Content verification
- `LicenseUpdated`: License changes
- `ViewerAuthorized`: Viewer authorization
- `FeeWithdrawn`: Fee withdrawals

### Key Metrics
- **Total Content Registered**: Track via `getContentCount()`
- **Total NFTs Minted**: Track via `getTokenCount()`
- **License Purchases**: Monitor `ViewerAuthorized` events
- **Fee Revenue**: Track `FeeWithdrawn` events

## Troubleshooting

### Common Issues

#### 1. Insufficient Gas
```bash
# Increase gas limit
GAS_LIMIT=8000000 pnpm run deploy:testnet
```

#### 2. Network Issues
```bash
# Check network connection
npx hardhat console --network sepolia
```

#### 3. Verification Failures
```bash
# Manual verification
npx hardhat verify --network sepolia 0xCONTRACT_ADDRESS
```

### Debug Commands
```bash
# Check contract state
npx hardhat console --network sepolia
> const contract = await ethers.getContractAt("MultimediaRegistry", "0x...")
> await contract.getContentCount()
```

## Contributing

### Development Workflow
1. Create feature branch
2. Implement changes
3. Add tests
4. Run test suite
5. Update documentation
6. Submit pull request

### Code Standards
- **Solidity**: Follow Solidity style guide
- **Testing**: 90%+ coverage required
- **Documentation**: Comprehensive comments
- **Gas Optimization**: Efficient implementations

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the test files for examples
- Consult the deployment scripts

## Changelog

### v1.0.0
- Initial release
- MultimediaRegistry contract
- MultimediaNFT contract
- LicensingContract contract
- Comprehensive test suite
- Sepolia deployment support 