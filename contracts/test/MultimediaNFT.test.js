const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultimediaNFT", function () {
  let multimediaNFT;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    
    const MultimediaNFT = await ethers.getContractFactory("MultimediaNFT");
    multimediaNFT = await MultimediaNFT.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await multimediaNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await multimediaNFT.name()).to.equal("MultimediaNFT");
      expect(await multimediaNFT.symbol()).to.equal("MMNFT");
    });

    it("Should set owner as authorized minter", async function () {
      expect(await multimediaNFT.authorizedMinters(owner.address)).to.equal(true);
    });

    it("Should have correct initial fees", async function () {
      expect(await multimediaNFT.mintingFee()).to.equal(ethers.parseEther("0.005"));
      expect(await multimediaNFT.verificationFee()).to.equal(ethers.parseEther("0.002"));
      expect(await multimediaNFT.platformFee()).to.equal(250);
    });
  });

  describe("Minting", function () {
    const testData = {
      ipfsHash: "QmTestHash123",
      fileType: "image/jpeg",
      fileSize: 1024000,
      originalCreator: "John Doe",
      provenanceHash: "QmProvenanceHash123",
      tokenURI: "ipfs://QmMetadata123"
    };

    it("Should mint a new asset successfully", async function () {
      const fee = await multimediaNFT.mintingFee();
      
      await expect(
        multimediaNFT.connect(addr1).mintAsset(
          testData.ipfsHash,
          testData.fileType,
          testData.fileSize,
          testData.originalCreator,
          testData.provenanceHash,
          testData.tokenURI,
          { value: fee }
        )
      ).to.emit(multimediaNFT, "AssetMinted");

      const asset = await multimediaNFT.getAsset(1);
      expect(asset.ipfsHash).to.equal(testData.ipfsHash);
      expect(asset.fileType).to.equal(testData.fileType);
      expect(asset.fileSize).to.equal(testData.fileSize);
      expect(asset.originalCreator).to.equal(testData.originalCreator);
      expect(asset.provenanceHash).to.equal(testData.provenanceHash);
      expect(asset.isLicensed).to.equal(false);
      expect(asset.isVerified).to.equal(false);
    });

    it("Should fail with insufficient minting fee", async function () {
      const insufficientFee = ethers.parseEther("0.001");
      
      await expect(
        multimediaNFT.connect(addr1).mintAsset(
          testData.ipfsHash,
          testData.fileType,
          testData.fileSize,
          testData.originalCreator,
          testData.provenanceHash,
          testData.tokenURI,
          { value: insufficientFee }
        )
      ).to.be.revertedWith("Insufficient minting fee");
    });

    it("Should not allow minting with duplicate IPFS hash", async function () {
      const fee = await multimediaNFT.mintingFee();
      
      await multimediaNFT.connect(addr1).mintAsset(
        testData.ipfsHash,
        testData.fileType,
        testData.fileSize,
        testData.originalCreator,
        testData.provenanceHash,
        testData.tokenURI,
        { value: fee }
      );

      await expect(
        multimediaNFT.connect(addr2).mintAsset(
          testData.ipfsHash,
          "image/png",
          2048000,
          "Jane Doe",
          "QmProvenanceHash456",
          "ipfs://QmMetadata456",
          { value: fee }
        )
      ).to.be.revertedWith("IPFS hash already exists");
    });

    it("Should not allow minting with empty IPFS hash", async function () {
      const fee = await multimediaNFT.mintingFee();
      
      await expect(
        multimediaNFT.connect(addr1).mintAsset(
          "",
          testData.fileType,
          testData.fileSize,
          testData.originalCreator,
          testData.provenanceHash,
          testData.tokenURI,
          { value: fee }
        )
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("Should not allow minting with zero file size", async function () {
      const fee = await multimediaNFT.mintingFee();
      
      await expect(
        multimediaNFT.connect(addr1).mintAsset(
          testData.ipfsHash,
          testData.fileType,
          0,
          testData.originalCreator,
          testData.provenanceHash,
          testData.tokenURI,
          { value: fee }
        )
      ).to.be.revertedWith("File size must be greater than 0");
    });
  });

  describe("Asset Verification", function () {
    beforeEach(async function () {
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

    it("Should verify asset successfully", async function () {
      const verificationFee = await multimediaNFT.verificationFee();
      
      await expect(
        multimediaNFT.connect(addr2).verifyAsset(1, { value: verificationFee })
      ).to.emit(multimediaNFT, "AssetVerified");

      const asset = await multimediaNFT.getAsset(1);
      expect(asset.isVerified).to.equal(true);
      expect(asset.verifier).to.equal(addr2.address);
    });

    it("Should fail with insufficient verification fee", async function () {
      const insufficientFee = ethers.parseEther("0.001");
      
      await expect(
        multimediaNFT.connect(addr2).verifyAsset(1, { value: insufficientFee })
      ).to.be.revertedWith("Insufficient verification fee");
    });

    it("Should fail to verify non-existent token", async function () {
      const verificationFee = await multimediaNFT.verificationFee();
      
      await expect(
        multimediaNFT.connect(addr2).verifyAsset(999, { value: verificationFee })
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should fail to verify already verified asset", async function () {
      const verificationFee = await multimediaNFT.verificationFee();
      
      // First verification
      await multimediaNFT.connect(addr2).verifyAsset(1, { value: verificationFee });
      
      // Second verification
      await expect(
        multimediaNFT.connect(addr3).verifyAsset(1, { value: verificationFee })
      ).to.be.revertedWith("Asset already verified");
    });
  });

  describe("License Management", function () {
    beforeEach(async function () {
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

    it("Should set license successfully", async function () {
      await expect(
        multimediaNFT.connect(addr1).setLicense(
          1,
          "Commercial",
          ethers.parseEther("0.1"),
          86400,
          "Commercial use license"
        )
      ).to.emit(multimediaNFT, "LicenseUpdated");

      const asset = await multimediaNFT.getAsset(1);
      expect(asset.isLicensed).to.equal(true);
      expect(asset.licensePrice).to.equal(ethers.parseEther("0.1"));
      expect(asset.licenseType).to.equal("Commercial");

      const license = await multimediaNFT.getLicense(1);
      expect(license.licenseType).to.equal("Commercial");
      expect(license.price).to.equal(ethers.parseEther("0.1"));
      expect(license.duration).to.equal(86400);
      expect(license.isActive).to.equal(true);
      expect(license.terms).to.equal("Commercial use license");
    });

    it("Should fail to set license for non-owner", async function () {
      await expect(
        multimediaNFT.connect(addr2).setLicense(
          1,
          "Commercial",
          ethers.parseEther("0.1"),
          86400,
          "Commercial use license"
        )
      ).to.be.revertedWith("Not the token owner");
    });

    it("Should fail to set license for non-existent token", async function () {
      await expect(
        multimediaNFT.connect(addr1).setLicense(
          999,
          "Commercial",
          ethers.parseEther("0.1"),
          86400,
          "Commercial use license"
        )
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("License Purchase", function () {
    beforeEach(async function () {
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
      
      await multimediaNFT.connect(addr1).setLicense(
        1,
        "Commercial",
        ethers.parseEther("0.1"),
        86400,
        "Commercial use license"
      );
    });

    it("Should purchase license successfully", async function () {
      const licensePrice = ethers.parseEther("0.1");
      
      await expect(
        multimediaNFT.connect(addr2).purchaseLicense(1, { value: licensePrice })
      ).to.emit(multimediaNFT, "ViewerAuthorized");

      const license = await multimediaNFT.getLicense(1);
      expect(license.currentViews).to.equal(1);
    });

    it("Should fail with insufficient payment", async function () {
      const insufficientPayment = ethers.parseEther("0.05");
      
      await expect(
        multimediaNFT.connect(addr2).purchaseLicense(1, { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should fail to purchase license for non-licensed asset", async function () {
      const fee = await multimediaNFT.mintingFee();
      await multimediaNFT.connect(addr3).mintAsset(
        "QmTestHash456",
        "image/png",
        2048000,
        "Jane Doe",
        "QmProvenanceHash456",
        "ipfs://QmMetadata456",
        { value: fee }
      );
      
      const licensePrice = ethers.parseEther("0.1");
      await expect(
        multimediaNFT.connect(addr2).purchaseLicense(2, { value: licensePrice })
      ).to.be.revertedWith("Asset not licensed");
    });

    it("Should fail to purchase license for non-existent token", async function () {
      const licensePrice = ethers.parseEther("0.1");
      await expect(
        multimediaNFT.connect(addr2).purchaseLicense(999, { value: licensePrice })
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Viewer Management", function () {
    beforeEach(async function () {
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

    it("Should authorize viewer successfully", async function () {
      const permissions = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      await expect(
        multimediaNFT.connect(addr1).authorizeViewer(1, addr2.address, permissions)
      ).to.emit(multimediaNFT, "ViewerAuthorized");

      expect(await multimediaNFT.checkViewPermission(1, addr2.address)).to.equal(true);
    });

    it("Should remove viewer successfully", async function () {
      const permissions = Math.floor(Date.now() / 1000) + 3600;
      
      await multimediaNFT.connect(addr1).authorizeViewer(1, addr2.address, permissions);
      await multimediaNFT.connect(addr1).removeViewer(1, addr2.address);
      
      expect(await multimediaNFT.checkViewPermission(1, addr2.address)).to.equal(false);
    });

    it("Should fail to authorize viewer for non-owner", async function () {
      const permissions = Math.floor(Date.now() / 1000) + 3600;
      
      await expect(
        multimediaNFT.connect(addr2).authorizeViewer(1, addr3.address, permissions)
      ).to.be.revertedWith("Not the token owner");
    });

    it("Should fail to remove viewer for non-owner", async function () {
      await expect(
        multimediaNFT.connect(addr2).removeViewer(1, addr3.address)
      ).to.be.revertedWith("Not the token owner");
    });
  });

  describe("View Permissions", function () {
    beforeEach(async function () {
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

    it("Should allow owner to view content", async function () {
      expect(await multimediaNFT.checkViewPermission(1, addr1.address)).to.equal(true);
    });

    it("Should deny unauthorized viewer", async function () {
      expect(await multimediaNFT.checkViewPermission(1, addr2.address)).to.equal(false);
    });

    it("Should allow authorized viewer", async function () {
      const permissions = Math.floor(Date.now() / 1000) + 3600;
      await multimediaNFT.connect(addr1).authorizeViewer(1, addr2.address, permissions);
      
      expect(await multimediaNFT.checkViewPermission(1, addr2.address)).to.equal(true);
    });

    it("Should deny viewer with expired permissions", async function () {
      const expiredPermissions = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      await multimediaNFT.connect(addr1).authorizeViewer(1, addr2.address, expiredPermissions);
      
      expect(await multimediaNFT.checkViewPermission(1, addr2.address)).to.equal(false);
    });
  });

  describe("Asset Retrieval", function () {
    beforeEach(async function () {
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

    it("Should return correct asset data", async function () {
      const asset = await multimediaNFT.getAsset(1);
      expect(asset.ipfsHash).to.equal("QmTestHash123");
      expect(asset.fileType).to.equal("image/jpeg");
      expect(asset.fileSize).to.equal(1024000);
      expect(asset.originalCreator).to.equal("John Doe");
      expect(asset.isLicensed).to.equal(false);
      expect(asset.isVerified).to.equal(false);
    });

    it("Should return creator tokens", async function () {
      const tokens = await multimediaNFT.getCreatorTokens(addr1.address);
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.equal(1);
    });

    it("Should check IPFS hash existence", async function () {
      expect(await multimediaNFT.checkIPFSHashExists("QmTestHash123")).to.equal(true);
      expect(await multimediaNFT.checkIPFSHashExists("QmNonExistentHash")).to.equal(false);
    });

    it("Should return token count", async function () {
      expect(await multimediaNFT.getTokenCount()).to.equal(1);
    });
  });

  describe("Token URI", function () {
    beforeEach(async function () {
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

    it("Should return correct token URI", async function () {
      expect(await multimediaNFT.tokenURI(1)).to.equal("ipfs://QmMetadata123");
    });
  });

  describe("Fee Management", function () {
    it("Should set minting fee", async function () {
      const newFee = ethers.parseEther("0.01");
      await multimediaNFT.setMintingFee(newFee);
      expect(await multimediaNFT.mintingFee()).to.equal(newFee);
    });

    it("Should set verification fee", async function () {
      const newFee = ethers.parseEther("0.005");
      await multimediaNFT.setVerificationFee(newFee);
      expect(await multimediaNFT.verificationFee()).to.equal(newFee);
    });

    it("Should set platform fee", async function () {
      const newFee = 500; // 5%
      await multimediaNFT.setPlatformFee(newFee);
      expect(await multimediaNFT.platformFee()).to.equal(newFee);
    });

    it("Should fail to set platform fee above 10%", async function () {
      const newFee = 1500; // 15%
      await expect(
        multimediaNFT.setPlatformFee(newFee)
      ).to.be.revertedWith("Platform fee cannot exceed 10%");
    });

    it("Should fail to set fees for non-owner", async function () {
      const newFee = ethers.parseEther("0.01");
      await expect(
        multimediaNFT.connect(addr1).setMintingFee(newFee)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Minter Management", function () {
    it("Should add authorized minter", async function () {
      await multimediaNFT.addAuthorizedMinter(addr1.address);
      expect(await multimediaNFT.authorizedMinters(addr1.address)).to.equal(true);
    });

    it("Should remove authorized minter", async function () {
      await multimediaNFT.addAuthorizedMinter(addr1.address);
      await multimediaNFT.removeAuthorizedMinter(addr1.address);
      expect(await multimediaNFT.authorizedMinters(addr1.address)).to.equal(false);
    });

    it("Should fail to manage minters for non-owner", async function () {
      await expect(
        multimediaNFT.connect(addr1).addAuthorizedMinter(addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow owner to emergency withdraw", async function () {
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
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      await multimediaNFT.emergencyWithdraw();
      const finalBalance = await ethers.provider.getBalance(owner.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should fail for non-owner", async function () {
      await expect(
        multimediaNFT.connect(addr1).emergencyWithdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("ERC-721 Functionality", function () {
    beforeEach(async function () {
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

    it("Should support ERC-721 interface", async function () {
      const erc721InterfaceId = "0x80ac58cd";
      expect(await multimediaNFT.supportsInterface(erc721InterfaceId)).to.equal(true);
    });

    it("Should support ERC-721Enumerable interface", async function () {
      const erc721EnumerableInterfaceId = "0x780e9d63";
      expect(await multimediaNFT.supportsInterface(erc721EnumerableInterfaceId)).to.equal(true);
    });

    it("Should return correct token owner", async function () {
      expect(await multimediaNFT.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should return correct total supply", async function () {
      expect(await multimediaNFT.totalSupply()).to.equal(1);
    });

    it("Should return correct token by index", async function () {
      expect(await multimediaNFT.tokenByIndex(0)).to.equal(1);
    });

    it("Should return correct token of owner by index", async function () {
      expect(await multimediaNFT.tokenOfOwnerByIndex(addr1.address, 0)).to.equal(1);
    });

    it("Should return correct balance of owner", async function () {
      expect(await multimediaNFT.balanceOf(addr1.address)).to.equal(1);
    });
  });
}); 