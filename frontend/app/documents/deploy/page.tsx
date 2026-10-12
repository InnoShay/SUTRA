"use client";

import { useState } from "react";
import Link from "next/link";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
};
type RegistryArtifact = { contractName: string; bytecode: string };

const BASE_SEPOLIA = "0x14a34";

export default function DeployDocumentRegistryPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      if (!ethereum) throw new Error("Open this page in Brave with MetaMask enabled.");
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
            params: [{
              chainId: BASE_SEPOLIA,
              chainName: "Base Sepolia",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            }],
          });
        }
        chainId = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
      }
      if (chainId !== BASE_SEPOLIA) throw new Error("Switch MetaMask to Base Sepolia (Chain ID 84532).");

      const response = await fetch("/contracts/SutraDocumentRegistry.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the compiled registry contract artifact.");
      const artifact = (await response.json()) as RegistryArtifact;
      if (!artifact.bytecode || !/^([0-9a-f]{2})+$/i.test(artifact.bytecode)) {
        throw new Error("The registry contract bytecode is missing or invalid.");
      }

      const data = `0x${artifact.bytecode}`;
      const estimateHex = await ethereum.request({ method: "eth_estimateGas", params: [{ from: deployer, data }] });
      const estimate = BigInt(estimateHex);
      const gas = `0x${(estimate + estimate / BigInt(5)).toString(16)}`;
      const txHash = await ethereum.request({ method: "eth_sendTransaction", params: [{ from: deployer, data, gas }] });
      if (typeof txHash !== "string" || !txHash.startsWith("0x")) throw new Error("MetaMask did not return a transaction hash.");

      let receipt: any = null;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        receipt = await ethereum.request({ method: "eth_getTransactionReceipt", params: [txHash] });
        if (receipt) break;
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }
      if (!receipt) throw new Error(`Deployment is still pending. Transaction: ${txHash}`);
      if (String(receipt.status).toLowerCase() !== "0x1" || typeof receipt.contractAddress !== "string") {
        throw new Error(`The deployment did not succeed. Transaction: ${txHash}`);
      }
      setDeployment({
        address: receipt.contractAddress,
        txHash,
        blockNumber: BigInt(receipt.blockNumber).toString(),
        deployer,
      });
    } catch (cause: any) {
      setError(cause?.message || "The registry deployment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-12 text-neutral-900">
      <section className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/documents" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">← Document Integrity</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Base Sepolia · Chain 84532</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Deploy the document registry</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          This deploys SUTRA’s compiled document fingerprint registry from your connected wallet. The contract stores only opaque reference hashes and SHA-256 fingerprints; uploaded files stay in SUTRA storage.
        </p>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          MetaMask will show the deployment and estimated Base Sepolia gas cost. Review it there and approve only if you want to deploy. This action cannot be reversed; the contract is permanent on this test network.
        </div>
        {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {deployment ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm">
            <h2 className="font-semibold text-emerald-950">Deployment confirmed</h2>
            <p><span className="font-medium">Contract:</span> <code className="break-all">{deployment.address}</code></p>
            <p><span className="font-medium">Transaction:</span> <a className="break-all underline" href={`https://sepolia.basescan.org/tx/${deployment.txHash}`} target="_blank" rel="noreferrer">{deployment.txHash}</a></p>
            <p><span className="font-medium">Block:</span> {deployment.blockNumber}</p>
            <p><span className="font-medium">Deployer:</span> <code className="break-all">{deployment.deployer}</code></p>
            <p className="pt-1 text-emerald-900">Keep this page open. SUTRA still needs this public contract address in its backend configuration before uploads can be anchored.</p>
          </div>
        ) : (
          <button onClick={deploy} disabled={busy} className="mt-6 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60">
            {busy ? "Waiting for wallet and Base Sepolia…" : "Connect wallet and deploy registry"}
          </button>
        )}
        {busy && <p role="status" className="mt-3 text-xs text-neutral-500">Approve the transaction in MetaMask. This page will wait for the deployment receipt.</p>}
      </section>
    </main>
  );
}
