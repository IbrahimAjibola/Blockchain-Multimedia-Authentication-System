const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LicensingContract", function () {
  let licensingContract;
  let multimediaNFT;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    
    // Deploy MultimediaNFT first
    const MultimediaNFT = await ethers.getContractFactory("MultimediaNFT");
    multimediaNFT = await MultimediaNFT.deploy();
    
    // Deploy LicensingContract
    const LicensingContract = await ethers.getContractFactory("LicensingContract");
    licensingContract = await LicensingContract.deploy(
      await multimediaNFT.getAddress(),
      owner.address
    );
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await licensingContract.owner()).to.equal(owner.address);
    });

    it("Should set the correct multimedia NFT address", async function () {
      expect(await licensingContract.multimediaNFT()).to.equal(await multimediaNFT.getAddress());
    });

    it("Should set the correct platform wallet", async function () {
      expect(await licensingContract.platformWallet()).to.equal(owner.address);
    });

    it("Should have correct initial platform fee", async function () {
      expect(await licensingContract.platformFee()).to.equal(250); // 2.5%
    });
  });

  describe("License Creation", function () {
    beforeEach(async function () {
      // Mint an NFT for addr1
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr1).mintAsset(
        "QmTestHash123",
        "image/jpeg",
        1024000,
        "John Doe",
        "QmProvenanceHash123",
        "ipfs://QmMetadata123",
        { value: fee }
      );
    });

    it("Should create license successfully", async function () {
      await expect(
        licensingContract.connect(addr1).createLicense(
          1,
          addr2.address,
          ethers.parseEther("0.1"),
          86400,
          "Commercial",
          "Commercial use license"
        )
      ).to.emit(licensingContract, "LicenseCreated");

      const licenses = await licensingContract.getTokenLicenses(1);
      expect(licenses.length).to.equal(1);
      expect(licenses[0].licensee).to.equal(addr2.address);
      expect(licenses[0].licensor).to.equal(addr1.address);
      expect(licenses[0].price).to.equal(ethers.parseEther("0.1"));
      expect(licenses[0].licenseType).to.equal("Commercial");
      expect(licenses[0].isActive).to.equal(true);
    });

    it("Should fail to create license for non-owner", async function () {
      await expect(
        licensingContract.connect(addr2).createLicense(
          1,
          addr3.address,
          ethers.parseEther("0.1"),
          86400,
          "Commercial",
          "Commercial use license"
        )
      ).to.be.revertedWith("Not the token owner");
    });

    it("Should fail to create license for non-existent token", async function () {
      await expect(
        licensingContract.connect(addr1).createLicense(
          999,
          addr2.address,
          ethers.parseEther("0.1"),
          86400,
          "Commercial",
          "Commercial use license"
        )
      ).to.be.revertedWith("Not the token owner");
    });

    it("Should fail to create license with invalid licensee", async function () {
      await expect(
        licensingContract.connect(addr1).createLicense(
          1,
          ethers.ZeroAddress,
          ethers.parseEther("0.1"),
          86400,
          "Commercial",
          "Commercial use license"
        )
      ).to.be.revertedWith("Invalid licensee address");
    });

    it("Should fail to create license with zero price", async function () {
      await expect(
        licensingContract.connect(addr1).createLicense(
          1,
          addr2.address,
          0,
          86400,
          "Commercial",
          "Commercial use license"
        )
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Should fail to create license with zero duration", async function () {
      await expect(
        licensingContract.connect(addr1).createLicense(
          1,
          addr2.address,
          ethers.parseEther("0.1"),
          0,
          "Commercial",
          "Commercial use license"
        )
      ).to.be.revertedWith("Duration must be greater than 0");
    });
  });

  describe("License Purchase", function () {
    beforeEach(async function () {
      // Mint an NFT for addr1
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr1).mintAsset(
        "QmTestHash123",
        "image/jpeg",
        1024000,
        "John Doe",
        "QmProvenanceHash123",
        "ipfs://QmMetadata123",
        { value: fee }
      );

      // Create license
      await licensingContract.connect(addr1).createLicense(
        1,
        addr2.address,
        ethers.parseEther("0.1"),
        86400,
        "Commercial",
        "Commercial use license"
      );
    });

    it("Should purchase license successfully", async function () {
      const licensePrice = ethers.parseEther("0.1");
      const initialBalance = await ethers.provider.getBalance(addr1.address);
      
      await expect(
        licensingContract.connect(addr2).purchaseLicense(1, 0, { value: licensePrice })
      ).to.emit(licensingContract, "ViewerAuthorized");

      const finalBalance = await ethers.provider.getBalance(addr1.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should fail with insufficient payment", async function () {
      const insufficientPayment = ethers.parseEther("0.05");
      
      await expect(
        licensingContract.connect(addr2).purchaseLicense(1, 0, { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should fail to purchase non-existent license", async function () {
      const licensePrice = ethers.parseEther("0.1");
      
      await expect(
        licensingContract.connect(addr2).purchaseLicense(1, 1, { value: licensePrice })
      ).to.be.revertedWith("License does not exist");
    });

    it("Should fail to purchase inactive license", async function () {
      // Revoke the license first
      await licensingContract.connect(addr1).revokeLicense(1, 0);
      
      const licensePrice = ethers.parseEther("0.1");
      await expect(
        licensingContract.connect(addr2).purchaseLicense(1, 0, { value: licensePrice })
      ).to.be.revertedWith("License is not active");
    });

    it("Should fail to purchase license by wrong licensee", async function () {
      const licensePrice = ethers.parseEther("0.1");
      
      await expect(
        licensingContract.connect(addr3).purchaseLicense(1, 0, { value: licensePrice })
      ).to.be.revertedWith("Not the intended licensee");
    });

    it("Should fail to purchase expired license", async function () {
      // Create a license with very short duration
      await licensingContract.connect(addr1).createLicense(
        1,
        addr3.address,
        ethers.parseEther("0.1"),
        1, // 1 second duration
        "Commercial",
        "Commercial use license"
      );

      // Wait for license to expire
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const licensePrice = ethers.parseEther("0.1");
      await expect(
        licensingContract.connect(addr3).purchaseLicense(1, 1, { value: licensePrice })
      ).to.be.revertedWith("License has expired");
    });
  });

  describe("License Revocation", function () {
    beforeEach(async function () {
      // Mint an NFT for addr1
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr1).mintAsset(
        "QmTestHash123",
        "image/jpeg",
        1024000,
        "John Doe",
        "QmProvenanceHash123",
        "ipfs://QmMetadata123",
        { value: fee }
      );

      // Create license
      await licensingContract.connect(addr1).createLicense(
        1,
        addr2.address,
        ethers.parseEther("0.1"),
        86400,
        "Commercial",
        "Commercial use license"
      );
    });

    it("Should revoke license successfully", async function () {
      await expect(
        licensingContract.connect(addr1).revokeLicense(1, 0)
      ).to.emit(licensingContract, "LicenseRevoked");

      const licenses = await licensingContract.getTokenLicenses(1);
      expect(licenses[0].isActive).to.equal(false);
    });

    it("Should fail to revoke license by non-licensor", async function () {
      await expect(
        licensingContract.connect(addr2).revokeLicense(1, 0)
      ).to.be.revertedWith("Not the licensor");
    });

    it("Should fail to revoke non-existent license", async function () {
      await expect(
        licensingContract.connect(addr1).revokeLicense(1, 1)
      ).to.be.revertedWith("License does not exist");
    });

    it("Should fail to revoke already inactive license", async function () {
      // Revoke once
      await licensingContract.connect(addr1).revokeLicense(1, 0);
      
      // Try to revoke again
      await expect(
        licensingContract.connect(addr1).revokeLicense(1, 0)
      ).to.be.revertedWith("License is already inactive");
    });
  });

  describe("Royalty Management", function () {
    beforeEach(async function () {
      // Mint an NFT for addr1
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr1).mintAsset(
        "QmTestHash123",
        "image/jpeg",
        1024000,
        "John Doe",
        "QmProvenanceHash123",
        "ipfs://QmMetadata123",
        { value: fee }
      );
    });

    it("Should set royalty successfully", async function () {
      await expect(
        licensingContract.connect(addr1).setRoyalty(1, addr2.address, 500) // 5%
      ).to.emit(licensingContract, "RoyaltySet");

      const royalty = await licensingContract.tokenRoyalties(1);
      expect(royalty.recipient).to.equal(addr2.address);
      expect(royalty.percentage).to.equal(500);
      expect(royalty.isActive).to.equal(true);
    });

    it("Should fail to set royalty for non-owner", async function () {
      await expect(
        licensingContract.connect(addr2).setRoyalty(1, addr3.address, 500)
      ).to.be.revertedWith("Not the token owner");
    });

    it("Should fail to set royalty with invalid recipient", async function () {
      await expect(
        licensingContract.connect(addr1).setRoyalty(1, ethers.ZeroAddress, 500)
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should fail to set royalty above 10%", async function () {
      await expect(
        licensingContract.connect(addr1).setRoyalty(1, addr2.address, 1500) // 15%
      ).to.be.revertedWith("Royalty percentage cannot exceed 10%");
    });
  });

  describe("Data Retrieval", function () {
    beforeEach(async function () {
      // Mint an NFT for addr1
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr1).mintAsset(
        "QmTestHash123",
        "image/jpeg",
        1024000,
        "John Doe",
        "QmProvenanceHash123",
        "ipfs://QmMetadata123",
        { value: fee }
      );

      // Create license
      await licensingContract.connect(addr1).createLicense(
        1,
        addr2.address,
        ethers.parseEther("0.1"),
        86400,
        "Commercial",
        "Commercial use license"
      );
    });

    it("Should return correct token licenses", async function () {
      const licenses = await licensingContract.getTokenLicenses(1);
      expect(licenses.length).to.equal(1);
      expect(licenses[0].tokenId).to.equal(1);
      expect(licenses[0].licensee).to.equal(addr2.address);
      expect(licenses[0].licensor).to.equal(addr1.address);
      expect(licenses[0].price).to.equal(ethers.parseEther("0.1"));
      expect(licenses[0].licenseType).to.equal("Commercial");
      expect(licenses[0].isActive).to.equal(true);
    });

    it("Should return correct user licenses", async function () {
      const userLicenses = await licensingContract.getUserLicenses(addr2.address);
      expect(userLicenses.length).to.equal(1);
      expect(userLicenses[0]).to.equal(1);
    });

    it("Should return active license", async function () {
      const activeLicense = await licensingContract.getActiveLicense(1, addr2.address);
      expect(activeLicense.licensee).to.equal(addr2.address);
      expect(activeLicense.licensor).to.equal(addr1.address);
      expect(activeLicense.isActive).to.equal(true);
    });

    it("Should fail to get active license for non-licensee", async function () {
      await expect(
        licensingContract.getActiveLicense(1, addr3.address)
      ).to.be.revertedWith("No active license found");
    });
  });

  describe("Fee Management", function () {
    it("Should set platform fee", async function () {
      await licensingContract.setPlatformFee(500); // 5%
      expect(await licensingContract.platformFee()).to.equal(500);
    });

    it("Should fail to set platform fee above 10%", async function () {
      await expect(
        licensingContract.setPlatformFee(1500) // 15%
      ).to.be.revertedWith("Platform fee cannot exceed 10%");
    });

    it("Should fail to set platform fee for non-owner", async function () {
      await expect(
        licensingContract.connect(addr1).setPlatformFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should set platform wallet", async function () {
      await licensingContract.setPlatformWallet(addr1.address);
      expect(await licensingContract.platformWallet()).to.equal(addr1.address);
    });

    it("Should fail to set invalid platform wallet", async function () {
      await expect(
        licensingContract.setPlatformWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid wallet address");
    });

    it("Should fail to set platform wallet for non-owner", async function () {
      await expect(
        licensingContract.connect(addr1).setPlatformWallet(addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Platform Fee Withdrawal", function () {
    beforeEach(async function () {
      // Mint an NFT for addr1
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr1).mintAsset(
        "QmTestHash123",
        "image/jpeg",
        1024000,
        "John Doe",
        "QmProvenanceHash123",
        "ipfs://QmMetadata123",
        { value: fee }
      );

      // Create and purchase license to generate platform fees
      await licensingContract.connect(addr1).createLicense(
        1,
        addr2.address,
        ethers.parseEther("0.1"),
        86400,
        "Commercial",
        "Commercial use license"
      );

      await licensingContract.connect(addr2).purchaseLicense(1, 0, { 
        value: ethers.parseEther("0.1") 
      });
    });

    it("Should withdraw platform fees successfully", async function () {
      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      await licensingContract.withdrawPlatformFees();
      
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should fail to withdraw platform fees for non-owner", async function () {
      await expect(
        licensingContract.connect(addr1).withdrawPlatformFees()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Payment Processing", function () {
    beforeEach(async function () {
      // Mint an NFT for addr1
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr1).mintAsset(
        "QmTestHash123",
        "image/jpeg",
        1024000,
        "John Doe",
        "QmProvenanceHash123",
        "ipfs://QmMetadata123",
        { value: fee }
      );

      // Set royalty
      await licensingContract.connect(addr1).setRoyalty(1, addr3.address, 500); // 5%

      // Create license
      await licensingContract.connect(addr1).createLicense(
        1,
        addr2.address,
        ethers.parseEther("0.1"),
        86400,
        "Commercial",
        "Commercial use license"
      );
    });

    it("Should process payment with royalty correctly", async function () {
      const licensePrice = ethers.parseEther("0.1");
      const initialLicensorBalance = await ethers.provider.getBalance(addr1.address);
      const initialRoyaltyRecipientBalance = await ethers.provider.getBalance(addr3.address);
      
      await licensingContract.connect(addr2).purchaseLicense(1, 0, { value: licensePrice });
      
      const finalLicensorBalance = await ethers.provider.getBalance(addr1.address);
      const finalRoyaltyRecipientBalance = await ethers.provider.getBalance(addr3.address);
      
      expect(finalLicensorBalance).to.be.gt(initialLicensorBalance);
      expect(finalRoyaltyRecipientBalance).to.be.gt(initialRoyaltyRecipientBalance);
    });

    it("Should calculate platform fee correctly", async function () {
      const licensePrice = ethers.parseEther("0.1");
      const platformFee = await licensingContract.platformFee();
      const expectedPlatformFee = (licensePrice * platformFee) / 10000;
      
      const initialPlatformWalletBalance = await ethers.provider.getBalance(owner.address);
      
      await licensingContract.connect(addr2).purchaseLicense(1, 0, { value: licensePrice });
      
      const finalPlatformWalletBalance = await ethers.provider.getBalance(owner.address);
      const actualPlatformFee = finalPlatformWalletBalance - initialPlatformWalletBalance;
      
      expect(actualPlatformFee).to.equal(expectedPlatformFee);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple licenses for same token", async function () {
      // Mint an NFT for addr1
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr1).mintAsset(
        "QmTestHash123",
        "image/jpeg",
        1024000,
        "John Doe",
        "QmProvenanceHash123",
        "ipfs://QmMetadata123",
        { value: fee }
      );

      // Create multiple licenses
      await licensingContract.connect(addr1).createLicense(
        1,
        addr2.address,
        ethers.parseEther("0.1"),
        86400,
        "Commercial",
        "License 1"
      );

      await licensingContract.connect(addr1).createLicense(
        1,
        addr3.address,
        ethers.parseEther("0.2"),
        172800,
        "Personal",
        "License 2"
      );

      const licenses = await licensingContract.getTokenLicenses(1);
      expect(licenses.length).to.equal(2);
      expect(licenses[0].licensee).to.equal(addr2.address);
      expect(licenses[1].licensee).to.equal(addr3.address);
    });

    it("Should handle license expiration correctly", async function () {
      // Mint an NFT for addr1
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr1).mintAsset(
        "QmTestHash123",
        "image/jpeg",
        1024000,
        "John Doe",
        "QmProvenanceHash123",
        "ipfs://QmMetadata123",
        { value: fee }
      );

      // Create license with short duration
      await licensingContract.connect(addr1).createLicense(
        1,
        addr2.address,
        ethers.parseEther("0.1"),
        1, // 1 second
        "Commercial",
        "Short license"
      );

      // Purchase license immediately
      await licensingContract.connect(addr2).purchaseLicense(1, 0, { 
        value: ethers.parseEther("0.1") 
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to purchase again
      await expect(
        licensingContract.connect(addr2).purchaseLicense(1, 0, { 
          value: ethers.parseEther("0.1") 
        })
      ).to.be.revertedWith("License has expired");
    });
  });
}); 