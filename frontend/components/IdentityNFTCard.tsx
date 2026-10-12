"use client";

import React, { useState } from "react";
import { ArrowUpRight, Check, Loader2, LockKeyhole, Sparkles, Wallet } from "lucide-react";
import { useSkillHub } from "@/lib/store";
import { getApiBaseUrl } from "@/lib/api";

type EthereumWindow = Window & {
  ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
};

export function IdentityNFTCard() {
  const { sutraIdentity, mintIdentityNFT } = useSkillHub();
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [justMinted, setJustMinted] = useState(false);

  const isOnChain = sutraIdentity?.mint_mode === "onchain" && Boolean(sutraIdentity.collectible_tx_hash);
  const canMintOnChain = Boolean(sutraIdentity?.onchain_enabled) && !isOnChain;

  const handleMint = async () => {
    setMintError(null);
    setMinting(true);
    try {
      let walletAddress = sutraIdentity?.wallet_address || undefined;
      if (!walletAddress) {
        const ethereum = (window as EthereumWindow).ethereum;
        if (!ethereum) throw new Error("Install a browser wallet such as MetaMask to mint on Base Sepolia.");
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        walletAddress = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : undefined;
      }
      if (!walletAddress) throw new Error("Connect a wallet address to receive your identity NFT.");

      const minted = await mintIdentityNFT(walletAddress);
      if (minted.collectible_status !== "minted" || minted.mint_mode !== "onchain" || !minted.collectible_tx_hash) {
        throw new Error(minted.collectible_error || "Base Sepolia did not confirm the NFT transaction.");
      }
      setJustMinted(true);
      window.setTimeout(() => setJustMinted(false), 2400);
    } catch (err) {
      setMintError(err instanceof Error ? err.message : "The identity NFT could not be minted.");
    } finally {
      setMinting(false);
    }
  };

  const statusLabel = isOnChain
    ? "On-chain identity"
    : sutraIdentity?.collectible_status === "pending"
      ? "Mint pending"
      : sutraIdentity?.collectible_status === "failed"
        ? "Mint needs retry"
        : "Identity ready";
  const artworkSrc = sutraIdentity?.artwork_url
    ? `${getApiBaseUrl()}${sutraIdentity.artwork_url}`
    : null;

  return (
    <div
      aria-label="SUTRA Identity NFT"
      className="flex items-center gap-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 transition-all hover:bg-neutral-50"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-2xs">
        {artworkSrc ? (
          <img
            src={artworkSrc}
            alt="Cryptographic identity artwork"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            <Sparkles className="h-6 w-6 text-white/90" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-900">Identity NFT</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isOnChain
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-neutral-200/60 text-neutral-600"
            }`}
          >
            {isOnChain ? <Check className="h-2.5 w-2.5" /> : null}
            {isOnChain ? "Minted" : "Soulbound"}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-neutral-500 truncate">
          {sutraIdentity?.sutra_id || "Generating SUTRA ID..."}
        </p>
      </div>

      <div className="shrink-0">
        {isOnChain && sutraIdentity?.explorer_url ? (
          <a
            href={sutraIdentity.explorer_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900"
          >
            BaseScan <ArrowUpRight className="h-3 w-3" />
          </a>
        ) : canMintOnChain ? (
          <button
            type="button"
            onClick={handleMint}
            disabled={minting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {minting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />}
            {minting ? "Minting…" : "Mint NFT"}
          </button>
        ) : null}
      </div>

      {mintError && (
        <p role="alert" className="text-[11px] text-rose-600 mt-1">
          {mintError}
        </p>
      )}
    </div>
  );
}
