import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from app.core.config import PROJECT_ROOT, settings

logger = logging.getLogger("sutra.blockchain")

# Load ABIs
ARTIFACT_PATH = PROJECT_ROOT / "contracts" / "SutraDocumentRegistry.json"
REGISTRY_ABI = []
if ARTIFACT_PATH.exists():
    try:
        with open(ARTIFACT_PATH, "r", encoding="utf-8") as f:
            REGISTRY_ABI = json.load(f).get("abi", [])
    except Exception as e:
        logger.warning(f"Could not load SutraDocumentRegistry.json: {e}")

NFT_ARTIFACT_PATH = PROJECT_ROOT / "contracts" / "SutraStudentIdentityNFT.json"
NFT_ABI = []
if NFT_ARTIFACT_PATH.exists():
    try:
        with open(NFT_ARTIFACT_PATH, "r", encoding="utf-8") as f:
            NFT_ABI = json.load(f).get("abi", [])
    except Exception as e:
        logger.warning(f"Could not load SutraStudentIdentityNFT.json: {e}")


class BaseSepoliaService:
    """
    Client for interacting with the SutraDocumentRegistry and SutraStudentIdentityNFT smart contracts
    on Base Sepolia (Chain ID 84532).
    
    Provides:
    1. Real on-chain anchoring via Web3 when credentials/funds are configured.
    2. Document anchoring may use its configured demo boundary, while identity minting is
       live-only and never fabricates transaction hashes or token IDs.
    3. Byte-level verification against on-chain records.
    4. Non-PII Identity NFT minting with duplicate protection on Base Sepolia.
    """

    def __init__(self):
        self.chain_id = settings.BASE_SEPOLIA_CHAIN_ID
        self.rpc_url = settings.BASE_SEPOLIA_RPC_URL
        self.contract_address = settings.BASE_SEPOLIA_CONTRACT_ADDRESS
        self.nft_contract_address = settings.BASE_SEPOLIA_NFT_CONTRACT_ADDRESS
        self.private_key = settings.BASE_SEPOLIA_PRIVATE_KEY
        self.mode = settings.ANCHOR_MODE

        self._w3 = None
        self._contract = None
        self._nft_contract = None

    def _get_web3(self):
        if self._w3 is None:
            try:
                from web3 import Web3
                self._w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            except Exception as e:
                logger.warning(f"Web3 initialization failed: {e}")
        return self._w3

    def _get_contract(self):
        if self._contract is None and self.contract_address and REGISTRY_ABI:
            w3 = self._get_web3()
            if w3 and w3.is_connected():
                try:
                    self._contract = w3.eth.contract(
                        address=w3.to_checksum_address(self.contract_address),
                        abi=REGISTRY_ABI,
                    )
                except Exception as e:
                    logger.warning(f"Contract instance initialization failed: {e}")
        return self._contract

    def registry_anchor_ready(self) -> bool:
        """True when the configured Base Sepolia registry is deployed and readable."""
        if not (self.contract_address and REGISTRY_ABI):
            return False
        try:
            w3 = self._get_web3()
            if not w3 or not w3.is_connected() or w3.eth.chain_id != self.chain_id:
                return False
            address = w3.to_checksum_address(self.contract_address)
            if not w3.eth.get_code(address):
                return False
            return self._get_contract() is not None
        except Exception as exc:
            logger.warning("Base Sepolia registry readiness check failed: %s", exc)
            return False

    def read_document_anchor(self, doc_ref: str) -> Optional[Dict[str, Any]]:
        """Read the authoritative anchor record from the deployed registry contract."""
        w3 = self._get_web3()
        contract = self._get_contract()
        if not w3 or not contract or w3.eth.chain_id != self.chain_id:
            raise RuntimeError("The Base Sepolia document registry is unavailable.")
        doc_ref_bytes = self.doc_ref_to_bytes32(doc_ref)
        document_hash, anchored_at, anchored_by, is_anchored = contract.functions.getDocumentAnchor(
            doc_ref_bytes
        ).call()
        if not is_anchored:
            return None
        return {
            "document_hash": bytes(document_hash).hex(),
            "anchored_at": int(anchored_at),
            "anchored_by": w3.to_checksum_address(anchored_by),
        }

    def confirm_anchor_transaction(
        self,
        doc_ref: str,
        document_hash: str,
        tx_hash: str,
    ) -> Dict[str, Any]:
        """Confirm a wallet-broadcast anchor transaction against the registry and receipt."""
        w3 = self._get_web3()
        contract = self._get_contract()
        if not w3 or not contract or w3.eth.chain_id != self.chain_id:
            raise RuntimeError("The configured Base Sepolia document registry is unavailable.")
        if not self.contract_address:
            raise RuntimeError("No Base Sepolia document registry is configured.")

        receipt = w3.eth.get_transaction_receipt(tx_hash)
        transaction = w3.eth.get_transaction(tx_hash)
        if receipt.status != 1:
            raise RuntimeError("The wallet transaction did not succeed on Base Sepolia.")

        expected_contract = w3.to_checksum_address(self.contract_address)
        transaction_to = transaction.get("to")
        receipt_to = receipt.get("to")
        if not transaction_to or w3.to_checksum_address(transaction_to) != expected_contract:
            raise RuntimeError("The supplied transaction was not sent to the configured registry contract.")
        if receipt_to and w3.to_checksum_address(receipt_to) != expected_contract:
            raise RuntimeError("The transaction receipt contract does not match the configured registry.")

        doc_ref_bytes = self.doc_ref_to_bytes32(doc_ref)
        hash_bytes = self.hash_hex_to_bytes32(document_hash)
        expected_input = contract.functions.anchorDocument(doc_ref_bytes, hash_bytes)._encode_transaction_data()
        actual_input = transaction.get("input", transaction.get("data", ""))
        if isinstance(actual_input, (bytes, bytearray)):
            actual_input = "0x" + bytes(actual_input).hex()
        if str(actual_input).lower() != expected_input.lower():
            raise RuntimeError("The wallet transaction does not contain this document's exact anchor hashes.")

        onchain_hash, anchored_at, _anchored_by, is_anchored = contract.functions.getDocumentAnchor(
            doc_ref_bytes
        ).call()
        if not is_anchored or bytes(onchain_hash).hex() != hash_bytes.hex():
            raise RuntimeError("The registry state does not match this document's SHA-256 fingerprint.")

        block = w3.eth.get_block(receipt.blockNumber)
        tx_hex = tx_hash if tx_hash.startswith("0x") else f"0x{tx_hash}"
        return {
            "chain_id": self.chain_id,
            "contract_address": expected_contract,
            "tx_hash": tx_hex,
            "block_number": int(receipt.blockNumber),
            "anchored_at": datetime.fromtimestamp(int(block.timestamp), tz=timezone.utc),
            "explorer_url": f"https://sepolia.basescan.org/tx/{tx_hex}",
            "anchoring_mode": "onchain",
            "message": "Wallet transaction confirmed and registry state matches the document hash.",
        }

    def _get_nft_contract(self):
        if self._nft_contract is None and self.nft_contract_address and NFT_ABI:
            w3 = self._get_web3()
            if w3 and w3.is_connected():
                try:
                    self._nft_contract = w3.eth.contract(
                        address=w3.to_checksum_address(self.nft_contract_address),
                        abi=NFT_ABI,
                    )
                except Exception as e:
                    logger.warning(f"NFT Contract instance initialization failed: {e}")
        return self._nft_contract

    def nft_mint_ready(self) -> bool:
        """Return true only when a real mint and immutable metadata pin can succeed."""
        if not (
            self.mode.lower() == "onchain"
            and self.chain_id == 84532
            and self.private_key
            and self.nft_contract_address
            and settings.PINATA_JWT
            and NFT_ABI
        ):
            return False

        try:
            from eth_account import Account

            w3 = self._get_web3()
            if not w3 or not w3.is_connected() or w3.eth.chain_id != self.chain_id:
                return False
            address = w3.to_checksum_address(self.nft_contract_address)
            if not w3.eth.get_code(address):
                return False
            signer = Account.from_key(self.private_key)
            contract = self._get_nft_contract()
            if not contract:
                return False
            contract_owner = w3.to_checksum_address(contract.functions.owner().call())
            return (
                contract_owner == w3.to_checksum_address(signer.address)
                and w3.eth.get_balance(signer.address) > 0
            )
        except Exception as exc:
            logger.warning("Base Sepolia NFT mint readiness check failed: %s", exc)
            return False

    async def pin_identity_artwork(self, sutra_id: str, art_seed: str) -> str:
        """Pin raster art and privacy-safe ERC-721 JSON to IPFS; return metadata URI."""
        import hashlib
        import httpx

        from app.services.identity_art import artwork_traits, render_identity_art

        if not settings.PINATA_JWT:
            raise RuntimeError("PINATA_JWT must be configured before identity NFTs can be minted.")

        api_root = settings.PINATA_API_URL.rstrip("/")
        headers = {"Authorization": f"Bearer {settings.PINATA_JWT}"}
        art_bytes = render_identity_art(art_seed)
        art_sha256 = hashlib.sha256(art_bytes).hexdigest()
        traits = artwork_traits(art_seed)
        async with httpx.AsyncClient(timeout=45.0) as client:
            image_response = await client.post(
                f"{api_root}/pinning/pinFileToIPFS",
                headers=headers,
                data={
                    "pinataMetadata": json.dumps({"name": f"SUTRA Identity Art {sutra_id}"}),
                    "pinataOptions": json.dumps({"cidVersion": 1}),
                },
                files={"file": (f"{sutra_id}.png", art_bytes, "image/png")},
            )
            image_response.raise_for_status()
            image_cid = image_response.json().get("IpfsHash")
            if not image_cid:
                raise RuntimeError("The metadata pinning service did not return an artwork CID.")

            metadata = {
                "name": f"SUTRA Identity {sutra_id}",
                "description": (
                    "A unique SUTRA identity artwork. This non-transferable testnet credential "
                    "contains no profile name, avatar, academic record, or other personal data."
                ),
                "image": f"ipfs://{image_cid}",
                "attributes": [
                    {"trait_type": name, "value": value} for name, value in traits.items()
                ]
                + [
                    {"trait_type": "Artwork SHA-256", "value": art_sha256},
                    {"trait_type": "Network", "value": "Base Sepolia"},
                    {"trait_type": "Credential", "value": "SUTRA Student Identity"},
                ],
            }
            metadata_response = await client.post(
                f"{api_root}/pinning/pinJSONToIPFS",
                headers={**headers, "Content-Type": "application/json"},
                json={
                    "pinataContent": metadata,
                    "pinataMetadata": {"name": f"SUTRA Identity Metadata {sutra_id}"},
                    "pinataOptions": {"cidVersion": 1},
                },
            )
            metadata_response.raise_for_status()
            metadata_cid = metadata_response.json().get("IpfsHash")
            if not metadata_cid:
                raise RuntimeError("The metadata pinning service did not return a metadata CID.")

        return f"ipfs://{metadata_cid}"

    @staticmethod
    def doc_ref_to_bytes32(doc_ref: str) -> bytes:
        """Derives a deterministic, privacy-preserving 32-byte identifier from opaque doc_ref."""
        import hashlib
        return hashlib.sha256(doc_ref.encode("utf-8")).digest()

    @staticmethod
    def hash_hex_to_bytes32(hash_hex: str) -> bytes:
        """Converts a 64-char hex SHA-256 string into 32 raw bytes."""
        clean = hash_hex.strip().lower()
        if clean.startswith("0x"):
            clean = clean[2:]
        return bytes.fromhex(clean)

    async def verify_on_chain(
        self,
        doc_ref: str,
        candidate_hash: str,
    ) -> Tuple[bool, Optional[int]]:
        """
        Queries the SutraDocumentRegistry contract directly to verify whether the candidate
        hash matches what is recorded on Base Sepolia.
        """
        contract = self._get_contract()
        if not contract:
            return (False, None)

        try:
            doc_ref_bytes = self.doc_ref_to_bytes32(doc_ref)
            cand_bytes = self.hash_hex_to_bytes32(candidate_hash)
            is_match, timestamp = contract.functions.verifyDocument(doc_ref_bytes, cand_bytes).call()
            return (bool(is_match), int(timestamp))
        except Exception as e:
            logger.warning(f"On-chain verification query failed: {e}")
            return (False, None)


    async def mint_identity_nft(
        self,
        sutra_id: str,
        recipient_address: Optional[str] = None,
        token_uri: str = "",
    ) -> Dict[str, Any]:
        """
        Mints a SUTRA identity NFT on Base Sepolia.
        Guarantees:
        1. If credentials and contract are configured in 'onchain' mode, broadcasts on Base Sepolia.
        2. Never reports a simulated token as minted.
        3. Reports success only after the Base Sepolia transaction confirms.
        4. The supplied token URI must point to immutable, content-addressed metadata.
        """
        import hashlib
        w3 = self._get_web3()
        sutra_id_hash = hashlib.sha256(sutra_id.encode("utf-8")).digest()

        is_live_ready = self.nft_mint_ready() and recipient_address is not None

        if not is_live_ready:
            return {
                "success": False,
                "mode": "unavailable",
                "chain_id": self.chain_id,
                "contract_address": self.nft_contract_address or "0x0000000000000000000000000000000000000000",
                "tx_hash": None,
                "token_id": None,
                "minted_at": None,
                "wallet_address": recipient_address,
                "explorer_url": None,
                "message": "Live Base Sepolia NFT mint is not configured.",
            }

        try:
            from eth_account import Account
            now_utc = datetime.now(timezone.utc)
            account = Account.from_key(self.private_key)
            contract = self._get_nft_contract()
            if not contract:
                raise RuntimeError("SutraStudentIdentityNFT artifact not initialized.")

            checksum_recipient = w3.to_checksum_address(recipient_address)
            nonce = w3.eth.get_transaction_count(account.address)

            try:
                estimated_gas = contract.functions.mintIdentity(
                    checksum_recipient,
                    sutra_id_hash,
                    token_uri,
                ).estimate_gas({"from": account.address})
                gas_limit = int(estimated_gas * 1.25)
            except Exception:
                gas_limit = 180000

            gas_price = int(w3.eth.gas_price * 1.15) if w3.eth.gas_price else 10000000

            tx = contract.functions.mintIdentity(
                checksum_recipient,
                sutra_id_hash,
                token_uri,
            ).build_transaction({
                "from": account.address,
                "nonce": nonce,
                "chainId": self.chain_id,
                "gas": gas_limit,
                "gasPrice": gas_price,
            })

            signed = w3.eth.account.sign_transaction(tx, private_key=self.private_key)
            tx_hash_bytes = w3.eth.send_raw_transaction(signed.raw_transaction)
            tx_hash_hex = tx_hash_bytes.hex()
            if not tx_hash_hex.startswith("0x"):
                tx_hash_hex = f"0x{tx_hash_hex}"

            logger.info(f"Broadcasted NFT mint tx on Base Sepolia: {tx_hash_hex}")
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=90)
            if receipt.status != 1:
                raise RuntimeError(f"NFT mint transaction reverted on Base Sepolia. Status: {receipt.status}")

            token_id = int(contract.functions.tokenIdBySutraIdHash(sutra_id_hash).call())
            if token_id <= 0:
                raise RuntimeError("Confirmed mint has no matching SUTRA identity token on the contract.")
            actual_owner = w3.to_checksum_address(contract.functions.ownerOf(token_id).call())
            if actual_owner != w3.to_checksum_address(recipient_address):
                raise RuntimeError("Confirmed identity NFT owner does not match the requested wallet.")
            actual_uri = contract.functions.tokenURI(token_id).call()
            if actual_uri != token_uri:
                raise RuntimeError("Confirmed identity NFT metadata URI does not match the pinned metadata.")
            block = w3.eth.get_block(receipt.blockNumber)
            minted_at = datetime.fromtimestamp(int(block.timestamp), tz=timezone.utc)

            explorer_url = f"https://sepolia.basescan.org/tx/{tx_hash_hex}"

            return {
                "success": True,
                "mode": "onchain",
                "chain_id": self.chain_id,
                "contract_address": self.nft_contract_address,
                "tx_hash": tx_hash_hex,
                "token_id": token_id,
                "block_number": receipt.blockNumber,
                "minted_at": minted_at,
                "wallet_address": checksum_recipient,
                "explorer_url": explorer_url,
                "message": f"Successfully minted on Base Sepolia at block {receipt.blockNumber}.",
            }
        except Exception as exc:
            logger.error(f"On-chain NFT minting failed on Base Sepolia: {exc}", exc_info=True)
            return {
                "success": False,
                "mode": "failed",
                "chain_id": self.chain_id,
                "error": str(exc),
                "message": f"Base Sepolia mint attempt failed: {str(exc)}",
            }


base_sepolia_service = BaseSepoliaService()
