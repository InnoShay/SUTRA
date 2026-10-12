"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { DocumentDTO, CBDCVoucherRecord } from "@/lib/types";
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

export default function DocumentsPage() {
  const { currentPersona } = useSkillHub();

  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [contractAddress, setContractAddress] = useState<string>("0x3565eDb6aEc447CaeB73F719574828135cfB9705");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Generate Document Modal State
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genTitle, setGenTitle] = useState("");
  const [genDocType, setGenDocType] = useState("intervention_plan");
  const [genStudentRef, setGenStudentRef] = useState("SYN-1007");
  const [genStudentName, setGenStudentName] = useState("Asha (synthetic)");
  const [genContentText, setGenContentText] = useState(
    "Agreed to 14-day peer tutoring, lab recovery check-ins, and weekly progress milestones."
  );
  const [genFinalizeImmediately, setGenFinalizeImmediately] = useState(false);
  const [isSubmittingGen, setIsSubmittingGen] = useState(false);

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
      const anchoredWithContract = res.documents.find((d) => d.contract_address);
      if (anchoredWithContract?.contract_address) {
        setContractAddress(anchoredWithContract.contract_address);
      }
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
      const res = await api.documents.anchor(doc.id);
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
      if (res.contract_address) {
        setContractAddress(res.contract_address);
      }
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

  const anchoredCount = documents.filter((d) => d.status === "anchored").length;
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Base Sepolia (84532)
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Byte-level cryptographic SHA-256 anchoring and tamper verification for student agreements. Zero PII on-chain.
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
            onClick={() => setIsGenerateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Agreement</span>
          </button>
        </div>
      </div>

      {/* 2. SECURITY & GUARANTEE CALLOUT */}
      <div className="px-4 py-3 rounded-2xl bg-neutral-100/70 border border-neutral-200/80 flex items-center justify-between gap-3 text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong className="text-neutral-800">Immutable Integrity Guarantee:</strong> Document hashes are anchored to Base Sepolia smart contract registry. Student personal data is kept strictly private off-chain.
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
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-heading">
            {anchoredCount}
          </div>
          <p className="text-[11px] text-neutral-400">Base Sepolia records</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Verified Authentic</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700 font-heading">
            {verifiedMatchCount}
          </div>
          <p className="text-[11px] text-neutral-400">100% byte match validated</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Registry Contract</span>
            <button
              onClick={() => copyToClipboard(contractAddress, "contract")}
              className="text-[11px] text-neutral-500 hover:text-neutral-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === "contract" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === "contract" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div className="font-mono text-sm font-bold text-neutral-800 truncate" title={contractAddress}>
            {contractAddress ? `${contractAddress.slice(0, 8)}...${contractAddress.slice(-6)}` : "Pending"}
          </div>
          <p className="text-[11px] text-neutral-400">Chain ID 84532</p>
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
            <p className="text-xs text-neutral-400">Generate an agreement to start anchoring records on-chain.</p>
            <button
              onClick={() => setIsGenerateOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Agreement</span>
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
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 shrink-0">
                            {doc.doc_type.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-mono mt-0.5">
                          {doc.document_ref} • {(doc.file_size_bytes / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isDraft && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Draft
                        </span>
                      )}
                      {isFinalized && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Finalized
                        </span>
                      )}
                      {isAnchored && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Anchored
                        </span>
                      )}

                      {doc.verification_status === "verified_match" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Authentic Match
                        </span>
                      )}
                      {doc.verification_status === "mismatch" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Tamper Alert
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hash & Actions Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    {/* Compact SHA-256 Pill */}
                    <div className="flex items-center gap-2 text-xs font-mono bg-neutral-50 px-2.5 py-1 rounded-lg border border-neutral-200/70 max-w-fit">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 font-sans">
                        SHA-256
                      </span>
                      <span className="text-neutral-700">
                        {doc.sha256_hash.slice(0, 10)}...{doc.sha256_hash.slice(-8)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(doc.sha256_hash, `hash-${doc.id}`)}
                        className="text-neutral-400 hover:text-neutral-700 cursor-pointer ml-1"
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
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          {processingDocId === doc.id ? "Freezing..." : "Finalize"}
                        </button>
                      )}

                      {isFinalized && (
                        <button
                          onClick={() => handleAnchor(doc)}
                          disabled={processingDocId === doc.id}
                          className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{processingDocId === doc.id ? "Anchoring..." : "Anchor"}</span>
                        </button>
                      )}

                      {doc.explorer_url && (
                        <a
                          href={doc.explorer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <span>BaseScan</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setVerifyDocTarget(doc);
                          setCandidateFile(null);
                          setCandidateHash(null);
                          setVerificationResult(null);
                        }}
                        className="px-3 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
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

      {/* 6. VERIFY MODAL */}
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
                {candidateFile ? candidateFile.name : "Select or drop candidate PDF to verify"}
              </p>
              <p className="text-[11px] text-neutral-400">
                Calculates raw byte SHA-256 and compares against anchored registry.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
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
              <div
                className={`p-3.5 rounded-xl border ${
                  verificationResult.isMatch
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                } space-y-1`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  {verificationResult.isMatch ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>CRYPTOGRAPHIC MATCH: 100% AUTHENTIC</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <span>TAMPER DETECTED: HASH MISMATCH</span>
                    </>
                  )}
                </div>
                <p className="text-xs leading-relaxed opacity-90">
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
                <p className="text-xs text-neutral-400">Generates PDF &amp; SHA-256 fingerprint</p>
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
                <label className="block font-semibold text-neutral-700 mb-1">Title</label>
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
                    placeholder="e.g. SYN-1007"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Student Display Name (PDF Only)</label>
                <input
                  type="text"
                  value={genStudentName}
                  onChange={(e) => setGenStudentName(e.target.value)}
                  placeholder="e.g. Asha (synthetic)"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Intervention Terms</label>
                <textarea
                  rows={2}
                  value={genContentText}
                  onChange={(e) => setGenContentText(e.target.value)}
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
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900 font-heading">
                  SBI Digital Rupee (e₹) Milestone Rewards
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Simulated Boundary
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Programmable e₹ incentive vouchers for verified milestone completion.
              </p>
            </div>
          </div>
        </div>

        {/* Issuance Form */}
        <form onSubmit={handleIssueCBDC} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs items-end bg-neutral-50/70 p-3 rounded-2xl border border-neutral-200/60">
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
              className="w-full px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
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
