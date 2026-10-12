// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SutraStudentIdentityNFT
 * @notice Soul-bound / Single-claim Identity Collectible for SUTRA Verified Students.
 * @dev Targeted for Base Sepolia (Chain ID 84532).
 * 
 * CORE INVARIANTS:
 * 1. Zero PII on-chain: Only pseudonym hashes (bytes32 sutraIdHash) and recipient addresses.
 * 2. Strict duplicate-mint prevention: Exactly 1 NFT per student sutraIdHash.
 * 3. Minimal non-PII ERC-721 metadata standard compliance.
 * 4. Testnet educational collectible: No monetary value.
 */

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IERC721Metadata is IERC721 {
    function name() external view returns (string memory);
    function sign() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

interface IERC5192 {
    event Locked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

contract SutraStudentIdentityNFT is IERC721Metadata, IERC5192 {
    // Custom Gas-Saving Errors
    error NotOwner();
    error ZeroAddress();
    error NonexistentToken();
    error AlreadyMinted(bytes32 sutraIdHash);
    error Unauthorized();
    error TransferRestricted();

    string private constant _NAME = "SUTRA Student Identity Collectible";
    string private constant _SYMBOL = "SUTRA-ID";

    address public owner;
    uint256 public totalMinted;

    // Mapping tokenId => owner address
    mapping(uint256 => address) private _owners;
    // Mapping owner address => token count
    mapping(address => uint256) private _balances;
    // Mapping tokenId => tokenURI
    mapping(uint256 => string) private _tokenURIs;
    // Duplicate mint protection: sutraIdHash => bool
    mapping(bytes32 => bool) public hasMintedSutraId;
    // Mapping sutraIdHash => tokenId
    mapping(bytes32 => uint256) public tokenIdBySutraIdHash;

    event StudentIdentityMinted(
        uint256 indexed tokenId,
        bytes32 indexed sutraIdHash,
        address indexed recipient,
        string tokenURI
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function name() external pure override returns (string memory) {
        return _NAME;
    }

    function sign() external pure returns (string memory) {
        return "SUTRA-VERIFIED-IDENTITY-BASE-SEPOLIA";
    }

    function symbol() external pure override returns (string memory) {
        return _SYMBOL;
    }

    function totalSupply() external view returns (uint256) {
        return totalMinted;
    }

    function balanceOf(address tokenOwner) public view override returns (uint256) {
        if (tokenOwner == address(0)) revert ZeroAddress();
        return _balances[tokenOwner];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert NonexistentToken();
        return tokenOwner;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        return _tokenURIs[tokenId];
    }

    /**
     * @notice Mints a unique student identity collectible on Base Sepolia.
     * @dev Zero PII parameters: only recipient address and cryptographically hashed sutraId.
     * @param recipient The address receiving the student identity NFT.
     * @param sutraIdHash Keccak256 or SHA256 hash of the student's pseudonymous SUTRA ID.
     * @param uri Immutable, content-addressed metadata for the independent identity artwork.
     */
    function mintIdentity(
        address recipient,
        bytes32 sutraIdHash,
        string calldata uri
    ) external onlyOwner returns (uint256) {
        if (recipient == address(0)) revert ZeroAddress();
        if (sutraIdHash == bytes32(0)) revert Unauthorized();
        if (hasMintedSutraId[sutraIdHash]) revert AlreadyMinted(sutraIdHash);

        uint256 tokenId = totalMinted + 1;
        totalMinted = tokenId;

        hasMintedSutraId[sutraIdHash] = true;
        tokenIdBySutraIdHash[sutraIdHash] = tokenId;

        _owners[tokenId] = recipient;
        _balances[recipient] += 1;
        _tokenURIs[tokenId] = uri;

        emit Transfer(address(0), recipient, tokenId);
        emit StudentIdentityMinted(tokenId, sutraIdHash, recipient, uri);
        emit Locked(tokenId);

        return tokenId;
    }

    /**
     * @notice Educational identity collectibles are soul-bound to the recipient to prevent secondary market exploitation.
     */
    function transferFrom(address, address, uint256) public pure override {
        revert TransferRestricted();
    }

    function safeTransferFrom(address, address, uint256) public pure override {
        revert TransferRestricted();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) public pure override {
        revert TransferRestricted();
    }

    function approve(address, uint256) public pure override {
        revert TransferRestricted();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert TransferRestricted();
    }

    function getApproved(uint256) public pure override returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false;
    }

    function locked(uint256 tokenId) external view override returns (bool) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        return true;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IERC5192).interfaceId;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
