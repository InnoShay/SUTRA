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
    <section
      aria-label="SUTRA identity NFT"
      className={`relative isolate overflow-hidden rounded-[26px] border border-[#292c41] bg-[#111321] p-5 text-white shadow-[0_20px_60px_-34px_rgba(18,22,50,0.8)] sm:p-6 ${justMinted ? "identity-nft-celebrate" : ""}`}
    >
      <div className="pointer-events-none absolute -right-12 -top-16 -z-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/70">SUTRA • BASE SEPOLIA</p>
          <h3 className="mt-1.5 text-base font-bold tracking-tight">Identity</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
          isOnChain ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/65"
        }`}>
          {isOnChain ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-4 sm:gap-5">
        <div className="identity-nft-art relative grid h-[92px] w-[92px] shrink-0 place-items-center sm:h-[108px] sm:w-[108px]">
          <span className="identity-nft-orbit absolute inset-0 rounded-full border border-cyan-200/30" />
          <span className="identity-nft-orbit identity-nft-orbit-delayed absolute inset-[8px] rounded-full border border-violet-200/30" />
          {artworkSrc ? (
            <img
              src={artworkSrc}
              alt="Unique SUTRA abstract identity artwork"
              className="relative z-10 h-[76px] w-[76px] rounded-[20px] border border-white/20 object-cover shadow-[0_0_28px_rgba(129,140,248,.3)] sm:h-[88px] sm:w-[88px]"
            />
          ) : (
            <div className="relative z-10 grid h-[76px] w-[76px] place-items-center rounded-[20px] border border-white/20 bg-gradient-to-br from-cyan-300 via-violet-400 to-amber-200 shadow-[0_0_28px_rgba(129,140,248,.3)] sm:h-[88px] sm:w-[88px]">
              <Sparkles className="h-7 w-7 text-white drop-shadow" />
            </div>
          )}
          <span className="absolute right-0 top-1 z-20 h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_12px_3px_rgba(103,232,249,.65)]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="mt-1 font-mono text-[11px] tracking-wide text-white/45">
            {sutraIdentity?.sutra_id || "SUTRA ID pending"}
          </p>
          {isOnChain && <p className="mt-2 text-[10px] text-white/55">Token #{sutraIdentity?.collectible_token_id} · Base Sepolia</p>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="flex min-w-0 items-center gap-2 text-[10px] text-white/45">
          <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
          <span>{isOnChain ? "Confirmed on Base Sepolia" : "Soulbound identity"}</span>
        </div>
        {isOnChain && sutraIdentity?.explorer_url ? (
          <a href={sutraIdentity.explorer_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-200 hover:text-white">
            View transaction <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : canMintOnChain ? (
          <button type="button" onClick={handleMint} disabled={minting} className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3.5 text-[11px] font-bold text-[#17192a] transition hover:bg-cyan-100 disabled:opacity-60">
            {minting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
            {minting ? "Minting your identity…" : "Connect wallet & mint"}
          </button>
        ) : null}
      </div>

      {!isOnChain && (
        <p className="mt-3 text-[10px] leading-relaxed text-amber-100/65">
          {sutraIdentity?.collectible_error || (canMintOnChain
            ? "Connect wallet to mint."
            : "Minting needs the deployed contract and IPFS setup.")}
        </p>
      )}
      {mintError && <p role="alert" className="mt-3 text-[11px] text-rose-200">{mintError}</p>}

      <style jsx>{`
        .identity-nft-orbit { animation: identity-orbit 8s linear infinite; }
        .identity-nft-orbit-delayed { animation-delay: -4s; animation-direction: reverse; }
        .identity-nft-celebrate .identity-nft-art { animation: identity-pop .7s cubic-bezier(.2,.8,.2,1) both; }
        .identity-nft-celebrate { animation: identity-glow 2.2s ease-out both; }
        @keyframes identity-orbit { to { transform: rotate(360deg); } }
        @keyframes identity-pop { 0% { transform: scale(.82) rotate(-8deg); } 55% { transform: scale(1.1) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }
        @keyframes identity-glow { 0% { box-shadow: 0 0 0 0 rgba(129,140,248,.65); } 100% { box-shadow: 0 20px 60px -34px rgba(18,22,50,.8); } }
        @media (prefers-reduced-motion: reduce) { .identity-nft-orbit, .identity-nft-celebrate, .identity-nft-celebrate .identity-nft-art { animation: none; } }
      `}</style>
    </section>
  );
}
