const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting mainnet deployment...");

  // Check environment variables
  const requiredEnvVars = [
    "MAINNET_RPC_URL",
    "MAINNET_PRIVATE_KEY",
    "ETHERSCAN_API_KEY"
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  const deployerBalance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(deployerBalance), "ETH");

  if (deployerBalance.lt(ethers.utils.parseEther("0.1"))) {
    throw new Error("Insufficient balance for deployment. Need at least 0.1 ETH");
  }

  // Deployment configuration
  const deploymentConfig = {
    gasLimit: 5000000,
    gasPrice: ethers.utils.parseUnits("20", "gwei"), // Adjust based on network conditions
    confirmations: 5
  };

  console.log("⚙️  Deployment configuration:", {
    gasLimit: deploymentConfig.gasLimit,
    gasPrice: ethers.utils.formatUnits(deploymentConfig.gasPrice, "gwei") + " gwei",
    confirmations: deploymentConfig.confirmations
  });

  // Deploy contracts
  const contracts = {};

  try {
    // 1. Deploy MultimediaNFT
    console.log("\n📦 Deploying MultimediaNFT...");
    const MultimediaNFT = await ethers.getContractFactory("MultimediaNFT");
    const multimediaNFT = await MultimediaNFT.deploy(
      "Multimedia Authentication NFT",
      "MANFT",
      ethers.utils.parseEther("0.01"), // mintingFee
      ethers.utils.parseEther("0.005"), // verificationFee
      ethers.utils.parseEther("0.02"), // platformFee
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: deploymentConfig.gasPrice
      }
    );

    await multimediaNFT.deployed();
    contracts.MultimediaNFT = multimediaNFT.address;
    console.log("✅ MultimediaNFT deployed to:", multimediaNFT.address);

    // 2. Deploy LicensingContract
    console.log("\n📦 Deploying LicensingContract...");
    const LicensingContract = await ethers.getContractFactory("LicensingContract");
    const licensingContract = await LicensingContract.deploy(
      multimediaNFT.address,
      ethers.utils.parseEther("0.01"), // platformFee
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: deploymentConfig.gasPrice
      }
    );

    await licensingContract.deployed();
    contracts.LicensingContract = licensingContract.address;
    console.log("✅ LicensingContract deployed to:", licensingContract.address);

    // 3. Deploy MultimediaRegistry
    console.log("\n📦 Deploying MultimediaRegistry...");
    const MultimediaRegistry = await ethers.getContractFactory("MultimediaRegistry");
    const multimediaRegistry = await MultimediaRegistry.deploy(
      ethers.utils.parseEther("0.01"), // registrationFee
      ethers.utils.parseEther("0.005"), // verificationFee
      ethers.utils.parseEther("0.02"), // platformFee
      {
        gasLimit: deploymentConfig.gasLimit,
        gasPrice: deploymentConfig.gasPrice
      }
    );

    await multimediaRegistry.deployed();
    contracts.MultimediaRegistry = multimediaRegistry.address;
    console.log("✅ MultimediaRegistry deployed to:", multimediaRegistry.address);

    // Wait for confirmations
    console.log(`\n⏳ Waiting for ${deploymentConfig.confirmations} confirmations...`);
    await multimediaNFT.deployTransaction.wait(deploymentConfig.confirmations);
    await licensingContract.deployTransaction.wait(deploymentConfig.confirmations);
    await multimediaRegistry.deployTransaction.wait(deploymentConfig.confirmations);

    // Verify contracts on Etherscan
    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: multimediaNFT.address,
        constructorArguments: [
          "Multimedia Authentication NFT",
          "MANFT",
          ethers.utils.parseEther("0.01"),
          ethers.utils.parseEther("0.005"),
          ethers.utils.parseEther("0.02")
        ],
      });
      console.log("✅ MultimediaNFT verified on Etherscan");
    } catch (error) {
      console.log("⚠️  MultimediaNFT verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: licensingContract.address,
        constructorArguments: [
          multimediaNFT.address,
          ethers.utils.parseEther("0.01")
        ],
      });
      console.log("✅ LicensingContract verified on Etherscan");
    } catch (error) {
      console.log("⚠️  LicensingContract verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: multimediaRegistry.address,
        constructorArguments: [
          ethers.utils.parseEther("0.01"),
          ethers.utils.parseEther("0.005"),
          ethers.utils.parseEther("0.02")
        ],
      });
      console.log("✅ MultimediaRegistry verified on Etherscan");
    } catch (error) {
      console.log("⚠️  MultimediaRegistry verification failed:", error.message);
    }

    // Save deployment information
    const deploymentInfo = {
      network: "mainnet",
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: contracts,
      gasUsed: {
        MultimediaNFT: multimediaNFT.deployTransaction.gasLimit.toString(),
        LicensingContract: licensingContract.deployTransaction.gasLimit.toString(),
        LicensingContract: multimediaRegistry.deployTransaction.gasLimit.toString()
      },
      transactionHashes: {
        MultimediaNFT: multimediaNFT.deployTransaction.hash,
        LicensingContract: licensingContract.deployTransaction.hash,
        MultimediaRegistry: multimediaRegistry.deployTransaction.hash
      }
    };

    // Save to file
    const deploymentPath = path.join(__dirname, "../deployments/mainnet-deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to:", deploymentPath);

    // Generate environment template
    const envTemplate = `# Mainnet Deployment Environment Variables
REACT_APP_MULTIMEDIA_NFT_ADDRESS=${contracts.MultimediaNFT}
REACT_APP_LICENSING_CONTRACT_ADDRESS=${contracts.LicensingContract}
REACT_APP_MULTIMEDIA_REGISTRY_ADDRESS=${contracts.MultimediaRegistry}
REACT_APP_CHAIN_ID=1
REACT_APP_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
REACT_APP_EXPLORER_URL=https://etherscan.io

# Backend Environment Variables
MULTIMEDIA_NFT_ADDRESS=${contracts.MultimediaNFT}
LICENSING_CONTRACT_ADDRESS=${contracts.LicensingContract}
MULTIMEDIA_REGISTRY_ADDRESS=${contracts.MultimediaRegistry}
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=YOUR_PRIVATE_KEY
`;

    const envPath = path.join(__dirname, "../deployments/mainnet.env");
    fs.writeFileSync(envPath, envTemplate);
    console.log("📝 Environment template saved to:", envPath);

    // Display deployment summary
    console.log("\n🎉 Mainnet deployment completed successfully!");
    console.log("=" * 50);
    console.log("📋 Deployment Summary:");
    console.log("Network: Ethereum Mainnet");
    console.log("Deployer:", deployer.address);
    console.log("MultimediaNFT:", contracts.MultimediaNFT);
    console.log("LicensingContract:", contracts.LicensingContract);
    console.log("MultimediaRegistry:", contracts.MultimediaRegistry);
    console.log("=" * 50);

    // Display next steps
    console.log("\n📝 Next Steps:");
    console.log("1. Update your frontend environment variables");
    console.log("2. Update your backend environment variables");
    console.log("3. Test the contracts on mainnet");
    console.log("4. Monitor gas usage and optimize if needed");
    console.log("5. Set up monitoring and alerting");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 