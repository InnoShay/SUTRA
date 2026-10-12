#!/usr/bin/env python3
"""
SUTRA — Base Sepolia Student Identity NFT Contract Deployment Tool.
Deploys SutraStudentIdentityNFT.sol to Base Sepolia (Chain ID 84532).

Usage:
  # Compile/ABI-only validation (does not deploy or invent an address):
  .venv/bin/python3 scripts/deploy_identity_nft.py --simulate

  # Real deployment to Base Sepolia:
  BASE_SEPOLIA_PRIVATE_KEY="0x..." .venv/bin/python3 scripts/deploy_identity_nft.py
"""

import argparse
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / ".env")

try:
    from web3 import Web3
    from eth_account import Account
except ImportError:
    print("Error: web3 or eth_account not installed. Run: pip install web3")
    sys.exit(1)

BASE_SEPOLIA_CHAIN_ID = int(os.getenv("BASE_SEPOLIA_CHAIN_ID", "84532"))
DEFAULT_RPC_URL = os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org")
ARTIFACT_PATH = REPO_ROOT / "contracts" / "SutraStudentIdentityNFT.json"


def deploy_contract(rpc_url: str, private_key: str | None, simulate: bool = False):
    print("=" * 80)
    print("SUTRA — BASE SEPOLIA STUDENT IDENTITY NFT DEPLOYMENT")
    print(f"Target Network: Base Sepolia (Chain ID: {BASE_SEPOLIA_CHAIN_ID})")
    print(f"RPC Endpoint:   {rpc_url}")
    print("=" * 80)

    if not ARTIFACT_PATH.exists():
        print(f"[-] Error: Artifact not found at {ARTIFACT_PATH}")
        print("[-] Run: (cd contracts && node compile.js) first.")
        sys.exit(1)

    with open(ARTIFACT_PATH, "r", encoding="utf-8") as f:
        artifact = json.load(f)

    abi = artifact["abi"]
    bytecode = artifact["bytecode"]

    if simulate:
        print("\n[*] Compile-only validation. No transaction will be broadcast.")
        print("[*] Validating contract ABI and constructor signature...")
        w3 = Web3()
        contract = w3.eth.contract(abi=abi, bytecode=bytecode)
        print(f"[+] ABI contains {len(abi)} functions/events/errors.")
        print(f"[+] Contract methods verified:")
        for item in abi:
            if item.get("type") == "function":
                print(f"    - {item['name']}() ({item.get('stateMutability')})")
            elif item.get("type") == "event":
                print(f"    - event {item['name']}")

        print("[+] Contract artifact is valid. No contract address was created.")
        return None

    if not private_key:
        print("[-] BASE_SEPOLIA_PRIVATE_KEY is not configured. No deployment was sent.")
        sys.exit(2)

    # Real Deployment
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print(f"[-] Error: Could not connect to RPC endpoint {rpc_url}")
        sys.exit(1)

    account = Account.from_key(private_key)
    deployer_address = account.address
    balance_wei = w3.eth.get_balance(deployer_address)
    balance_eth = w3.from_wei(balance_wei, "ether")

    print(f"[+] Deployer Address: {deployer_address}")
    print(f"[+] Account Balance:  {balance_eth:.6f} ETH")

    if balance_wei == 0:
        print("[-] Error: Deployer account has 0 ETH on Base Sepolia.")
        print("[-] Obtain test ETH from https://faucets.chain.link/base-sepolia or https://www.alchemy.com/faucets/base-sepolia")
        sys.exit(1)

    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(deployer_address)

    print("\n[*] Building contract creation transaction...")
    try:
        estimated_gas = w3.eth.estimate_gas({"from": deployer_address, "data": bytecode})
        gas_limit = int(estimated_gas * 1.25)
    except Exception:
        gas_limit = 1200000

    gas_price = int(w3.eth.gas_price * 1.2) if w3.eth.gas_price else 10000000

    tx_data = {
        "chainId": BASE_SEPOLIA_CHAIN_ID,
        "from": deployer_address,
        "nonce": nonce,
        "gas": gas_limit,
        "gasPrice": gas_price,
        "data": bytecode,
    }

    signed_tx = w3.eth.account.sign_transaction(tx_data, private_key=private_key)
    print(f"[*] Broadcasting transaction to Base Sepolia (tx hash: {signed_tx.hash.hex()})...")

    raw_tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print("[*] Waiting for transaction receipt...")
    receipt = w3.eth.wait_for_transaction_receipt(raw_tx_hash, timeout=120)

    contract_address = receipt.contractAddress
    print("\n" + "=" * 80)
    print("DEPLOYMENT SUCCESSFUL")
    print(f"Contract Address:   {contract_address}")
    print(f"Transaction Hash:   {receipt.transactionHash.hex()}")
    print(f"Block Number:       {receipt.blockNumber}")
    print(f"Gas Used:           {receipt.gasUsed}")
    print(f"Explorer URL:       https://sepolia.basescan.org/address/{contract_address}")
    print("=" * 80)

    print("\nAction Required:")
    print(f"1. Add the following to your .env file:")
    print(f"   BASE_SEPOLIA_NFT_CONTRACT_ADDRESS={contract_address}")
    print("2. Restart the FastAPI service to activate live on-chain identity minting.")
    return contract_address


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deploy SutraStudentIdentityNFT to Base Sepolia")
    parser.add_argument("--simulate", action="store_true", help="Run in simulation mode without sending transaction")
    parser.add_argument("--rpc", default=DEFAULT_RPC_URL, help=f"RPC URL (default: {DEFAULT_RPC_URL})")
    args = parser.parse_args()

    priv_key = os.getenv("BASE_SEPOLIA_PRIVATE_KEY")
    deploy_contract(rpc_url=args.rpc, private_key=priv_key, simulate=args.simulate)
