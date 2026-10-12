"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Wallet,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  LogOut,
  ChevronDown,
} from "lucide-react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const BASE_SEPOLIA_CHAIN_ID_HEX = "0x14a34"; // 84532 in hex
const BASE_SEPOLIA_CHAIN_ID_DEC = 84532;

const BASE_SEPOLIA_NETWORK_PARAMS = {
  chainId: BASE_SEPOLIA_CHAIN_ID_HEX,
  chainName: "Base Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia-explorer.base.org"],
};

export function WalletConnectButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showNoMetaMaskModal, setShowNoMetaMaskModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isBaseSepolia =
    chainId?.toLowerCase() === BASE_SEPOLIA_CHAIN_ID_HEX.toLowerCase() ||
    parseInt(chainId || "0", 16) === BASE_SEPOLIA_CHAIN_ID_DEC;

  // Handle outside click to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if wallet was previously connected in this session (without prompting)
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    let isMounted = true;

    async function checkExistingAccounts() {
      try {
        const accounts: string[] = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (isMounted && accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          const currentChain: string = await window.ethereum.request({
            method: "eth_chainId",
          });
          if (isMounted) setChainId(currentChain);
        }
      } catch (err) {
        console.warn("[MetaMask] eth_accounts check error:", err);
      }
    }

    checkExistingAccounts();

    // Event listeners
    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setAddress(null);
        setIsMenuOpen(false);
      } else {
        setAddress(accounts[0]);
      }
    };

    const handleChainChanged = (newChainId: string) => {
      setChainId(newChainId);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      isMounted = false;
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  // Request network switch to Base Sepolia
  const switchToBaseSepolia = useCallback(async () => {
    if (!window.ethereum) return;
    setErrorMsg(null);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }],
      });
      const currentChain: string = await window.ethereum.request({
        method: "eth_chainId",
      });
      setChainId(currentChain);
    } catch (switchError: any) {
      // Error code 4902 indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [BASE_SEPOLIA_NETWORK_PARAMS],
          });
          const currentChain: string = await window.ethereum.request({
            method: "eth_chainId",
          });
          setChainId(currentChain);
        } catch (addError: any) {
          if (addError.code === 4001) {
            setErrorMsg("Network addition was rejected in MetaMask.");
          } else {
            setErrorMsg(addError.message || "Failed to add Base Sepolia network.");
          }
        }
      } else if (switchError.code === 4001) {
        setErrorMsg("Network switch was rejected in MetaMask.");
      } else {
        setErrorMsg(switchError.message || "Failed to switch to Base Sepolia.");
      }
    }
  }, []);

  // Connect wallet on user click
  const handleConnect = async () => {
    setErrorMsg(null);
    if (typeof window === "undefined" || !window.ethereum) {
      setShowNoMetaMaskModal(true);
      return;
    }

    setIsConnecting(true);
    try {
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        const currentChain: string = await window.ethereum.request({
          method: "eth_chainId",
        });
        setChainId(currentChain);

        // Prompt switch to Base Sepolia if connected to another chain
        if (
          currentChain.toLowerCase() !== BASE_SEPOLIA_CHAIN_ID_HEX.toLowerCase() &&
          parseInt(currentChain, 16) !== BASE_SEPOLIA_CHAIN_ID_DEC
        ) {
          await switchToBaseSepolia();
        }
      }
    } catch (err: any) {
      if (err.code === 4001) {
        setErrorMsg("Connection request was rejected in MetaMask.");
      } else {
        setErrorMsg(err.message || "Failed to connect to MetaMask.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect / Reset session state in SUTRA
  const handleDisconnect = () => {
    setAddress(null);
    setIsMenuOpen(false);
    setErrorMsg(null);
  };

  // Copy address to clipboard
  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Shortened address helper
  const shortenedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* 1. DISCONNECTED STATE BUTTON */}
      {!address && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white shadow-2xs active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          title="Connect MetaMask Wallet"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>Connect Wallet</span>
            </>
          )}
        </button>
      )}

      {/* 2. CONNECTED STATE PILL & DROPDOWN */}
      {address && (
        <div>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              isBaseSepolia
                ? "bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800"
                : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900"
            }`}
            title="Connected Wallet Details"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBaseSepolia ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="font-mono">{shortenedAddress}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Connected Popover Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-neutral-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3 text-xs">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  MetaMask Connected
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isBaseSepolia
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {isBaseSepolia ? "Base Sepolia (84532)" : "Wrong Network"}
                </span>
              </div>

              {/* Address with Copy & Explorer Link */}
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Account Address
                </p>
                <p className="font-mono text-neutral-800 text-[11px] break-all select-all">
                  {address}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-neutral-400" />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`https://sepolia-explorer.base.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 ml-auto"
                  >
                    <span>Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Wrong Network Warning & Switch Button */}
              {!isBaseSepolia && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Switch to Base Sepolia</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-amber-800">
                    SUTRA anchors document integrity records on Base Sepolia testnet (Chain ID 84532).
                  </p>
                  <button
                    type="button"
                    onClick={switchToBaseSepolia}
                    className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-all cursor-pointer"
                  >
                    Switch Network to Base Sepolia
                  </button>
                </div>
              )}

              {/* Disconnect Action */}
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Disconnect Session</span>
                </button>
                <p className="text-[10px] text-neutral-400 leading-tight text-center">
                  Note: To completely revoke permissions, disconnect SUTRA inside MetaMask under Connected Sites.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error notification banner if any */}
      {errorMsg && (
        <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] shadow-lg z-50 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMsg}</p>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="mt-1 text-[10px] font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 3. METAMASK NOT DETECTED MODAL */}
      {showNoMetaMaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-700 w-fit">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">MetaMask Not Detected</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                No Ethereum wallet was detected in your browser window (<code className="font-mono text-neutral-700">window.ethereum</code> is undefined).
                Please install the MetaMask extension to interact with Base Sepolia directly from your browser.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNoMetaMaskModal(false)}
                className="flex-1 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Close
              </button>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold text-center flex items-center justify-center gap-1"
              >
                <span>Install MetaMask</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
