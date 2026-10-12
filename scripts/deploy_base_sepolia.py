#!/usr/bin/env python3
"""
SUTRA — Base Sepolia Smart Contract Deployment Tool.
Deploys SutraDocumentRegistry.sol to Base Sepolia (Chain ID 84532).

Usage:
  # Simulated dry-run (no funds required):
  .venv/bin/python3 scripts/deploy_base_sepolia.py --simulate

  # Real deployment to Base Sepolia:
  BASE_SEPOLIA_PRIVATE_KEY="0x..." .venv/bin/python3 scripts/deploy_base_sepolia.py
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
ARTIFACT_PATH = REPO_ROOT / "contracts" / "SutraDocumentRegistry.json"


def deploy_contract(rpc_url: str, private_key: str | None, simulate: bool = False):
    print("=" * 80)
    print("SUTRA — BASE SEPOLIA SMART CONTRACT DEPLOYMENT")
    print(f"Target Network: Base Sepolia (Chain ID: {BASE_SEPOLIA_CHAIN_ID})")
    print(f"RPC Endpoint:   {rpc_url}")
    print("=" * 80)

    if not ARTIFACT_PATH.exists():
        print(f"[-] Error: Artifact not found at {ARTIFACT_PATH}")
        sys.exit(1)

    with open(ARTIFACT_PATH, "r", encoding="utf-8") as f:
        artifact = json.load(f)

    abi = artifact["abi"]
    bytecode = artifact["bytecode"]

    if simulate or not private_key:
        print("\n[*] RUNNING IN SIMULATION MODE (No private key or --simulate specified)")
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

        simulated_address = "0x" + "7" * 40
        print(f"\n[+] SIMULATED CONTRACT ADDRESS: {simulated_address}")
        print("[+] Base Sepolia Explorer URL: https://sepolia.basescan.org/address/" + simulated_address)
        print("[!] Note: To execute real on-chain transactions, set BASE_SEPOLIA_PRIVATE_KEY in .env.")
        return simulated_address

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
    construct_txn = contract.constructor().build_transaction({
        "from": deployer_address,
        "nonce": nonce,
        "chainId": BASE_SEPOLIA_CHAIN_ID,
        "gasPrice": w3.eth.gas_price,
    })

    print("[*] Signing transaction with deployer key...")
    signed_txn = w3.eth.account.sign_transaction(construct_txn, private_key=private_key)

    print("[*] Broadcasting deployment transaction to Base Sepolia...")
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    tx_hash_hex = tx_hash.hex()
    print(f"[+] Transaction Hash: {tx_hash_hex}")
    print(f"[+] Base Sepolia Explorer: https://sepolia.basescan.org/tx/{tx_hash_hex}")

    print("[*] Awaiting block confirmation...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    if receipt.status != 1:
        print("[-] Deployment transaction reverted!")
        sys.exit(1)

    contract_address = receipt.contractAddress
    print("\n" + "=" * 80)
    print(f"[SUCCESS] SutraDocumentRegistry deployed successfully!")
    print(f"Contract Address: {contract_address}")
    print(f"Explorer URL:     https://sepolia.basescan.org/address/{contract_address}")
    print(f"Gas Used:         {receipt.gasUsed}")
    print("=" * 80)

    print("\nTo configure SUTRA backend, add the following to your .env:")
    print(f"BASE_SEPOLIA_CONTRACT_ADDRESS={contract_address}")
    print("ANCHOR_MODE=onchain")

    return contract_address


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deploy SutraDocumentRegistry to Base Sepolia")
    parser.add_argument("--simulate", action="store_true", help="Run deployment simulation without broadcasting")
    parser.add_argument("--rpc", default=DEFAULT_RPC_URL, help="Custom Base Sepolia RPC URL")
    parser.add_argument("--private-key", default=os.getenv("BASE_SEPOLIA_PRIVATE_KEY"), help="Deployer private key")
    args = parser.parse_args()

    deploy_contract(rpc_url=args.rpc, private_key=args.private_key, simulate=args.simulate)
