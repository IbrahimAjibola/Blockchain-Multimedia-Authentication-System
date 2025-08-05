// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MultimediaNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;
    
    Counters.Counter private _tokenIds;
    
    struct MultimediaAsset {
        string ipfsHash;
        string fileType;
        uint256 fileSize;
        string originalCreator;
        uint256 creationTimestamp;
        string provenanceHash;
        bool isLicensed;
        uint256 licensePrice;
        string licenseType;
        bool isVerified;
        uint256 verificationTimestamp;
        address verifier;
    }
    
    struct License {
        string licenseType;
        uint256 price;
        uint256 duration;
        bool isActive;
        string terms;
        uint256 maxViews;
        uint256 currentViews;
        mapping(address => bool) authorizedViewers;
        mapping(address => uint256) viewerPermissions;
    }
    
    mapping(uint256 => MultimediaAsset) public assets;
    mapping(uint256 => License) public licenses;
    mapping(address => uint256[]) public creatorTokens;
    mapping(string => bool) public ipfsHashExists;
    mapping(address => bool) public authorizedMinters;
    mapping(uint256 => bool) public tokenExists;
    
    uint256 public mintingFee = 0.005 ether;
    uint256 public verificationFee = 0.002 ether;
    uint256 public platformFee = 250; // 2.5% in basis points
    
    event AssetMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string ipfsHash,
        string fileType,
        uint256 fileSize,
        string tokenURI
    );
    
    event AssetVerified(
        uint256 indexed tokenId,
        address indexed verifier,
        uint256 verificationTimestamp
    );
    
    event LicenseUpdated(
        uint256 indexed tokenId,
        string licenseType,
        uint256 price,
        uint256 duration
    );
    
    event ViewerAuthorized(
        uint256 indexed tokenId,
        address indexed viewer,
        uint256 permissions
    );
    
    event ViewerRemoved(
        uint256 indexed tokenId,
        address indexed viewer
    );
    
    modifier onlyAuthorizedMinter() {
        require(
            authorizedMinters[msg.sender] || msg.sender == owner(),
            "Not authorized to mint"
        );
        _;
    }
    
    modifier tokenExists(uint256 tokenId) {
        require(tokenExists[tokenId], "Token does not exist");
        _;
    }
    
    modifier onlyTokenOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not the token owner");
        _;
    }
    
    constructor() ERC721("MultimediaNFT", "MMNFT") Ownable(msg.sender) {
        authorizedMinters[msg.sender] = true;
    }
    
    function mintAsset(
        string memory ipfsHash,
        string memory fileType,
        uint256 fileSize,
        string memory originalCreator,
        string memory provenanceHash,
        string memory tokenURI
    ) public payable nonReentrant returns (uint256) {
        require(msg.value >= mintingFee, "Insufficient minting fee");
        require(!ipfsHashExists[ipfsHash], "IPFS hash already exists");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(fileSize > 0, "File size must be greater than 0");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        assets[newTokenId] = MultimediaAsset({
            ipfsHash: ipfsHash,
            fileType: fileType,
            fileSize: fileSize,
            originalCreator: originalCreator,
            creationTimestamp: block.timestamp,
            provenanceHash: provenanceHash,
            isLicensed: false,
            licensePrice: 0,
            licenseType: "",
            isVerified: false,
            verificationTimestamp: 0,
            verifier: address(0)
        });
        
        tokenExists[newTokenId] = true;
        creatorTokens[msg.sender].push(newTokenId);
        ipfsHashExists[ipfsHash] = true;
        
        emit AssetMinted(newTokenId, msg.sender, ipfsHash, fileType, fileSize, tokenURI);
        
        return newTokenId;
    }
    
    function verifyAsset(uint256 tokenId) public payable nonReentrant {
        require(msg.value >= verificationFee, "Insufficient verification fee");
        require(tokenExists[tokenId], "Token does not exist");
        require(!assets[tokenId].isVerified, "Asset already verified");
        
        assets[tokenId].isVerified = true;
        assets[tokenId].verificationTimestamp = block.timestamp;
        assets[tokenId].verifier = msg.sender;
        
        emit AssetVerified(tokenId, msg.sender, block.timestamp);
    }
    
    function setLicense(
        uint256 tokenId,
        string memory licenseType,
        uint256 licensePrice,
        uint256 duration,
        string memory terms
    ) public tokenExists(tokenId) onlyTokenOwner(tokenId) {
        licenses[tokenId] = License({
            licenseType: licenseType,
            price: licensePrice,
            duration: duration,
            isActive: true,
            terms: terms,
            maxViews: 0,
            currentViews: 0
        });
        
        assets[tokenId].isLicensed = true;
        assets[tokenId].licensePrice = licensePrice;
        assets[tokenId].licenseType = licenseType;
        
        emit LicenseUpdated(tokenId, licenseType, licensePrice, duration);
    }
    
    function purchaseLicense(uint256 tokenId) public payable nonReentrant {
        require(tokenExists[tokenId], "Token does not exist");
        require(assets[tokenId].isLicensed, "Asset not licensed");
        require(msg.value >= assets[tokenId].licensePrice, "Insufficient payment");
        
        uint256 platformFeeAmount = (assets[tokenId].licensePrice * platformFee) / 10000;
        uint256 ownerAmount = assets[tokenId].licensePrice - platformFeeAmount;
        
        // Transfer payments
        payable(owner()).transfer(platformFeeAmount);
        payable(ownerOf(tokenId)).transfer(ownerAmount);
        
        // Grant viewing permissions
        licenses[tokenId].authorizedViewers[msg.sender] = true;
        licenses[tokenId].viewerPermissions[msg.sender] = block.timestamp + licenses[tokenId].duration;
        licenses[tokenId].currentViews++;
        
        emit ViewerAuthorized(tokenId, msg.sender, block.timestamp + licenses[tokenId].duration);
    }
    
    function authorizeViewer(
        uint256 tokenId,
        address viewer,
        uint256 permissions
    ) public tokenExists(tokenId) onlyTokenOwner(tokenId) {
        licenses[tokenId].authorizedViewers[viewer] = true;
        licenses[tokenId].viewerPermissions[viewer] = permissions;
        
        emit ViewerAuthorized(tokenId, viewer, permissions);
    }
    
    function removeViewer(uint256 tokenId, address viewer) 
        public tokenExists(tokenId) onlyTokenOwner(tokenId) {
        licenses[tokenId].authorizedViewers[viewer] = false;
        licenses[tokenId].viewerPermissions[viewer] = 0;
        
        emit ViewerRemoved(tokenId, viewer);
    }
    
    function checkViewPermission(uint256 tokenId, address viewer) 
        public view tokenExists(tokenId) returns (bool) {
        // Owner can always view
        if (ownerOf(tokenId) == viewer) return true;
        
        // Check if viewer is authorized and permission hasn't expired
        return licenses[tokenId].authorizedViewers[viewer] && 
               licenses[tokenId].viewerPermissions[viewer] > block.timestamp;
    }
    
    function getAsset(uint256 tokenId) public view tokenExists(tokenId) returns (
        string memory ipfsHash,
        string memory fileType,
        uint256 fileSize,
        string memory originalCreator,
        uint256 creationTimestamp,
        string memory provenanceHash,
        bool isLicensed,
        uint256 licensePrice,
        string memory licenseType,
        bool isVerified,
        uint256 verificationTimestamp,
        address verifier
    ) {
        MultimediaAsset storage asset = assets[tokenId];
        return (
            asset.ipfsHash,
            asset.fileType,
            asset.fileSize,
            asset.originalCreator,
            asset.creationTimestamp,
            asset.provenanceHash,
            asset.isLicensed,
            asset.licensePrice,
            asset.licenseType,
            asset.isVerified,
            asset.verificationTimestamp,
            asset.verifier
        );
    }
    
    function getLicense(uint256 tokenId) public view tokenExists(tokenId) returns (
        string memory licenseType,
        uint256 price,
        uint256 duration,
        bool isActive,
        string memory terms,
        uint256 maxViews,
        uint256 currentViews
    ) {
        License storage license = licenses[tokenId];
        return (
            license.licenseType,
            license.price,
            license.duration,
            license.isActive,
            license.terms,
            license.maxViews,
            license.currentViews
        );
    }
    
    function getCreatorTokens(address creator) public view returns (uint256[] memory) {
        return creatorTokens[creator];
    }
    
    function checkIPFSHashExists(string memory ipfsHash) public view returns (bool) {
        return ipfsHashExists[ipfsHash];
    }
    
    function getTokenCount() public view returns (uint256) {
        return _tokenIds.current();
    }
    
    function setMintingFee(uint256 newFee) public onlyOwner {
        mintingFee = newFee;
    }
    
    function setVerificationFee(uint256 newFee) public onlyOwner {
        verificationFee = newFee;
    }
    
    function setPlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Platform fee cannot exceed 10%");
        platformFee = newFee;
    }
    
    function addAuthorizedMinter(address minter) public onlyOwner {
        authorizedMinters[minter] = true;
    }
    
    function removeAuthorizedMinter(address minter) public onlyOwner {
        authorizedMinters[minter] = false;
    }
    
    function emergencyWithdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Required overrides for multiple inheritance
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 