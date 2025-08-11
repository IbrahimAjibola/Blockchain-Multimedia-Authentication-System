// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MultimediaRegistry is Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 private _contentIds;

    struct Content {
        uint256 contentId;
        string ipfsHash;
        string metadataHash;
        string fileType;
        uint256 fileSize;
        string originalCreator;
        uint256 creationTimestamp;
        string provenanceHash;
        bool isRegistered;
        bool isVerified;
        address registrant;
        uint256 registrationFee;
        string licenseType;
        uint256 licensePrice;
        mapping(address => bool) authorizedViewers;
        mapping(address => uint256) viewerPermissions;
    }

    struct License {
        string licenseType;
        uint256 price;
        uint256 duration;
        bool isActive;
        string terms;
        uint256 maxViews;
        uint256 currentViews;
    }

    mapping(uint256 => Content) public contents;
    mapping(string => uint256) public hashToContentId;
    mapping(address => uint256[]) public userContent;
    mapping(uint256 => License) public contentLicenses;
    mapping(address => bool) public authorizedRegistrars;
    mapping(address => uint256) public userBalance;

    uint256 public registrationFee = 0.01 ether;
    uint256 public verificationFee = 0.005 ether;
    uint256 public platformFee = 250; // 2.5% in basis points

    event ContentRegistered(
        uint256 indexed contentId,
        address indexed registrant,
        string ipfsHash,
        string metadataHash,
        string fileType,
        uint256 fileSize
    );

    event ContentVerified(
        uint256 indexed contentId,
        address indexed verifier,
        bool verified
    );

    event LicenseUpdated(
        uint256 indexed contentId,
        string licenseType,
        uint256 price,
        uint256 duration
    );

    event ViewerAuthorized(
        uint256 indexed contentId,
        address indexed viewer,
        uint256 permissions
    );

    event ViewerRemoved(
        uint256 indexed contentId,
        address indexed viewer
    );

    event FeeWithdrawn(
        address indexed user,
        uint256 amount
    );

    modifier onlyAuthorizedRegistrar() {
        require(
            authorizedRegistrars[msg.sender] || msg.sender == owner(),
            "Not authorized to register content"
        );
        _;
    }

    modifier contentExists(uint256 contentId) {
        require(contents[contentId].isRegistered, "Content does not exist");
        _;
    }

    modifier onlyContentOwner(uint256 contentId) {
        require(
            contents[contentId].registrant == msg.sender,
            "Not the content owner"
        );
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedRegistrars[msg.sender] = true;
    }

    function registerContent(
        string memory ipfsHash,
        string memory metadataHash,
        string memory fileType,
        uint256 fileSize,
        string memory originalCreator,
        string memory provenanceHash,
        string memory licenseType,
        uint256 licensePrice,
        uint256 licenseDuration
    ) public payable nonReentrant returns (uint256) {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(hashToContentId[ipfsHash] == 0, "Content already registered");
        require(fileSize > 0, "File size must be greater than 0");

        _contentIds++;
        uint256 newContentId = _contentIds;

        Content storage newContent = contents[newContentId];
        newContent.contentId = newContentId;
        newContent.ipfsHash = ipfsHash;
        newContent.metadataHash = metadataHash;
        newContent.fileType = fileType;
        newContent.fileSize = fileSize;
        newContent.originalCreator = originalCreator;
        newContent.creationTimestamp = block.timestamp;
        newContent.provenanceHash = provenanceHash;
        newContent.isRegistered = true;
        newContent.registrant = msg.sender;
        newContent.registrationFee = msg.value;

        hashToContentId[ipfsHash] = newContentId;
        userContent[msg.sender].push(newContentId);

        // Set license if provided
        if (bytes(licenseType).length > 0) {
            contentLicenses[newContentId] = License({
                licenseType: licenseType,
                price: licensePrice,
                duration: licenseDuration,
                isActive: true,
                terms: "",
                maxViews: 0,
                currentViews: 0
            });
        }

        emit ContentRegistered(
            newContentId,
            msg.sender,
            ipfsHash,
            metadataHash,
            fileType,
            fileSize
        );

        return newContentId;
    }

    function verifyContent(uint256 contentId) public payable nonReentrant {
        require(msg.value >= verificationFee, "Insufficient verification fee");
        require(contents[contentId].isRegistered, "Content does not exist");
        require(!contents[contentId].isVerified, "Content already verified");

        contents[contentId].isVerified = true;
        userBalance[msg.sender] += msg.value;

        emit ContentVerified(contentId, msg.sender, true);
    }

    function updateLicense(
        uint256 contentId,
        string memory licenseType,
        uint256 price,
        uint256 duration,
        string memory terms
    ) public contentExists(contentId) onlyContentOwner(contentId) {
        contentLicenses[contentId] = License({
            licenseType: licenseType,
            price: price,
            duration: duration,
            isActive: true,
            terms: terms,
            maxViews: 0,
            currentViews: 0
        });

        emit LicenseUpdated(contentId, licenseType, price, duration);
    }

    function purchaseLicense(uint256 contentId) public payable nonReentrant {
        require(contents[contentId].isRegistered, "Content does not exist");
        License storage license = contentLicenses[contentId];
        require(license.isActive, "License not available");
        require(msg.value >= license.price, "Insufficient payment");

        uint256 platformFeeAmount = (license.price * platformFee) / 10000;
        uint256 ownerAmount = license.price - platformFeeAmount;

        // Transfer payments
        payable(owner()).transfer(platformFeeAmount);
        payable(contents[contentId].registrant).transfer(ownerAmount);

        // Grant viewing permissions
        contents[contentId].authorizedViewers[msg.sender] = true;
        contents[contentId].viewerPermissions[msg.sender] = block.timestamp + license.duration;

        license.currentViews++;

        emit ViewerAuthorized(contentId, msg.sender, block.timestamp + license.duration);
    }

    function authorizeViewer(
        uint256 contentId,
        address viewer,
        uint256 permissions
    ) public contentExists(contentId) onlyContentOwner(contentId) {
        contents[contentId].authorizedViewers[viewer] = true;
        contents[contentId].viewerPermissions[viewer] = permissions;

        emit ViewerAuthorized(contentId, viewer, permissions);
    }

    function removeViewer(uint256 contentId, address viewer) 
        public contentExists(contentId) onlyContentOwner(contentId) {
        contents[contentId].authorizedViewers[viewer] = false;
        contents[contentId].viewerPermissions[viewer] = 0;

        emit ViewerRemoved(contentId, viewer);
    }

    function checkViewPermission(uint256 contentId, address viewer) 
        public view contentExists(contentId) returns (bool) {
        Content storage content = contents[contentId];
        
        // Owner can always view
        if (content.registrant == viewer) return true;
        
        // Check if viewer is authorized and permission hasn't expired
        return content.authorizedViewers[viewer] && 
               content.viewerPermissions[viewer] > block.timestamp;
    }

    function getContent(uint256 contentId) 
        public view contentExists(contentId) returns (
            uint256 contentId_,
            string memory ipfsHash,
            string memory metadataHash,
            string memory fileType,
            uint256 fileSize,
            string memory originalCreator,
            uint256 creationTimestamp,
            string memory provenanceHash,
            bool isVerified,
            address registrant,
            uint256 registrationFee
        ) {
        Content storage content = contents[contentId];
        return (
            content.contentId,
            content.ipfsHash,
            content.metadataHash,
            content.fileType,
            content.fileSize,
            content.originalCreator,
            content.creationTimestamp,
            content.provenanceHash,
            content.isVerified,
            content.registrant,
            content.registrationFee
        );
    }

    function getLicense(uint256 contentId) 
        public view contentExists(contentId) returns (
            string memory licenseType,
            uint256 price,
            uint256 duration,
            bool isActive,
            string memory terms,
            uint256 maxViews,
            uint256 currentViews
        ) {
        License storage license = contentLicenses[contentId];
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

    function getUserContent(address user) public view returns (uint256[] memory) {
        return userContent[user];
    }

    function getContentCount() public view returns (uint256) {
        return _contentIds;
    }

    function setRegistrationFee(uint256 newFee) public onlyOwner {
        registrationFee = newFee;
    }

    function setVerificationFee(uint256 newFee) public onlyOwner {
        verificationFee = newFee;
    }

    function setPlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Platform fee cannot exceed 10%");
        platformFee = newFee;
    }

    function addAuthorizedRegistrar(address registrar) public onlyOwner {
        authorizedRegistrars[registrar] = true;
    }

    function removeAuthorizedRegistrar(address registrar) public onlyOwner {
        authorizedRegistrars[registrar] = false;
    }

    function withdrawFees() public nonReentrant {
        uint256 amount = userBalance[msg.sender];
        require(amount > 0, "No fees to withdraw");

        userBalance[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit FeeWithdrawn(msg.sender, amount);
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function emergencyWithdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
} 