// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MultimediaNFT is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;
    
    uint256 private _tokenIds;
    
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
        string tokenURI;
    }
    
    mapping(uint256 => MultimediaAsset) public assets;
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
    
    modifier onlyAuthorizedMinter() {
        require(
            authorizedMinters[msg.sender] || msg.sender == owner(),
            "Not authorized to mint"
        );
        _;
    }
    
    modifier onlyTokenOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not the token owner");
        _;
    }
    
    constructor() ERC721("Multimedia NFT", "MNFT") Ownable(msg.sender) {}
    
    function mintAsset(
        string memory ipfsHash,
        string memory fileType,
        uint256 fileSize,
        string memory originalCreator,
        string memory provenanceHash,
        string memory tokenURI
    ) public payable nonReentrant onlyAuthorizedMinter {
        require(msg.value >= mintingFee, "Insufficient minting fee");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(fileSize > 0, "File size must be greater than 0");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
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
            verifier: address(0),
            tokenURI: tokenURI
        });
        
        creatorTokens[msg.sender].push(newTokenId);
        ipfsHashExists[ipfsHash] = true;
        tokenExists[newTokenId] = true;
        
        emit AssetMinted(newTokenId, msg.sender, ipfsHash, fileType, fileSize, tokenURI);
    }
    
    function verifyAsset(uint256 tokenId) public payable nonReentrant {
        require(tokenExists[tokenId], "Token does not exist");
        require(msg.value >= verificationFee, "Insufficient verification fee");
        
        assets[tokenId].isVerified = true;
        assets[tokenId].verificationTimestamp = block.timestamp;
        assets[tokenId].verifier = msg.sender;
        
        emit AssetVerified(tokenId, msg.sender, block.timestamp);
    }
    
    function getAsset(uint256 tokenId) public view returns (MultimediaAsset memory) {
        require(tokenExists[tokenId], "Token does not exist");
        return assets[tokenId];
    }
    
    function getCreatorTokens(address creator) public view returns (uint256[] memory) {
        return creatorTokens[creator];
    }
    
    function checkIPFSHashExists(string memory ipfsHash) public view returns (bool) {
        return ipfsHashExists[ipfsHash];
    }
    
    function getTokenCount() public view returns (uint256) {
        return _tokenIds;
    }
    
    function addAuthorizedMinter(address minter) public onlyOwner {
        authorizedMinters[minter] = true;
    }
    
    function removeAuthorizedMinter(address minter) public onlyOwner {
        authorizedMinters[minter] = false;
    }
    
    function setMintingFee(uint256 newFee) public onlyOwner {
        mintingFee = newFee;
    }
    
    function setVerificationFee(uint256 newFee) public onlyOwner {
        verificationFee = newFee;
    }
    
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        require(tokenExists[tokenId], "Token does not exist");
        assets[tokenId].tokenURI = _tokenURI;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenExists[tokenId], "Token does not exist");
        return assets[tokenId].tokenURI;
    }
} 