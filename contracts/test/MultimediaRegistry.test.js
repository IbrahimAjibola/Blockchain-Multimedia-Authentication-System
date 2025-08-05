const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultimediaRegistry", function () {
  let multimediaRegistry;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    
    const MultimediaRegistry = await ethers.getContractFactory("MultimediaRegistry");
    multimediaRegistry = await MultimediaRegistry.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await multimediaRegistry.owner()).to.equal(owner.address);
    });

    it("Should set owner as authorized registrar", async function () {
      expect(await multimediaRegistry.authorizedRegistrars(owner.address)).to.equal(true);
    });

    it("Should have correct initial fees", async function () {
      expect(await multimediaRegistry.registrationFee()).to.equal(ethers.parseEther("0.01"));
      expect(await multimediaRegistry.verificationFee()).to.equal(ethers.parseEther("0.005"));
      expect(await multimediaRegistry.platformFee()).to.equal(250);
    });
  });

  describe("Content Registration", function () {
    const testData = {
      ipfsHash: "QmTestHash123",
      metadataHash: "QmMetadataHash123",
      fileType: "image/jpeg",
      fileSize: 1024000,
      originalCreator: "John Doe",
      provenanceHash: "QmProvenanceHash123",
      licenseType: "Commercial",
      licensePrice: ethers.parseEther("0.1"),
      licenseDuration: 86400 // 1 day
    };

    it("Should register content successfully", async function () {
      const fee = await multimediaRegistry.registrationFee();
      
      await expect(
        multimediaRegistry.connect(addr1).registerContent(
          testData.ipfsHash,
          testData.metadataHash,
          testData.fileType,
          testData.fileSize,
          testData.originalCreator,
          testData.provenanceHash,
          testData.licenseType,
          testData.licensePrice,
          testData.licenseDuration,
          { value: fee }
        )
      ).to.emit(multimediaRegistry, "ContentRegistered");

      const content = await multimediaRegistry.getContent(1);
      expect(content.ipfsHash).to.equal(testData.ipfsHash);
      expect(content.metadataHash).to.equal(testData.metadataHash);
      expect(content.fileType).to.equal(testData.fileType);
      expect(content.fileSize).to.equal(testData.fileSize);
      expect(content.originalCreator).to.equal(testData.originalCreator);
      expect(content.isRegistered).to.equal(true);
      expect(content.registrant).to.equal(addr1.address);
    });

    it("Should fail with insufficient registration fee", async function () {
      const insufficientFee = ethers.parseEther("0.005");
      
      await expect(
        multimediaRegistry.connect(addr1).registerContent(
          testData.ipfsHash,
          testData.metadataHash,
          testData.fileType,
          testData.fileSize,
          testData.originalCreator,
          testData.provenanceHash,
          testData.licenseType,
          testData.licensePrice,
          testData.licenseDuration,
          { value: insufficientFee }
        )
      ).to.be.revertedWith("Insufficient registration fee");
    });

    it("Should fail with empty IPFS hash", async function () {
      const fee = await multimediaRegistry.registrationFee();
      
      await expect(
        multimediaRegistry.connect(addr1).registerContent(
          "",
          testData.metadataHash,
          testData.fileType,
          testData.fileSize,
          testData.originalCreator,
          testData.provenanceHash,
          testData.licenseType,
          testData.licensePrice,
          testData.licenseDuration,
          { value: fee }
        )
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("Should fail with zero file size", async function () {
      const fee = await multimediaRegistry.registrationFee();
      
      await expect(
        multimediaRegistry.connect(addr1).registerContent(
          testData.ipfsHash,
          testData.metadataHash,
          testData.fileType,
          0,
          testData.originalCreator,
          testData.provenanceHash,
          testData.licenseType,
          testData.licensePrice,
          testData.licenseDuration,
          { value: fee }
        )
      ).to.be.revertedWith("File size must be greater than 0");
    });

    it("Should fail with duplicate IPFS hash", async function () {
      const fee = await multimediaRegistry.registrationFee();
      
      // First registration
      await multimediaRegistry.connect(addr1).registerContent(
        testData.ipfsHash,
        testData.metadataHash,
        testData.fileType,
        testData.fileSize,
        testData.originalCreator,
        testData.provenanceHash,
        testData.licenseType,
        testData.licensePrice,
        testData.licenseDuration,
        { value: fee }
      );

      // Second registration with same hash
      await expect(
        multimediaRegistry.connect(addr2).registerContent(
          testData.ipfsHash,
          "QmDifferentMetadata",
          testData.fileType,
          testData.fileSize,
          "Jane Doe",
          "QmDifferentProvenance",
          "Personal",
          ethers.parseEther("0.05"),
          3600,
          { value: fee }
        )
      ).to.be.revertedWith("Content already registered");
    });
  });

  describe("Content Verification", function () {
    beforeEach(async function () {
      const fee = await multimediaRegistry.registrationFee();
      await multimediaRegistry.connect(addr1).registerContent(
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
    });

    it("Should verify content successfully", async function () {
      const verificationFee = await multimediaRegistry.verificationFee();
      
      await expect(
        multimediaRegistry.connect(addr2).verifyContent(1, { value: verificationFee })
      ).to.emit(multimediaRegistry, "ContentVerified");

      const content = await multimediaRegistry.getContent(1);
      expect(content.isVerified).to.equal(true);
    });

    it("Should fail with insufficient verification fee", async function () {
      const insufficientFee = ethers.parseEther("0.001");
      
      await expect(
        multimediaRegistry.connect(addr2).verifyContent(1, { value: insufficientFee })
      ).to.be.revertedWith("Insufficient verification fee");
    });

    it("Should fail to verify non-existent content", async function () {
      const verificationFee = await multimediaRegistry.verificationFee();
      
      await expect(
        multimediaRegistry.connect(addr2).verifyContent(999, { value: verificationFee })
      ).to.be.revertedWith("Content does not exist");
    });

    it("Should fail to verify already verified content", async function () {
      const verificationFee = await multimediaRegistry.verificationFee();
      
      // First verification
      await multimediaRegistry.connect(addr2).verifyContent(1, { value: verificationFee });
      
      // Second verification
      await expect(
        multimediaRegistry.connect(addr3).verifyContent(1, { value: verificationFee })
      ).to.be.revertedWith("Content already verified");
    });
  });

  describe("License Management", function () {
    beforeEach(async function () {
      const fee = await multimediaRegistry.registrationFee();
      await multimediaRegistry.connect(addr1).registerContent(
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
    });

    it("Should update license successfully", async function () {
      await expect(
        multimediaRegistry.connect(addr1).updateLicense(
          1,
          "Personal",
          ethers.parseEther("0.05"),
          3600,
          "Personal use only"
        )
      ).to.emit(multimediaRegistry, "LicenseUpdated");

      const license = await multimediaRegistry.getLicense(1);
      expect(license.licenseType).to.equal("Personal");
      expect(license.price).to.equal(ethers.parseEther("0.05"));
      expect(license.duration).to.equal(3600);
      expect(license.isActive).to.equal(true);
      expect(license.terms).to.equal("Personal use only");
    });

    it("Should fail to update license for non-owner", async function () {
      await expect(
        multimediaRegistry.connect(addr2).updateLicense(
          1,
          "Personal",
          ethers.parseEther("0.05"),
          3600,
          "Personal use only"
        )
      ).to.be.revertedWith("Not the content owner");
    });

    it("Should fail to update license for non-existent content", async function () {
      await expect(
        multimediaRegistry.connect(addr1).updateLicense(
          999,
          "Personal",
          ethers.parseEther("0.05"),
          3600,
          "Personal use only"
        )
      ).to.be.revertedWith("Content does not exist");
    });
  });

  describe("License Purchase", function () {
    beforeEach(async function () {
      const fee = await multimediaRegistry.registrationFee();
      await multimediaRegistry.connect(addr1).registerContent(
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
    });

    it("Should purchase license successfully", async function () {
      const licensePrice = ethers.parseEther("0.1");
      
      await expect(
        multimediaRegistry.connect(addr2).purchaseLicense(1, { value: licensePrice })
      ).to.emit(multimediaRegistry, "ViewerAuthorized");

      const license = await multimediaRegistry.getLicense(1);
      expect(license.currentViews).to.equal(1);
    });

    it("Should fail with insufficient payment", async function () {
      const insufficientPayment = ethers.parseEther("0.05");
      
      await expect(
        multimediaRegistry.connect(addr2).purchaseLicense(1, { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should fail to purchase license for non-existent content", async function () {
      const licensePrice = ethers.parseEther("0.1");
      
      await expect(
        multimediaRegistry.connect(addr2).purchaseLicense(999, { value: licensePrice })
      ).to.be.revertedWith("Content does not exist");
    });
  });

  describe("Viewer Management", function () {
    beforeEach(async function () {
      const fee = await multimediaRegistry.registrationFee();
      await multimediaRegistry.connect(addr1).registerContent(
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
    });

    it("Should authorize viewer successfully", async function () {
      const permissions = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      await expect(
        multimediaRegistry.connect(addr1).authorizeViewer(1, addr2.address, permissions)
      ).to.emit(multimediaRegistry, "ViewerAuthorized");

      expect(await multimediaRegistry.checkViewPermission(1, addr2.address)).to.equal(true);
    });

    it("Should remove viewer successfully", async function () {
      const permissions = Math.floor(Date.now() / 1000) + 3600;
      
      await multimediaRegistry.connect(addr1).authorizeViewer(1, addr2.address, permissions);
      await multimediaRegistry.connect(addr1).removeViewer(1, addr2.address);
      
      expect(await multimediaRegistry.checkViewPermission(1, addr2.address)).to.equal(false);
    });

    it("Should fail to authorize viewer for non-owner", async function () {
      const permissions = Math.floor(Date.now() / 1000) + 3600;
      
      await expect(
        multimediaRegistry.connect(addr2).authorizeViewer(1, addr3.address, permissions)
      ).to.be.revertedWith("Not the content owner");
    });

    it("Should fail to remove viewer for non-owner", async function () {
      await expect(
        multimediaRegistry.connect(addr2).removeViewer(1, addr3.address)
      ).to.be.revertedWith("Not the content owner");
    });
  });

  describe("View Permissions", function () {
    beforeEach(async function () {
      const fee = await multimediaRegistry.registrationFee();
      await multimediaRegistry.connect(addr1).registerContent(
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
    });

    it("Should allow owner to view content", async function () {
      expect(await multimediaRegistry.checkViewPermission(1, addr1.address)).to.equal(true);
    });

    it("Should deny unauthorized viewer", async function () {
      expect(await multimediaRegistry.checkViewPermission(1, addr2.address)).to.equal(false);
    });

    it("Should allow authorized viewer", async function () {
      const permissions = Math.floor(Date.now() / 1000) + 3600;
      await multimediaRegistry.connect(addr1).authorizeViewer(1, addr2.address, permissions);
      
      expect(await multimediaRegistry.checkViewPermission(1, addr2.address)).to.equal(true);
    });

    it("Should deny viewer with expired permissions", async function () {
      const expiredPermissions = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      await multimediaRegistry.connect(addr1).authorizeViewer(1, addr2.address, expiredPermissions);
      
      expect(await multimediaRegistry.checkViewPermission(1, addr2.address)).to.equal(false);
    });
  });

  describe("Content Retrieval", function () {
    beforeEach(async function () {
      const fee = await multimediaRegistry.registrationFee();
      await multimediaRegistry.connect(addr1).registerContent(
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
    });

    it("Should return correct content data", async function () {
      const content = await multimediaRegistry.getContent(1);
      expect(content.ipfsHash).to.equal("QmTestHash123");
      expect(content.metadataHash).to.equal("QmMetadataHash123");
      expect(content.fileType).to.equal("image/jpeg");
      expect(content.fileSize).to.equal(1024000);
      expect(content.originalCreator).to.equal("John Doe");
      expect(content.registrant).to.equal(addr1.address);
    });

    it("Should return correct license data", async function () {
      const license = await multimediaRegistry.getLicense(1);
      expect(license.licenseType).to.equal("Commercial");
      expect(license.price).to.equal(ethers.parseEther("0.1"));
      expect(license.duration).to.equal(86400);
      expect(license.isActive).to.equal(true);
    });

    it("Should return user content", async function () {
      const userContent = await multimediaRegistry.getUserContent(addr1.address);
      expect(userContent.length).to.equal(1);
      expect(userContent[0]).to.equal(1);
    });

    it("Should return content count", async function () {
      expect(await multimediaRegistry.getContentCount()).to.equal(1);
    });
  });

  describe("Fee Management", function () {
    it("Should set registration fee", async function () {
      const newFee = ethers.parseEther("0.02");
      await multimediaRegistry.setRegistrationFee(newFee);
      expect(await multimediaRegistry.registrationFee()).to.equal(newFee);
    });

    it("Should set verification fee", async function () {
      const newFee = ethers.parseEther("0.01");
      await multimediaRegistry.setVerificationFee(newFee);
      expect(await multimediaRegistry.verificationFee()).to.equal(newFee);
    });

    it("Should set platform fee", async function () {
      const newFee = 500; // 5%
      await multimediaRegistry.setPlatformFee(newFee);
      expect(await multimediaRegistry.platformFee()).to.equal(newFee);
    });

    it("Should fail to set platform fee above 10%", async function () {
      const newFee = 1500; // 15%
      await expect(
        multimediaRegistry.setPlatformFee(newFee)
      ).to.be.revertedWith("Platform fee cannot exceed 10%");
    });

    it("Should fail to set fees for non-owner", async function () {
      const newFee = ethers.parseEther("0.02");
      await expect(
        multimediaRegistry.connect(addr1).setRegistrationFee(newFee)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Registrar Management", function () {
    it("Should add authorized registrar", async function () {
      await multimediaRegistry.addAuthorizedRegistrar(addr1.address);
      expect(await multimediaRegistry.authorizedRegistrars(addr1.address)).to.equal(true);
    });

    it("Should remove authorized registrar", async function () {
      await multimediaRegistry.addAuthorizedRegistrar(addr1.address);
      await multimediaRegistry.removeAuthorizedRegistrar(addr1.address);
      expect(await multimediaRegistry.authorizedRegistrars(addr1.address)).to.equal(false);
    });

    it("Should fail to manage registrars for non-owner", async function () {
      await expect(
        multimediaRegistry.connect(addr1).addAuthorizedRegistrar(addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Fee Withdrawal", function () {
    beforeEach(async function () {
      const verificationFee = await multimediaRegistry.verificationFee();
      const fee = await multimediaRegistry.registrationFee();
      
      await multimediaRegistry.connect(addr1).registerContent(
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
      
      await multimediaRegistry.connect(addr2).verifyContent(1, { value: verificationFee });
    });

    it("Should withdraw fees successfully", async function () {
      const initialBalance = await ethers.provider.getBalance(addr2.address);
      
      await multimediaRegistry.connect(addr2).withdrawFees();
      
      const finalBalance = await ethers.provider.getBalance(addr2.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should fail to withdraw when no fees available", async function () {
      await multimediaRegistry.connect(addr2).withdrawFees();
      
      await expect(
        multimediaRegistry.connect(addr2).withdrawFees()
      ).to.be.revertedWith("No fees to withdraw");
    });
  });

  describe("Contract Balance", function () {
    it("Should return correct contract balance", async function () {
      const fee = await multimediaRegistry.registrationFee();
      await multimediaRegistry.connect(addr1).registerContent(
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
      
      expect(await multimediaRegistry.getContractBalance()).to.equal(fee);
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow owner to emergency withdraw", async function () {
      const fee = await multimediaRegistry.registrationFee();
      await multimediaRegistry.connect(addr1).registerContent(
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
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      await multimediaRegistry.emergencyWithdraw();
      const finalBalance = await ethers.provider.getBalance(owner.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should fail for non-owner", async function () {
      await expect(
        multimediaRegistry.connect(addr1).emergencyWithdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 