#!/usr/bin/env python3
"""Deploy SutraDocumentRegistry to Base Sepolia with a funded server key.

Never use --private-key or put a key in shell history. Set BASE_SEPOLIA_PRIVATE_KEY
in the backend environment (or use MetaMask and the deployment flow in the project docs).
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv, set_key
from web3 import Web3
from eth_account import Account

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / ".env")
CHAIN_ID = int(os.getenv("BASE_SEPOLIA_CHAIN_ID", "84532"))
RPC_URL = os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org")
PRIVATE_KEY = os.getenv("BASE_SEPOLIA_PRIVATE_KEY")
ARTIFACT_PATH = REPO_ROOT / "contracts" / "SutraDocumentRegistry.json"
README_PATH = REPO_ROOT / "README.md"
START_MARKER = "<!-- BASE_SEPOLIA_REGISTRY_START -->"
END_MARKER = "<!-- BASE_SEPOLIA_REGISTRY_END -->"


def update_readme(address: str, tx_hash: str, block_number: int, deployer: str, gas_used: int) -> None:
    text = README_PATH.read_text(encoding="utf-8")
    start = text.find(START_MARKER)
    end = text.find(END_MARKER)
    if start < 0 or end < start:
        raise RuntimeError("README is missing the managed Base Sepolia registry section markers.")
    deployed_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    section = f"""{START_MARKER}

**Status: Deployed and verified on Base Sepolia (Chain ID 84532).**

- Contract: [`{address}`](https://sepolia.basescan.org/address/{address})
- Deployment transaction: [`{tx_hash}`](https://sepolia.basescan.org/tx/{tx_hash})
- Deployment block: `{block_number}`
- Deployer / registry wallet: `{deployer}`
- Gas used: `{gas_used}`
- Verified at: `{deployed_at}`
- Contract source: [`contracts/SutraDocumentRegistry.sol`](contracts/SutraDocumentRegistry.sol)

{END_MARKER}"""
    README_PATH.write_text(text[:start] + section + text[end + len(END_MARKER):], encoding="utf-8")


def main() -> int:
    if CHAIN_ID != 84532:
        print(f"Refusing deployment: configured chain id is {CHAIN_ID}, expected Base Sepolia 84532.", file=sys.stderr)
        return 2
    if not PRIVATE_KEY:
        print("BASE_SEPOLIA_PRIVATE_KEY is not configured. No deployment was sent.", file=sys.stderr)
        return 2
    if not ARTIFACT_PATH.exists():
        print("Compiled contract artifact is missing. Run npm run compile in contracts/ first.", file=sys.stderr)
        return 2

    artifact = json.loads(ARTIFACT_PATH.read_text(encoding="utf-8"))
    if not artifact.get("abi") or not artifact.get("bytecode", "").removeprefix("0x"):
        print("Compiled contract artifact has no ABI or bytecode.", file=sys.stderr)
        return 2

    w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 20}))
    if not w3.is_connected() or w3.eth.chain_id != CHAIN_ID:
        print("Could not connect to Base Sepolia RPC or RPC returned the wrong chain id.", file=sys.stderr)
        return 2

    account = Account.from_key(PRIVATE_KEY)
    balance = w3.eth.get_balance(account.address)
    if balance <= 0:
        print("Deployment wallet has no Base Sepolia ETH for gas.", file=sys.stderr)
        return 2

    factory = w3.eth.contract(abi=artifact["abi"], bytecode=artifact["bytecode"])
    constructor = factory.constructor()
    gas = w3.eth.estimate_gas({"from": account.address, "data": constructor.data_in_transaction})
    gas_price = int(w3.eth.gas_price * 1.15)
    estimated_cost = gas * gas_price
    if balance <= estimated_cost:
        print("Deployment wallet balance is below the estimated deployment gas cost.", file=sys.stderr)
        return 2

    tx = constructor.build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": CHAIN_ID,
        "gas": int(gas * 1.2),
        "gasPrice": gas_price,
    })
    signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    tx_hash_bytes = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=180)
    if receipt.status != 1 or not receipt.contractAddress:
        print("Deployment transaction failed; README and settings were not changed.", file=sys.stderr)
        return 1
    if not w3.eth.get_code(receipt.contractAddress):
        print("Deployment receipt returned no contract code; refusing to record it.", file=sys.stderr)
        return 1

    address = w3.to_checksum_address(receipt.contractAddress)
    tx_hash = tx_hash_bytes.hex()
    if not tx_hash.startswith("0x"):
        tx_hash = f"0x{tx_hash}"
    update_readme(address, tx_hash, receipt.blockNumber, account.address, receipt.gasUsed)
    set_key(str(REPO_ROOT / ".env"), "BASE_SEPOLIA_CONTRACT_ADDRESS", address)

    print("SutraDocumentRegistry deployment confirmed.")
    print(f"Contract: {address}")
    print(f"Transaction: https://sepolia.basescan.org/tx/{tx_hash}")
    print(f"Address: https://sepolia.basescan.org/address/{address}")
    print(f"Block: {receipt.blockNumber}; gas used: {receipt.gasUsed}")
    print("README.md and .env BASE_SEPOLIA_CONTRACT_ADDRESS updated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
