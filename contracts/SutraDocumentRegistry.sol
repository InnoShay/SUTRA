// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SutraDocumentRegistry
 * @author SUTRA (Student Success and Intervention Orchestration Engine)
 * @notice Minimal, privacy-preserving document integrity registry for Base Sepolia (Chain ID 84532).
 * @dev Stores immutable SHA-256 fingerprints of finalized educational documents (e.g., intervention
 *      plans, retention agreements, escalation notices) on-chain.
 *      
 *      PRIVACY GUARANTEE:
 *      Strictly prohibits on-chain storage of PII (student names, roll numbers, grades, attendance,
 *      or confidential clinical/counseling notes). Only opaque document reference hashes and
 *      cryptographic SHA-256 byte fingerprints are registered.
 */
contract SutraDocumentRegistry {
    struct AnchorRecord {
        bytes32 documentHash;   // SHA-256 cryptographic hash of exact raw document bytes
        uint256 anchoredAt;     // Block timestamp of anchoring
        address anchoredBy;     // Authorized submitter / campus relayer address
        bool isAnchored;        // Existence flag
    }

    // Mapping: opaque document reference hash => AnchorRecord
    mapping(bytes32 => AnchorRecord) private _anchors;

    // Total counter of anchored documents
    uint256 public totalAnchored;

    // Emitted when a document is anchored
    event DocumentAnchored(
        bytes32 indexed docRefHash,
        bytes32 indexed documentHash,
        uint256 timestamp,
        address indexed anchoredBy
    );

    // Custom errors for gas efficiency
    error InvalidHash();
    error AlreadyAnchored(bytes32 docRefHash, uint256 originalTimestamp);

    /**
     * @notice Anchors a finalized document's SHA-256 fingerprint.
     * @param docRefHash Cryptographic hash of the opaque internal document reference (e.g. keccak256(versionId)).
     * @param documentHash The SHA-256 hash of the exact document binary bytes.
     * @return success True if anchored, or true if already anchored with identical hash (idempotent).
     */
    function anchorDocument(
        bytes32 docRefHash,
        bytes32 documentHash
    ) external returns (bool success) {
        if (docRefHash == bytes32(0) || documentHash == bytes32(0)) {
            revert InvalidHash();
        }

        // Idempotency check: if already anchored with identical document hash, succeed safely
        if (_anchors[docRefHash].isAnchored) {
            if (_anchors[docRefHash].documentHash == documentHash) {
                return true;
            }
            revert AlreadyAnchored(docRefHash, _anchors[docRefHash].anchoredAt);
        }

        _anchors[docRefHash] = AnchorRecord({
            documentHash: documentHash,
            anchoredAt: block.timestamp,
            anchoredBy: msg.sender,
            isAnchored: true
        });

        unchecked {
            totalAnchored++;
        }

        emit DocumentAnchored(docRefHash, documentHash, block.timestamp, msg.sender);
        return true;
    }

    /**
     * @notice Queries the stored anchor record for an opaque document reference hash.
     * @param docRefHash The hash of the opaque document reference.
     * @return documentHash The stored SHA-256 document hash.
     * @return anchoredAt The block timestamp when anchored.
     * @return anchoredBy The address that submitted the anchor.
     * @return isAnchored Whether this document is anchored.
     */
    function getDocumentAnchor(
        bytes32 docRefHash
    ) external view returns (
        bytes32 documentHash,
        uint256 anchoredAt,
        address anchoredBy,
        bool isAnchored
    ) {
        AnchorRecord memory rec = _anchors[docRefHash];
        return (rec.documentHash, rec.anchoredAt, rec.anchoredBy, rec.isAnchored);
    }

    /**
     * @notice Verifies whether a candidate document's hash matches the on-chain anchor.
     * @param docRefHash The hash of the opaque document reference.
     * @param candidateHash The SHA-256 hash of candidate document bytes to verify.
     * @return isMatch True if candidate matches the anchored hash.
     * @return anchoredAt The anchoring block timestamp (0 if not anchored).
     */
    function verifyDocument(
        bytes32 docRefHash,
        bytes32 candidateHash
    ) external view returns (bool isMatch, uint256 anchoredAt) {
        AnchorRecord memory rec = _anchors[docRefHash];
        if (!rec.isAnchored) {
            return (false, 0);
        }
        return (rec.documentHash == candidateHash, rec.anchoredAt);
    }
}
