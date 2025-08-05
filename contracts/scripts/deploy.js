const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy MultimediaNFT contract
  const MultimediaNFT = await hre.ethers.getContractFactory("MultimediaNFT");
  const multimediaNFT = await MultimediaNFT.deploy();
  await multimediaNFT.waitForDeployment();
  console.log("MultimediaNFT deployed to:", await multimediaNFT.getAddress());

  // Deploy LicensingContract
  const LicensingContract = await hre.ethers.getContractFactory("LicensingContract");
  const licensingContract = await LicensingContract.deploy(
    await multimediaNFT.getAddress(),
    deployer.address // Platform wallet
  );
  await licensingContract.waitForDeployment();
  console.log("LicensingContract deployed to:", await licensingContract.getAddress());

  // Save deployment addresses
  const deploymentInfo = {
    multimediaNFT: await multimediaNFT.getAddress(),
    licensingContract: await licensingContract.getAddress(),
    deployer: deployer.address,
    network: hre.network.name
  };

  console.log("Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 