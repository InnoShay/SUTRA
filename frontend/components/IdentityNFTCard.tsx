"use client";

import React, { useState } from "react";
import { ArrowUpRight, Check, Eye, Loader2, Maximize2, Sparkles, Wallet, X } from "lucide-react";
import { useSkillHub } from "@/lib/store";
import { getApiBaseUrl } from "@/lib/api";

type EthereumWindow = Window & {
  ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
};

function resolveArtworkUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }
  const apiBase = getApiBaseUrl();
  const root = apiBase.replace(/\/api\/v1\/?$/, "");

  if (rawUrl.startsWith("/api/v1")) {
    return `${root}${rawUrl}`;
  }
  if (rawUrl.startsWith("/")) {
    return `${apiBase}${rawUrl}`;
  }
  return `${apiBase}/${rawUrl}`;
}

export function IdentityNFTCard() {
  const { sutraIdentity, mintIdentityNFT } = useSkillHub();
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [justMinted, setJustMinted] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  const artworkSrc = resolveArtworkUrl(sutraIdentity?.artwork_url);
  const artTitle = sutraIdentity?.art_title || "Generative Identity Painting";
  const paletteName = sutraIdentity?.artwork_traits?.Palette;
  const compositionName = sutraIdentity?.artwork_traits?.Composition || "Vector Flow Field";

  return (
    <>
      <div
        aria-label="SUTRA Identity NFT"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-3.5 transition-all hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Interactive Artwork Thumbnail */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            title="Inspect artwork"
            className="group relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
          >
            {artworkSrc && !imageError ? (
              <>
                <img
                  src={artworkSrc}
                  alt={artTitle}
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                <Sparkles className="h-5 w-5 text-white/90" />
              </div>
            )}
          </button>

          {/* Title & Pseudonym Information */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate" title={artTitle}>
                {artTitle}
              </h4>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                  isOnChain
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : "bg-neutral-200/70 text-neutral-700"
                }`}
              >
                {isOnChain ? <Check className="h-2.5 w-2.5" /> : null}
                {isOnChain ? "Minted on Base" : "Soulbound ID"}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[11px] text-neutral-500 truncate">
                {sutraIdentity?.sutra_id || "Generating SUTRA ID..."}
              </span>
              {paletteName && (
                <span className="hidden sm:inline-block text-[10px] text-neutral-400 font-medium">
                  • {paletteName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {isOnChain && sutraIdentity?.explorer_url ? (
            <a
              href={sutraIdentity.explorer_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950 px-2.5 py-1.5 rounded-lg hover:bg-neutral-200/50 transition-colors"
            >
              BaseScan <ArrowUpRight className="h-3 w-3" />
            </a>
          ) : canMintOnChain ? (
            <button
              type="button"
              onClick={handleMint}
              disabled={minting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              {minting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />}
              {minting ? "Minting…" : "Mint to Base"}
            </button>
          ) : null}
        </div>
      </div>

      {mintError && (
        <p role="alert" className="text-[11px] text-rose-600 mt-1 px-1">
          {mintError}
        </p>
      )}

      {/* Fullscreen Art & Trait Lightbox Modal */}
      {isPreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generative Identity Artwork Preview"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/50">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold block">
                  SUTRA Generative Identity
                </span>
                <h3 className="text-sm font-bold text-neutral-900 truncate" title={artTitle}>
                  {artTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Resolution Artwork Display */}
            <div className="p-4 bg-neutral-950 flex items-center justify-center">
              <div className="relative w-full aspect-square max-w-[340px] rounded-xl overflow-hidden shadow-lg border border-neutral-800 bg-neutral-900">
                {artworkSrc && !imageError ? (
                  <img
                    src={artworkSrc}
                    alt={artTitle}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white">
                    <Sparkles className="w-8 h-8 animate-pulse text-amber-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Identity Specs & Traits */}
            <div className="p-4 space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[10px] text-neutral-400 font-medium block">Public ID</span>
                  <span className="font-mono font-bold text-neutral-800 text-[11px] truncate block">
                    {sutraIdentity?.sutra_id || "Unassigned"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[10px] text-neutral-400 font-medium block">Palette</span>
                  <span className="font-bold text-neutral-800 text-[11px] truncate block">
                    {paletteName || "Tidal Glass"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[10px] text-neutral-400 font-medium block">Algorithm</span>
                  <span className="font-bold text-neutral-800 text-[11px] truncate block">
                    {compositionName}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-[10px] text-neutral-400 font-medium block">On-Chain State</span>
                  <span className="font-bold text-neutral-800 text-[11px] truncate block">
                    {isOnChain ? "Base Sepolia" : "Soulbound Credential"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Rendered deterministically from your private identity seed. This artwork serves as your non-transferable visual identity across campus with zero PII on-chain.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
