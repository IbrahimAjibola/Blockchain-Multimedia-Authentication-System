// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract LicensingContract is Ownable, ReentrancyGuard {
    IERC721 public multimediaNFT;
    
    struct License {
        uint256 tokenId;
        address licensee;
        address licensor;
        uint256 price;
        uint256 startDate;
        uint256 endDate;
        string licenseType;
        bool isActive;
        string terms;
    }
    
    struct Royalty {
        address recipient;
        uint256 percentage;
        bool isActive;
    }
    
    mapping(uint256 => License[]) public tokenLicenses;
    mapping(uint256 => Royalty) public tokenRoyalties;
    mapping(address => uint256[]) public userLicenses;
    
    uint256 public platformFee = 250; // 2.5% in basis points
    address public platformWallet;
    
    event LicenseCreated(
        uint256 indexed tokenId,
        address indexed licensee,
        address indexed licensor,
        uint256 price,
        string licenseType
    );
    
    event LicenseRevoked(
        uint256 indexed tokenId,
        address indexed licensee,
        address indexed licensor
    );
    
    event RoyaltySet(
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 percentage
    );
    
    constructor(address _multimediaNFT, address _platformWallet) Ownable(msg.sender) {
        multimediaNFT = IERC721(_multimediaNFT);
        platformWallet = _platformWallet;
    }
    
    function createLicense(
        uint256 tokenId,
        address licensee,
        uint256 price,
        uint256 duration,
        string memory licenseType,
        string memory terms
    ) public nonReentrant {
        require(multimediaNFT.ownerOf(tokenId) == msg.sender, "Not the token owner");
        require(licensee != address(0), "Invalid licensee address");
        require(price > 0, "Price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        
        uint256 startDate = block.timestamp;
        uint256 endDate = startDate + duration;
        
        License memory newLicense = License({
            tokenId: tokenId,
            licensee: licensee,
            licensor: msg.sender,
            price: price,
            startDate: startDate,
            endDate: endDate,
            licenseType: licenseType,
            isActive: true,
            terms: terms
        });
        
        tokenLicenses[tokenId].push(newLicense);
        userLicenses[licensee].push(tokenId);
        
        emit LicenseCreated(tokenId, licensee, msg.sender, price, licenseType);
    }
    
    function purchaseLicense(uint256 tokenId, uint256 licenseIndex) public payable nonReentrant {
        require(licenseIndex < tokenLicenses[tokenId].length, "License does not exist");
        License storage license = tokenLicenses[tokenId][licenseIndex];
        
        require(license.isActive, "License is not active");
        require(license.licensee == msg.sender, "Not the intended licensee");
        require(msg.value >= license.price, "Insufficient payment");
        require(block.timestamp <= license.endDate, "License has expired");
        
        // Calculate platform fee
        uint256 platformFeeAmount = (license.price * platformFee) / 10000;
        uint256 licensorAmount = license.price - platformFeeAmount;
        
        // Transfer payments
        payable(platformWallet).transfer(platformFeeAmount);
        payable(license.licensor).transfer(licensorAmount);
        
        // Process royalties if any
        Royalty memory royalty = tokenRoyalties[tokenId];
        if (royalty.isActive && royalty.percentage > 0) {
            uint256 royaltyAmount = (licensorAmount * royalty.percentage) / 10000;
            payable(royalty.recipient).transfer(royaltyAmount);
            payable(license.licensor).transfer(licensorAmount - royaltyAmount);
        }
    }
    
    function revokeLicense(uint256 tokenId, uint256 licenseIndex) public {
        require(licenseIndex < tokenLicenses[tokenId].length, "License does not exist");
        License storage license = tokenLicenses[tokenId][licenseIndex];
        
        require(license.licensor == msg.sender, "Not the licensor");
        require(license.isActive, "License is already inactive");
        
        license.isActive = false;
        
        emit LicenseRevoked(tokenId, license.licensee, msg.sender);
    }
    
    function setRoyalty(
        uint256 tokenId,
        address recipient,
        uint256 percentage
    ) public {
        require(multimediaNFT.ownerOf(tokenId) == msg.sender, "Not the token owner");
        require(recipient != address(0), "Invalid recipient address");
        require(percentage <= 1000, "Royalty percentage cannot exceed 10%");
        
        tokenRoyalties[tokenId] = Royalty({
            recipient: recipient,
            percentage: percentage,
            isActive: true
        });
        
        emit RoyaltySet(tokenId, recipient, percentage);
    }
    
    function getTokenLicenses(uint256 tokenId) public view returns (License[] memory) {
        return tokenLicenses[tokenId];
    }
    
    function getUserLicenses(address user) public view returns (uint256[] memory) {
        return userLicenses[user];
    }
    
    function getActiveLicense(uint256 tokenId, address licensee) public view returns (License memory) {
        for (uint256 i = 0; i < tokenLicenses[tokenId].length; i++) {
            License memory license = tokenLicenses[tokenId][i];
            if (license.licensee == licensee && license.isActive && block.timestamp <= license.endDate) {
                return license;
            }
        }
        revert("No active license found");
    }
    
    function setPlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Platform fee cannot exceed 10%");
        platformFee = newFee;
    }
    
    function setPlatformWallet(address newWallet) public onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }
    
    function withdrawPlatformFees() public onlyOwner {
        payable(platformWallet).transfer(address(this).balance);
    }
} 