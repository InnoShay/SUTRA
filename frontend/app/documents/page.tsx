"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DocumentDTO, DocumentAnchorResponse, CBDCVoucherRecord } from "@/lib/types";
import { useSkillHub } from "@/lib/store";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Download,
  Plus,
  RefreshCw,
  Coins,
  AlertTriangle,
  Info,
  Search,
  Filter,
} from "lucide-react";

type Eip1193Window = Window & {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  };
};

export default function DocumentsPage() {
  const { currentPersona } = useSkillHub();

  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [onchainReady, setOnchainReady] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Generate Document Modal State
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genTitle, setGenTitle] = useState("");
  const [genDocType, setGenDocType] = useState("intervention_plan");
  const [genStudentRef, setGenStudentRef] = useState("");
  const [genStudentName, setGenStudentName] = useState("");
  const [genContentText, setGenContentText] = useState("");
  const [genFinalizeImmediately, setGenFinalizeImmediately] = useState(false);
  const [isSubmittingGen, setIsSubmittingGen] = useState(false);

  // Upload any exact file bytes for integrity tracking.
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Verify Modal State
  const [verifyDocTarget, setVerifyDocTarget] = useState<DocumentDTO | null>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [candidateHash, setCandidateHash] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    isMatch: boolean;
    anchoredHash: string;
    candidateHash: string;
    status: string;
    verifiedAt: string;
    disclaimer: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action loading states
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // CBDC Incentive Voucher State
  const [vouchers, setVouchers] = useState<CBDCVoucherRecord[]>([]);
  const [cbdcStudentRef, setCbdcStudentRef] = useState("SYN-1007");
  const [cbdcAmount, setCbdcAmount] = useState<number>(500);
  const [cbdcPurpose, setCbdcPurpose] = useState("ACADEMIC_PERSISTENCE_REWARD");
  const [cbdcMilestone, setCbdcMilestone] = useState("MILESTONE-W5-CHECKIN");
  const [isIssuingCbdc, setIsIssuingCbdc] = useState(false);

  // Load documents
  const fetchDocuments = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (currentPersona?.token) {
        api.setToken(currentPersona.token);
      }
      const res = await api.documents.list();
      setDocuments(res.documents || []);
      setContractAddress(res.contract_address || null);
      setOnchainReady(Boolean(res.onchain_ready));
    } catch (err: any) {
      console.warn("Failed to fetch documents:", err);
      setErrorMsg(err?.message || "Failed to load document records. Ensure backend service is reachable.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentPersona]);

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate Document
  const handleGenerateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTitle.trim()) return;
    setIsSubmittingGen(true);
    try {
      const created = await api.documents.generate(
        {
          title: genTitle,
          doc_type: genDocType,
          student_ref: genStudentRef || undefined,
          student_name: genStudentName || undefined,
          content_text: genContentText || undefined,
          metadata_payload: {
            cohort: "CS-Y2",
            academic_term: "Fall 2026",
          },
        },
        genFinalizeImmediately
      );
      setDocuments((prev) => [created, ...prev]);
      setIsGenerateOpen(false);
      setGenTitle("");
    } catch (err: any) {
      alert("Error creating document: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmittingGen(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    if (uploadFile.size > 25 * 1024 * 1024) {
      alert("Choose a file smaller than 25 MB.");
      return;
    }
    setIsUploading(true);
    try {
      const created = await api.documents.upload(uploadFile, uploadTitle || uploadFile.name);
      setDocuments((prev) => [created, ...prev]);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    } catch (err: any) {
      alert("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  // Finalize Document
  const handleFinalize = async (doc: DocumentDTO) => {
    setProcessingDocId(doc.id);
    try {
      const fin = await api.documents.finalize(doc.id);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: "finalized",
                sha256_hash: fin.sha256_hash,
                finalized_at: fin.finalized_at,
              }
            : d
        )
      );
    } catch (err: any) {
      alert("Finalization error: " + (err.message || "Unknown error"));
    } finally {
      setProcessingDocId(null);
    }
  };

  // Anchor to Base Sepolia
  const handleAnchor = async (doc: DocumentDTO) => {
    setProcessingDocId(doc.id);
    try {
      if (!onchainReady || !contractAddress) {
        throw new Error("The Base Sepolia registry is not configured or deployed yet.");
      }
      const ethereum = (window as Eip1193Window).ethereum;
      if (!ethereum) throw new Error("Install or enable MetaMask in this browser to anchor files.");

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const walletAddress = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
      if (!walletAddress) throw new Error("Connect a wallet to submit the Base Sepolia transaction.");

      let chainId = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
      if (chainId !== "0x14a34") {
        try {
          await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x14a34" }] });
        } catch (switchError: any) {
          if (switchError?.code !== 4902) throw switchError;
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x14a34",
              chainName: "Base Sepolia",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            }],
          });
        }
        chainId = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
      }
      if (chainId !== "0x14a34") throw new Error("Switch your wallet to Base Sepolia (Chain ID 84532).");

      const refHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(doc.document_ref));
      const refHash = Array.from(new Uint8Array(refHashBuffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const data = `0xba5674c8${refHash}${doc.sha256_hash.toLowerCase()}`;
      const txHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: walletAddress, to: contractAddress, data }],
      });

      let receipt: any = null;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        receipt = await ethereum.request({ method: "eth_getTransactionReceipt", params: [txHash] });
        if (receipt) break;
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }
      if (!receipt) throw new Error(`Transaction ${txHash} is still pending. Refresh and retry confirmation after it appears on BaseScan.`);
      if (String(receipt.status).toLowerCase() !== "0x1") throw new Error("The Base Sepolia anchor transaction reverted.");

      const res: DocumentAnchorResponse = await api.documents.anchor(doc.id, txHash);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: "anchored",
                chain_id: res.chain_id,
                contract_address: res.contract_address || d.contract_address,
                tx_hash: res.tx_hash,
                explorer_url: res.explorer_url,
                anchoring_mode: res.anchoring_mode,
                anchored_at: res.anchored_at,
              }
            : d
        )
      );
      if (res.contract_address) setContractAddress(res.contract_address);
    } catch (err: any) {
      alert("Anchoring failed: " + (err.message || "Unknown error"));
    } finally {
      setProcessingDocId(null);
    }
  };

  // Download Authentic PDF
  const handleDownload = async (doc: DocumentDTO) => {
    try {
      const downloadUrl = api.documents.getDownloadUrl(doc.id);
      const token = api.getToken();
      const campusId = api.getCampusId() || "00000000-0000-0000-0000-000000000001";

      const resp = await fetch(downloadUrl, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "X-Campus-Id": campusId,
        },
      });

      if (!resp.ok) throw new Error("Download failed");

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || `${doc.document_ref}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert("Download error: " + (err.message || "Could not retrieve document bytes"));
    }
  };

  // Compute file SHA-256 in browser
  const computeFileSha256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleFileChange = async (file: File) => {
    setCandidateFile(file);
    setVerificationResult(null);
    try {
      const hash = await computeFileSha256(file);
      setCandidateHash(hash);
    } catch (err) {
      console.warn("SHA256 calculation error:", err);
    }
  };

  // Submit Verification
  const handleVerifySubmit = async () => {
    if (!verifyDocTarget || !candidateFile) return;
    setIsVerifying(true);
    try {
      const res = await api.documents.verify(verifyDocTarget.id, candidateFile);
      setVerificationResult({
        isMatch: res.is_match,
        anchoredHash: res.anchored_hash,
        candidateHash: res.candidate_hash,
        status: res.verification_status,
        verifiedAt: res.verified_at,
        disclaimer: res.legal_disclaimer,
      });

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === verifyDocTarget.id
            ? {
                ...d,
                verification_status: res.verification_status,
                last_verified_at: res.verified_at,
              }
            : d
        )
      );
    } catch (err: any) {
      alert("Verification check failed: " + (err.message || "Unknown error"));
    } finally {
      setIsVerifying(false);
    }
  };

  // Issue CBDC Milestone Voucher
  const handleIssueCBDC = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIssuingCbdc(true);
    try {
      const campusId = api.getCampusId() || "00000000-0000-0000-0000-000000000001";
      const voucher = await api.cbdc.issueVoucher({
        student_ref: cbdcStudentRef,
        amount_inr: cbdcAmount,
        purpose_code: cbdcPurpose,
        milestone_ref: cbdcMilestone,
        campus_id: campusId,
      });
      setVouchers((prev) => [voucher, ...prev]);
    } catch (err: any) {
      alert("Voucher error: " + (err.message || "Failed to issue simulated voucher"));
    } finally {
      setIsIssuingCbdc(false);
    }
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.document_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.sha256_hash.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    return doc.status.toUpperCase() === statusFilter.toUpperCase();
  });

  const anchoredCount = documents.filter((d) => d.status === "anchored" && d.anchoring_mode === "onchain" && d.tx_hash).length;
  const verifiedMatchCount = documents.filter((d) => d.verification_status === "verified_match").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Document Integrity
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${onchainReady ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${onchainReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {onchainReady ? "Base Sepolia live" : "Registry deployment required"}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Upload any file up to 25 MB, preserve its exact bytes, and verify its SHA-256 against the Base Sepolia registry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WalletConnectButton />
          <button
            onClick={fetchDocuments}
            disabled={isLoading}
            className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-all shadow-2xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload PDF / File</span>
          </button>
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Agreement</span>
          </button>
        </div>
      </div>

      {/* 2. SECURITY & GUARANTEE CALLOUT */}
      {!onchainReady && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
          <p>
            Files can be uploaded and fingerprinted now. On-chain anchoring is available after the real Base Sepolia registry is deployed and configured. Each anchor is submitted by your connected wallet; no simulated anchor is recorded.
          </p>
          <Link href="/documents/deploy" className="mt-2 inline-flex font-semibold underline underline-offset-2">Deploy the registry with MetaMask</Link>
          </div>
        </div>
      )}
      <div className="px-4 py-3 rounded-2xl bg-neutral-100/70 border border-neutral-200/80 flex items-center justify-between gap-3 text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong className="text-neutral-800">Exact-byte integrity:</strong> Uploaded files are hashed without conversion. Blockchain proof becomes available after the Base Sepolia registry is configured; this page never treats a local preview as an anchor.
          </span>
        </div>
        <span className="text-[11px] font-mono text-neutral-400 shrink-0 hidden sm:inline">
          EIP-1193 • SHA-256
        </span>
      </div>

      {/* 3. METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Documents</span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-heading">
            {documents.length}
          </div>
          <p className="text-[11px] text-neutral-400">Total institutional records</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Anchored On-Chain</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-heading">
            {anchoredCount}
          </div>
          <p className="text-[11px] text-neutral-400">Confirmed transactions only</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Verified Authentic</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-heading">
            {verifiedMatchCount}
          </div>
          <p className="text-[11px] text-neutral-400">100% byte match validated</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Registry Contract</span>
            <button
              onClick={() => contractAddress && copyToClipboard(contractAddress, "contract")}
              disabled={!contractAddress}
              className="text-[11px] text-neutral-500 hover:text-neutral-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === "contract" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === "contract" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div className="font-mono text-sm font-bold text-neutral-800 truncate" title={contractAddress || undefined}>
            {contractAddress ? `${contractAddress.slice(0, 8)}...${contractAddress.slice(-6)}` : "Not deployed"}
          </div>
          <p className="text-[11px] text-neutral-400">Base Sepolia · 84532</p>
        </div>
      </div>

      {/* 4. SEARCH & FILTERS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-neutral-200/80 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, document reference, or hash..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "ANCHORED", "FINALIZED", "DRAFT"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-neutral-900 text-white shadow-2xs"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 5. DOCUMENTS LIST */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center space-y-2">
            <RefreshCw className="w-5 h-5 text-neutral-400 animate-spin mx-auto" />
            <p className="text-xs text-neutral-500">Loading documents...</p>
          </div>
        ) : errorMsg ? (
          <div className="py-16 text-center space-y-3 px-4">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-neutral-800">Failed to load document records</h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              {errorMsg}
            </p>
            <div className="pt-2">
              <button
                onClick={fetchDocuments}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Connection
              </button>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-14 text-center space-y-2 px-4">
            <FileText className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="text-sm font-semibold text-neutral-800">No documents found</p>
            <p className="text-xs text-neutral-400">Upload a file to calculate its exact-byte SHA-256 fingerprint.</p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload file</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredDocuments.map((doc) => {
              const isAnchored = doc.status === "anchored";
              const isFinalized = doc.status === "finalized";
              const isDraft = doc.status === "draft";

              return (
                <div key={doc.id} className="p-4 hover:bg-neutral-50/60 transition-colors space-y-3">
                  {/* Top Bar: Title, Reference, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-neutral-100 text-neutral-700 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-neutral-900 truncate">
                            {doc.title}
                          </h3>
                          <span className="text-[11px] font-mono text-neutral-400 font-medium shrink-0">
                            [{doc.doc_type.replace("_", " ").toUpperCase()}]
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-mono mt-0.5">
                          {doc.document_ref} • {(doc.file_size_bytes / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isDraft && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                          Draft
                        </span>
                      )}
                      {isFinalized && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-800 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                          Finalized
                        </span>
                      )}
                      {isAnchored && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-900 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Anchored
                        </span>
                      )}

                      {doc.verification_status === "verified_match" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-900 font-semibold">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Authentic Match
                        </span>
                      )}
                      {doc.verification_status === "mismatch" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-900 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Tamper Alert
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hash & Actions Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    {/* Compact SHA-256 Box */}
                    <div className="flex items-center gap-2 text-xs font-mono bg-neutral-50 px-2.5 py-1 rounded-lg border border-neutral-200 text-neutral-800 max-w-fit">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 font-sans">
                        SHA-256
                      </span>
                      <span className="text-neutral-800">
                        {doc.sha256_hash.slice(0, 10)}...{doc.sha256_hash.slice(-8)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(doc.sha256_hash, `hash-${doc.id}`)}
                        className="text-neutral-400 hover:text-neutral-800 cursor-pointer ml-1"
                        title="Copy full hash"
                      >
                        {copiedKey === `hash-${doc.id}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isDraft && (
                        <button
                          onClick={() => handleFinalize(doc)}
                          disabled={processingDocId === doc.id}
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                        >
                          {processingDocId === doc.id ? "Freezing..." : "Finalize"}
                        </button>
                      )}

                      {isFinalized && (
                        <button
                          onClick={() => handleAnchor(doc)}
                          disabled={processingDocId === doc.id || !onchainReady}
                          title={!onchainReady ? "The Base Sepolia registry is not configured yet" : "Anchor exact file hash on Base Sepolia with your connected wallet"}
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{processingDocId === doc.id ? "Anchoring..." : "Anchor"}</span>
                        </button>
                      )}

                      {doc.explorer_url && (
                        <a
                          href={doc.explorer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>BaseScan</span>
                          <ExternalLink className="w-3 h-3 text-neutral-400" />
                        </a>
                      )}

                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 rounded-xl border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 text-xs cursor-pointer transition-colors"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5 text-neutral-500" />
                      </button>

                      <button
                        onClick={() => {
                          setVerifyDocTarget(doc);
                          setCandidateFile(null);
                          setCandidateHash(null);
                          setVerificationResult(null);
                        }}
                        disabled={doc.anchoring_mode !== "onchain" || !doc.tx_hash}
                        title={doc.tx_hash ? "Verify file against the on-chain registry" : "Anchor this file on-chain before blockchain verification"}
                        className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Verify</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. UPLOAD MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form onSubmit={handleUploadDocument} className="w-full max-w-lg space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Upload a file</h3>
                <p className="mt-1 text-xs text-neutral-500">Any file type, up to 25 MB. Original bytes are kept unchanged.</p>
              </div>
              <button type="button" onClick={() => setIsUploadOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-700" aria-label="Close upload dialog">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center hover:border-neutral-400">
              <UploadCloud className="mx-auto h-7 w-7 text-neutral-400" />
              <span className="mt-2 block text-xs font-semibold text-neutral-800">{uploadFile?.name || "Choose any file"}</span>
              <span className="mt-1 block text-[11px] text-neutral-500">{uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : "PDF, image, document, archive, or other file"}</span>
              <input
                ref={uploadInputRef}
                type="file"
                className="sr-only"
                onChange={(event) => {
                  const selected = event.target.files?.[0] || null;
                  setUploadFile(selected);
                  setUploadTitle(selected?.name || "");
                }}
              />
            </label>

            <div>
              <label htmlFor="uploaded-file-title" className="mb-1 block text-xs font-semibold text-neutral-700">Record title</label>
              <input
                id="uploaded-file-title"
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
                maxLength={255}
                placeholder="Defaults to the file name"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
              <button type="button" onClick={() => setIsUploadOpen(false)} className="rounded-xl border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">Cancel</button>
              <button type="submit" disabled={!uploadFile || isUploading || uploadFile.size > 25 * 1024 * 1024} className="rounded-xl bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">
                {isUploading ? "Uploading…" : "Upload & fingerprint"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 7. VERIFY MODAL */}
      {verifyDocTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Verify Document Integrity</h3>
                <p className="text-xs text-neutral-400 font-mono">{verifyDocTarget.document_ref}</p>
              </div>
              <button
                onClick={() => setVerifyDocTarget(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Target Anchored Hash */}
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 text-xs space-y-1">
              <span className="font-semibold text-neutral-400 uppercase text-[10px]">
                On-Chain Target SHA-256
              </span>
              <p className="font-mono text-neutral-800 break-all text-[11px]">
                {verifyDocTarget.sha256_hash}
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-neutral-50 space-y-1.5"
            >
              <UploadCloud className="w-7 h-7 text-neutral-400 mx-auto" />
              <p className="text-xs font-semibold text-neutral-700">
                {candidateFile ? candidateFile.name : "Select or drop the file to verify"}
              </p>
              <p className="text-[11px] text-neutral-400">
                Accepts any file type. Calculates raw-byte SHA-256 and compares it with Base Sepolia.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                }}
              />
            </div>

            {/* Candidate Hash preview */}
            {candidateHash && (
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 text-xs space-y-1">
                <span className="font-semibold text-neutral-400 uppercase text-[10px]">
                  Uploaded File SHA-256
                </span>
                <p className="font-mono text-neutral-800 break-all text-[11px]">
                  {candidateHash}
                </p>
              </div>
            )}

            {/* Verification Result Banner */}
            {verificationResult && (
              <div className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  {verificationResult.isMatch ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>CRYPTOGRAPHIC MATCH: 100% AUTHENTIC</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>TAMPER DETECTED: HASH MISMATCH</span>
                    </>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-neutral-600">
                  {verificationResult.isMatch
                    ? "The candidate document bytes match the Base Sepolia record exactly."
                    : "The candidate file bytes do NOT match the anchored record. The file has been modified or corrupted."}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyDocTarget(null)}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleVerifySubmit}
                disabled={!candidateFile || isVerifying}
                className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                {isVerifying ? "Verifying..." : "Run Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. GENERATE MODAL */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">New Student Agreement</h3>
                <p className="text-xs text-neutral-400">Title required · student details and terms are optional</p>
              </div>
              <button
                onClick={() => setIsGenerateOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateDocument} className="space-y-3 text-xs">
              <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  placeholder="e.g. Asha Attendance Recovery & Tutoring Agreement"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Type</label>
                  <select
                    value={genDocType}
                    onChange={(e) => setGenDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:outline-none"
                  >
                    <option value="intervention_plan">Intervention Plan</option>
                    <option value="retention_contract">Retention Contract</option>
                    <option value="case_decision">Case Decision</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Student Reference</label>
                  <input
                    type="text"
                    value={genStudentRef}
                    onChange={(e) => setGenStudentRef(e.target.value)}
                    placeholder="Optional reference"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Student name <span className="font-normal text-neutral-400">· PDF only</span></label>
                <input
                  type="text"
                  value={genStudentName}
                  onChange={(e) => setGenStudentName(e.target.value)}
                    placeholder="Optional name"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Agreement terms <span className="font-normal text-neutral-400">· optional</span></label>
                <textarea
                  rows={2}
                  value={genContentText}
                  onChange={(e) => setGenContentText(e.target.value)}
                  placeholder="What has been agreed?"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="finalizeImmediately"
                  checked={genFinalizeImmediately}
                  onChange={(e) => setGenFinalizeImmediately(e.target.checked)}
                  className="rounded text-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="finalizeImmediately" className="font-semibold text-neutral-700 cursor-pointer">
                  Finalize and freeze fingerprint immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGen}
                  className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white font-semibold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingGen ? "Generating..." : "Generate PDF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. SBI DIGITAL RUPEE (e₹ / CBDC) MILESTONE INCENTIVES */}
      <div className="p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200">
              <Coins className="w-4 h-4 text-neutral-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900 font-heading">
                  SBI Digital Rupee (e₹) Milestone Rewards
                </h2>
                <span className="text-[11px] font-mono text-neutral-400 font-medium">
                  (Simulated Boundary)
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Programmable e₹ incentive vouchers for verified milestone completion.
              </p>
            </div>
          </div>
        </div>

        {/* Issuance Form */}
        <form onSubmit={handleIssueCBDC} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs items-end bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
          <div>
            <label className="block font-semibold text-neutral-600 mb-1">Student Ref</label>
            <input
              type="text"
              value={cbdcStudentRef}
              onChange={(e) => setCbdcStudentRef(e.target.value)}
              placeholder="SYN-1007"
              className="w-full px-3 py-1.5 rounded-xl bg-white border border-neutral-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-600 mb-1">Milestone</label>
            <input
              type="text"
              value={cbdcMilestone}
              onChange={(e) => setCbdcMilestone(e.target.value)}
              placeholder="MILESTONE-W5-CHECKIN"
              className="w-full px-3 py-1.5 rounded-xl bg-white border border-neutral-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-600 mb-1">Value (₹ e₹)</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={cbdcAmount}
              onChange={(e) => setCbdcAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-xl bg-white border border-neutral-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-600 mb-1">Purpose Code</label>
            <select
              value={cbdcPurpose}
              onChange={(e) => setCbdcPurpose(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-white border border-neutral-200 focus:outline-none"
            >
              <option value="ACADEMIC_PERSISTENCE_REWARD">Academic Persistence (₹500)</option>
              <option value="ATTENDANCE_RECOVERY">Attendance Recovery (₹750)</option>
              <option value="PEER_TUTORING_COMPLETION">Tutoring Completion (₹1,000)</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={isIssuingCbdc}
              className="w-full px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isIssuingCbdc ? "Issuing..." : "Issue Voucher"}
            </button>
          </div>
        </form>

        {/* Vouchers list */}
        {vouchers.length > 0 && (
          <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-2xl overflow-hidden bg-white text-xs">
            {vouchers.map((v) => (
              <div key={v.voucher_id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-900">{v.voucher_id}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-neutral-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                      {v.status}
                    </span>
                  </div>
                  <p className="text-neutral-500 text-[11px]">
                    Student: <strong>{v.student_ref}</strong> • Milestone: {v.milestone_ref}
                  </p>
                </div>
                <div className="text-right sm:shrink-0">
                  <span className="text-sm font-bold text-neutral-900 font-heading">
                    ₹{v.amount_inr.toFixed(2)} e₹
                  </span>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    Ref: {v.transaction_reference || "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
