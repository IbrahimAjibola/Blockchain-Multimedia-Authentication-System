const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts to Sepolia with the account:", deployer.address);

  // Check if we have the required environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  if (!process.env.SEPOLIA_URL) {
    throw new Error("SEPOLIA_URL environment variable is required");
  }

  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy MultimediaRegistry contract
  console.log("Deploying MultimediaRegistry...");
  const MultimediaRegistry = await hre.ethers.getContractFactory("MultimediaRegistry");
  const multimediaRegistry = await MultimediaRegistry.deploy();
  await multimediaRegistry.waitForDeployment();
  console.log("MultimediaRegistry deployed to:", await multimediaRegistry.getAddress());

  // Deploy MultimediaNFT contract
  console.log("Deploying MultimediaNFT...");
  const MultimediaNFT = await hre.ethers.getContractFactory("MultimediaNFT");
  const multimediaNFT = await MultimediaNFT.deploy();
  await multimediaNFT.waitForDeployment();
  console.log("MultimediaNFT deployed to:", await multimediaNFT.getAddress());

  // Deploy LicensingContract
  console.log("Deploying LicensingContract...");
  const LicensingContract = await hre.ethers.getContractFactory("LicensingContract");
  const licensingContract = await LicensingContract.deploy(
    await multimediaNFT.getAddress(),
    deployer.address // Platform wallet
  );
  await licensingContract.waitForDeployment();
  console.log("LicensingContract deployed to:", await licensingContract.getAddress());

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await multimediaRegistry.deploymentTransaction().wait(5);
  await multimediaNFT.deploymentTransaction().wait(5);
  await licensingContract.deploymentTransaction().wait(5);

  // Verify contracts on Etherscan
  console.log("Verifying contracts on Etherscan...");
  
  try {
    await hre.run("verify:verify", {
      address: await multimediaRegistry.getAddress(),
      constructorArguments: [],
    });
    console.log("MultimediaRegistry verified on Etherscan");
  } catch (error) {
    console.log("MultimediaRegistry verification failed:", error.message);
  }

  try {
    await hre.run("verify:verify", {
      address: await multimediaNFT.getAddress(),
      constructorArguments: [],
    });
    console.log("MultimediaNFT verified on Etherscan");
  } catch (error) {
    console.log("MultimediaNFT verification failed:", error.message);
  }

  try {
    await hre.run("verify:verify", {
      address: await licensingContract.getAddress(),
      constructorArguments: [
        await multimediaNFT.getAddress(),
        deployer.address
      ],
    });
    console.log("LicensingContract verified on Etherscan");
  } catch (error) {
    console.log("LicensingContract verification failed:", error.message);
  }

  // Save deployment addresses
  const deploymentInfo = {
    network: "sepolia",
    deployer: deployer.address,
    multimediaRegistry: await multimediaRegistry.getAddress(),
    multimediaNFT: await multimediaNFT.getAddress(),
    licensingContract: await licensingContract.getAddress(),
    deploymentTime: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    gasUsed: {
      multimediaRegistry: multimediaRegistry.deploymentTransaction().gasLimit.toString(),
      multimediaNFT: multimediaNFT.deploymentTransaction().gasLimit.toString(),
      licensingContract: licensingContract.deploymentTransaction().gasLimit.toString(),
    }
  };

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Network:", deploymentInfo.network);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("MultimediaRegistry:", deploymentInfo.multimediaRegistry);
  console.log("MultimediaNFT:", deploymentInfo.multimediaNFT);
  console.log("LicensingContract:", deploymentInfo.licensingContract);
  console.log("Block Number:", deploymentInfo.blockNumber);
  console.log("Deployment Time:", deploymentInfo.deploymentTime);

  // Save deployment info to file
  const fs = require("fs");
  const path = require("path");
  
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  const deploymentFile = path.join(deploymentPath, `sepolia-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentFile);

  // Create environment file template
  const envTemplate = `# Sepolia Testnet Configuration
SEPOLIA_URL=${process.env.SEPOLIA_URL}
PRIVATE_KEY=${process.env.PRIVATE_KEY}

# Contract Addresses
MULTIMEDIA_REGISTRY_ADDRESS=${deploymentInfo.multimediaRegistry}
MULTIMEDIA_NFT_ADDRESS=${deploymentInfo.multimediaNFT}
LICENSING_CONTRACT_ADDRESS=${deploymentInfo.licensingContract}

# Etherscan API Key (for verification)
ETHERSCAN_API_KEY=${process.env.ETHERSCAN_API_KEY || "YOUR_ETHERSCAN_API_KEY"}

# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
IPFS_GATEWAY=https://ipfs.io/ipfs/

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/multimedia-auth

# JWT Secret
JWT_SECRET=your-jwt-secret-here

# Frontend URL
FRONTEND_URL=http://localhost:3000
`;

  const envFile = path.join(deploymentPath, "sepolia.env");
  fs.writeFileSync(envFile, envTemplate);
  console.log("Environment template saved to:", envFile);

  console.log("\n=== NEXT STEPS ===");
  console.log("1. Update your .env file with the contract addresses");
  console.log("2. Test the contracts on Sepolia testnet");
  console.log("3. Run the test suite to verify functionality");
  console.log("4. Deploy the backend and frontend applications");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 