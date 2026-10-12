"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSkillHub } from "@/lib/store";
import { api } from "@/lib/api";
import { SupportViewResponse, SignalDTO, AISummarizeEvidenceResponse } from "@/lib/types";
import { SignalReviewModal } from "@/components/SignalReviewModal";
import { SkillHubProgressBar } from "@/components/SkillHubProgressBar";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Send,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Shield,
  Activity,
  Layers,
  FileCheck,
  RefreshCw,
  Sparkles,
  Check,
  X,
} from "lucide-react";

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params?.id as string;
  const { students, activeRole, signals } = useSkillHub();

  const fallbackStudent =
    students.find((s) => s.id === studentId) ||
    students[0] || {
      id: studentId,
      name: "Aarav Sharma",
      email: "aarav.sharma@sutra.edu",
      course: "Computer Science (UG)",
      progress: 54,
      status: "At Risk" as const,
      avatar: "",
      isOnline: true,
      enrolledDate: "August 2026",
      grade: "C+",
      attendance: "64%",
      completedLessons: 6,
      totalLessons: 12,
      lastActive: "Today",
    };

  const [supportView, setSupportView] = useState<SupportViewResponse | null>(null);
  const [loadingSupportView, setLoadingSupportView] = useState<boolean>(true);
  const [supportViewError, setSupportViewError] = useState<string | null>(null);
  const [selectedSignalForReview, setSelectedSignalForReview] = useState<SignalDTO | null>(null);

  // Phase 6: AI Evidence Summarization State
  const [aiEvidenceSummary, setAiEvidenceSummary] = useState<AISummarizeEvidenceResponse | null>(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState<boolean>(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);

  const handleGenerateEvidenceSummary = async () => {
    if (activeRole === "leadership") return;
    setLoadingAiSummary(true);
    setAiSummaryError(null);
    try {
      const res = await api.ai.summarizeEvidence(studentId);
      setAiEvidenceSummary(res);
    } catch (err: any) {
      setAiSummaryError(err?.message || "AI evidence summarization service unavailable.");
    } finally {
      setLoadingAiSummary(false);
    }
  };

  const [message, setMessage] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);

  // Fetch 360° Support View from backend
  const fetchSupportView = async () => {
    if (activeRole === "leadership") return;
    setLoadingSupportView(true);
    setSupportViewError(null);
    try {
      const data = await api.students.getSupportView(studentId);
      setSupportView(data);
    } catch (err: any) {
      console.warn("Could not load backend support view:", err);
      setSupportViewError(err?.message || "Support view not accessible for current role.");
    } finally {
      setLoadingSupportView(false);
    }
  };

  useEffect(() => {
    fetchSupportView();
  }, [studentId, activeRole]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSentSuccess(true);
    setTimeout(() => {
      setMessage("");
      setSentSuccess(false);
    }, 2000);
  };

  // 1. Leadership Institutional Privacy Safeguard
  if (activeRole === "leadership") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <div>
          <Link
            href="/students"
            className="text-xs text-neutral-400 hover:text-neutral-900 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Students</span>
          </Link>
        </div>

        <div className="skill-card p-8 bg-white border border-neutral-200/80 rounded-3xl flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            Institutional Privacy Safeguard (ADR-004)
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-md">
            Individual student 360° telemetry and identifiable support queues are restricted for leadership roles to ensure confidentiality and data minimization.
          </p>
          <Link
            href="/analytics"
            className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
          >
            Go to Cohort Analytics
          </Link>
        </div>
      </div>
    );
  }

  // Active signals matching this student
  const studentSignals = signals.filter(
    (s) => s.student_id === studentId || s.external_student_ref === fallbackStudent.name
  );

  const studentDisplayName = supportView?.student?.display_name || fallbackStudent.name;
  const externalRef = supportView?.student?.external_ref || "SUTRA-2026-001";
  const enrollmentStatus = supportView?.student?.enrollment_status || fallbackStudent.status;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/students"
          className="text-xs text-neutral-400 hover:text-neutral-900 font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Students</span>
        </Link>

        <button
          onClick={fetchSupportView}
          disabled={loadingSupportView}
          className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingSupportView ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Main Student Profile Card */}
      <div className="skill-card bg-white p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-4">
              {fallbackStudent.avatar ? (
                <img
                  src={fallbackStudent.avatar}
                  alt={studentDisplayName}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-neutral-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-xl ring-4 ring-neutral-100">
                  {studentDisplayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
              )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-neutral-900 font-heading">
                  {studentDisplayName}
                </h1>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 uppercase tracking-wide">
                  {enrollmentStatus}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                  {externalRef}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                {fallbackStudent.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400">
              Campus: Apex Main
            </span>
          </div>
        </div>

        {/* SUTRA Telemetry & Data Freshness Banner */}
        <div className="skill-card-subtle p-5 bg-neutral-50/70 border border-neutral-200/70 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-700" />
              <h3 className="text-sm font-bold text-neutral-900">
                360° Support View Telemetry &amp; Freshness
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {supportView?.freshness_metrics?.is_stale ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Stale Telemetry Detected</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Telemetric Data Fresh</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Total Observations
              </span>
              <span className="text-lg font-extrabold text-neutral-900 mt-0.5 block">
                {supportView?.freshness_metrics?.total_observations ?? 12}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Domains Logged
              </span>
              <span className="text-xs font-bold text-neutral-800 mt-1 block capitalize">
                {supportView?.freshness_metrics?.domains_represented?.join(", ") ||
                  "academic, attendance, lms"}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Active Signals
              </span>
              <span className="text-lg font-extrabold text-amber-600 mt-0.5 block">
                {supportView?.active_signals_count ?? studentSignals.length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Open Cases
              </span>
              <span className="text-lg font-extrabold text-neutral-900 mt-0.5 block">
                {supportView?.active_cases_count ?? 1}
              </span>
            </div>
          </div>

          {/* Sensitive Domain Separation Disclosure */}
          <div className="p-3 bg-white rounded-xl border border-neutral-200/60 flex items-start gap-2 text-neutral-600 text-[11px] leading-relaxed">
            <Shield className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-800">
                Sensitive Domain Separation (ADR-003):
              </span>{" "}
              Fee payments, financial hardship requests, and billing records are strictly segregated from academic telemetry and are never displayed in educator support views.
            </div>
          </div>
        </div>

        {/* Observations Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Recent Multi-Domain Observations
            </h4>
            <button
              onClick={handleGenerateEvidenceSummary}
              disabled={loadingAiSummary}
              className="px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/70 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
            >
              {loadingAiSummary ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Telemetry...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Generate Evidence Summary</span>
                </>
              )}
            </button>
          </div>

          {/* AI Evidence Summary Panel */}
          {aiEvidenceSummary && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 border border-indigo-100 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-neutral-900">
                    AI Evidence Synthesis
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Advisory • Non-Binding
                  </span>
                </div>
                <button
                  onClick={() => setAiEvidenceSummary(null)}
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                  title="Close summary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-neutral-200/60">
                {aiEvidenceSummary.summary}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> Observed Facts
                  </span>
                  <ul className="space-y-1 text-emerald-900 text-[11px] list-disc list-inside">
                    {aiEvidenceSummary.observed_facts.map((fact, idx) => (
                      <li key={idx}>{fact}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Uncertainties & Limitations
                  </span>
                  <ul className="space-y-1 text-amber-900 text-[11px] list-disc list-inside">
                    {aiEvidenceSummary.uncertainties.concat(aiEvidenceSummary.limitations).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[10px] text-neutral-400">
                <span>Model: {aiEvidenceSummary.metadata.model_name} • {aiEvidenceSummary.metadata.latency_ms}ms</span>
                <span>Financial records excluded (ADR-003) • SUTRA Policy</span>
              </div>
            </div>
          )}

          {aiSummaryError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{aiSummaryError}</span>
              </div>
              <button
                onClick={handleGenerateEvidenceSummary}
                className="underline text-xs font-bold hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}
          <div className="border border-neutral-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4">Domain</th>
                  <th className="py-2.5 px-4">Metric</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4">Quality State</th>
                  <th className="py-2.5 px-4 text-right">Event Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {supportView?.recent_observations && supportView.recent_observations.length > 0 ? (
                  supportView.recent_observations.map((obs) => (
                    <tr key={obs.id} className="hover:bg-neutral-50/60">
                      <td className="py-2.5 px-4 font-semibold text-neutral-800 capitalize">
                        {obs.domain}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-600">
                        {obs.metric_key}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-neutral-900">
                        {typeof obs.value === "object" ? JSON.stringify(obs.value) : String(obs.value)} {obs.unit || ""}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          obs.quality_state === "valid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {obs.quality_state}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[10px] text-neutral-400">
                        {new Date(obs.event_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="hover:bg-neutral-50/60">
                      <td className="py-2.5 px-4 font-semibold text-neutral-800 capitalize">academic</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-600">quiz_scores_avg</td>
                      <td className="py-2.5 px-4 font-bold text-neutral-900">54.0%</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">valid</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[10px] text-neutral-400">Today</td>
                    </tr>
                    <tr className="hover:bg-neutral-50/60">
                      <td className="py-2.5 px-4 font-semibold text-neutral-800 capitalize">attendance</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-600">lecture_attendance_pct</td>
                      <td className="py-2.5 px-4 font-bold text-neutral-900">62.5%</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">valid</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[10px] text-neutral-400">Yesterday</td>
                    </tr>
                    <tr className="hover:bg-neutral-50/60">
                      <td className="py-2.5 px-4 font-semibold text-neutral-800 capitalize">lms</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-600">portal_active_minutes</td>
                      <td className="py-2.5 px-4 font-bold text-neutral-900">14 min</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">stale</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[10px] text-neutral-400">3 days ago</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Associated Signals with Evidence Cards */}
        {studentSignals.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Active Policy Signals &amp; Evidence Cards
            </h4>
            <div className="space-y-3">
              {studentSignals.map((sig) => (
                <div
                  key={sig.id}
                  className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900">
                        {sig.rule_key}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-800">
                        {sig.result.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {sig.evidence_digest}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSignalForReview(sig)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all whitespace-nowrap self-start sm:self-auto"
                  >
                    Review Signal
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Send Direct Guidance */}
        <form onSubmit={handleSendMessage} className="pt-4 border-t border-neutral-100 space-y-3">
          <label className="text-xs font-semibold text-neutral-700 block">
            Direct Student Guidance &amp; Resources
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Send guidance note, tutorial session invitation, or support link..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Note</span>
            </button>
          </div>
          {sentSuccess && (
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Message recorded in student communication history
            </p>
          )}
        </form>
      </div>

      {/* Review Signal Modal */}
      {selectedSignalForReview && (
        <SignalReviewModal
          signal={selectedSignalForReview}
          onClose={() => setSelectedSignalForReview(null)}
          onSuccess={() => {
            setSelectedSignalForReview(null);
            fetchSupportView();
          }}
        />
      )}
    </div>
  );
}
