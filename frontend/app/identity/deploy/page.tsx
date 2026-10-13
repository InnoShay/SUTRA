"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, ShieldCheck, Sparkles } from "lucide-react";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
};

type NFTArtifact = {
  contractName: string;
  bytecode: string;
  abi: unknown[];
};

const BASE_SEPOLIA = "0x14a34";

export default function DeployIdentityNFTPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deployment, setDeployment] = useState<{
    address: string;
    txHash: string;
    blockNumber: string;
    deployer: string;
  } | null>(null);

  const deploy = async () => {
    setBusy(true);
    setError(null);
    setDeployment(null);
    try {
      const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
      if (!ethereum) throw new Error("Please open this page in a browser with MetaMask enabled.");
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const deployer = Array.isArray(accounts) ? accounts[0] : null;
      if (typeof deployer !== "string" || !deployer) throw new Error("Connect a MetaMask wallet to continue.");

      let chainId = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
      if (chainId !== BASE_SEPOLIA) {
        try {
          await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA }] });
        } catch (switchError: any) {
          if (switchError?.code !== 4902) throw switchError;
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BASE_SEPOLIA,
                chainName: "Base Sepolia",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia.basescan.org"],
              },
            ],
          });
        }
        chainId = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
      }
      if (chainId !== BASE_SEPOLIA) throw new Error("Switch MetaMask to Base Sepolia (Chain ID 84532).");

      const response = await fetch("/contracts/SutraStudentIdentityNFT.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the compiled SutraStudentIdentityNFT contract artifact.");
      const artifact = (await response.json()) as NFTArtifact;
      if (!artifact.bytecode || !/^([0-9a-f]{2})+$/i.test(artifact.bytecode)) {
        throw new Error("The contract bytecode is missing or invalid in artifact.");
      }

      const data = `0x${artifact.bytecode}`;
      const estimateHex = await ethereum.request({ method: "eth_estimateGas", params: [{ from: deployer, data }] });
      const estimate = BigInt(estimateHex);
      const gas = `0x${(estimate + estimate / BigInt(5)).toString(16)}`;
      const txHash = await ethereum.request({ method: "eth_sendTransaction", params: [{ from: deployer, data, gas }] });
      if (typeof txHash !== "string" || !txHash.startsWith("0x")) {
        throw new Error("MetaMask did not return a transaction hash.");
      }

      let receipt: any = null;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        receipt = await ethereum.request({ method: "eth_getTransactionReceipt", params: [txHash] });
        if (receipt) break;
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }
      if (!receipt) throw new Error(`Deployment is still pending on Base Sepolia. Transaction: ${txHash}`);
      if (String(receipt.status).toLowerCase() !== "0x1" || typeof receipt.contractAddress !== "string") {
        throw new Error(`The deployment failed or was reverted. Transaction: ${txHash}`);
      }

      setDeployment({
        address: receipt.contractAddress,
        txHash,
        blockNumber: BigInt(receipt.blockNumber).toString(),
        deployer,
      });
    } catch (cause: any) {
      setError(cause?.message || "The contract deployment failed.");
    } finally {
      setBusy(false);
    }
  };

  const copyEnvSnippet = () => {
    if (!deployment?.address) return;
    navigator.clipboard.writeText(`BASE_SEPOLIA_NFT_CONTRACT_ADDRESS=${deployment.address}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-12 text-neutral-900">
      <section className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>

        <div className="mt-8 flex items-center gap-2">
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-800 font-mono">
            Base Sepolia · Chain 84532
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 font-mono">
            ERC-5192 Soulbound
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight font-heading">
          Deploy Student Identity NFT
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-600">
          This deploys the official <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-800">SutraStudentIdentityNFT.sol</code> contract
          to Base Sepolia from your connected MetaMask wallet. Every student signup receives exactly one soulbound collectible holding their unique pseudonym hash and generative art title with zero PII on-chain.
        </p>

        <div className="mt-6 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 space-y-2 text-xs text-neutral-600">
          <div className="flex items-center gap-2 font-semibold text-neutral-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Core Contract Invariants</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-neutral-600 pl-1">
            <li><strong>Zero PII on-chain:</strong> Only cryptographic hashes (<code className="font-mono text-[11px]">bytes32 sutraIdHash</code>) and wallet addresses.</li>
            <li><strong>Soulbound / Non-transferable:</strong> Implements ERC-5192 to prevent secondary market exploitation.</li>
            <li><strong>Strict Duplicate Prevention:</strong> Exactly one token can ever be minted per student ID hash.</li>
            <li><strong>Generative Artwork Titles:</strong> Immutable token URI links to poetic generative art metadata.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={deploy}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
            {busy ? "Deploying to Base Sepolia…" : "Deploy Identity NFT Contract"}
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 leading-relaxed">
            {error}
          </div>
        )}

        {deployment && (
          <div className="mt-8 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Contract Successfully Deployed!</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-neutral-500 block font-medium">Contract Address:</span>
                <span className="font-mono font-bold text-neutral-900 break-all select-all text-xs sm:text-sm">
                  {deployment.address}
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block font-medium">Transaction Hash:</span>
                <a
                  href={`https://sepolia.basescan.org/tx/${deployment.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-violet-700 hover:underline break-all inline-flex items-center gap-1"
                >
                  {deployment.txHash} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              <div className="flex items-center gap-4 text-neutral-500 pt-1">
                <span>Block: <strong className="text-neutral-800">{deployment.blockNumber}</strong></span>
                <span>Deployer: <strong className="text-neutral-800 font-mono">{deployment.deployer.slice(0, 8)}…</strong></span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-200/60">
              <span className="text-xs font-semibold text-neutral-800 block mb-1.5">
                Save to environment configuration:
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 font-mono text-xs text-neutral-900 truncate">
                  BASE_SEPOLIA_NFT_CONTRACT_ADDRESS={deployment.address}
                </code>
                <button
                  type="button"
                  onClick={copyEnvSnippet}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
