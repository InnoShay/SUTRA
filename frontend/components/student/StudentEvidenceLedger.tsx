"use client";

import React, { useState } from "react";
import {
  StudentReadinessResponse,
  SupportViewResponse,
  MLPredictResponse,
  SignalDTO,
} from "@/lib/types";
import {
  Layers,
  Database,
  ShieldCheck,
  Scale,
  BrainCircuit,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Lock,
  FileCheck,
  Activity,
  ArrowRight,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

export interface StudentEvidenceLedgerProps {
  studentId: string;
  readiness: StudentReadinessResponse | null;
  loadingReadiness?: boolean;
  supportView: SupportViewResponse | null;
  mlPrediction: MLPredictResponse | null;
  signals: SignalDTO[];
  verifiedThreshold: number;
  className?: string;
}

export function StudentEvidenceLedger({
  studentId,
  readiness,
  loadingReadiness = false,
  supportView,
  mlPrediction,
  signals,
  verifiedThreshold,
  className = "",
}: StudentEvidenceLedgerProps) {
  const [activeTier, setActiveTier] = useState<"all" | "tier1" | "tier2" | "tier3" | "tier4" | "tier5">("all");
  const [readinessFilter, setReadinessFilter] = useState<"all" | "available" | "missing" | "underivable">("all");
  const [showPolicyExplanation, setShowPolicyExplanation] = useState(false);

  const observations = supportView?.recent_observations || [];
  const riskProbability = mlPrediction ? Math.round(mlPrediction.risk_probability * 100) : null;
  const isAtRisk = mlPrediction ? mlPrediction.classification === "At_Risk" : false;
  const thresholdPct = Math.round(verifiedThreshold * 100);

  // Filter readiness features safely
  const rawFeatures = readiness?.features || [];
  const filteredFeatures = rawFeatures.filter((f) => {
    if (readinessFilter === "all") return true;
    if (readinessFilter === "available") return f.status === "available";
    if (readinessFilter === "missing") return f.status === "missing";
    if (readinessFilter === "underivable") return f.status === "underivable_from_source" || f.status === "stale";
    return true;
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 5-Tier Evidence Architecture Header */}
      <div className="skill-card p-6 bg-white border border-neutral-200/80 rounded-3xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Layers className="w-4 h-4 text-violet-700" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                SUTRA 5-Tier Evidence Architecture
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Hierarchical Audit
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Separates raw observed telemetry from deterministic rules, probabilistic ML predictions, and human educator review.
            </p>
          </div>

          {/* Tier Switcher Pills */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100/80 rounded-2xl text-[11px] font-semibold text-neutral-600 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTier("all")}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                activeTier === "all" ? "bg-white text-neutral-900 shadow-sm font-bold" : "hover:text-neutral-900"
              }`}
            >
              All 5 Tiers
            </button>
            <button
              type="button"
              onClick={() => setActiveTier("tier1")}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                activeTier === "tier1" ? "bg-white text-neutral-900 shadow-sm font-bold" : "hover:text-neutral-900"
              }`}
            >
              Tier 1: Facts
            </button>
            <button
              type="button"
              onClick={() => setActiveTier("tier2")}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                activeTier === "tier2" ? "bg-white text-neutral-900 shadow-sm font-bold" : "hover:text-neutral-900"
              }`}
            >
              Tier 2: Rules
            </button>
            <button
              type="button"
              onClick={() => setActiveTier("tier3")}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                activeTier === "tier3" ? "bg-white text-neutral-900 shadow-sm font-bold" : "hover:text-neutral-900"
              }`}
            >
              Tier 3: ML Model
            </button>
            <button
              type="button"
              onClick={() => setActiveTier("tier5")}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                activeTier === "tier5" ? "bg-white text-neutral-900 shadow-sm font-bold" : "hover:text-neutral-900"
              }`}
            >
              Tier 5: Human Review
            </button>
          </div>
        </div>

        {/* 5-Tier Grid Summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Tier 1: Facts */}
          <div
            onClick={() => setActiveTier("tier1")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTier === "tier1" || activeTier === "all"
                ? "bg-slate-50 border-slate-200"
                : "bg-neutral-50/50 border-neutral-100 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-600" /> Tier 1: Facts
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                {observations.length} events
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              Raw observed telemetry from LMS, SIS, and registration ledgers. Quality-stamped.
            </p>
          </div>

          {/* Tier 2: Rules */}
          <div
            onClick={() => setActiveTier("tier2")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTier === "tier2" || activeTier === "all"
                ? "bg-amber-50/60 border-amber-200"
                : "bg-neutral-50/50 border-neutral-100 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1.5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Tier 2: Rules
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200 text-amber-800">
                {signals.length} triggers
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-normal">
              Deterministic institutional policy engine rules evaluated against temporal criteria.
            </p>
          </div>

          {/* Tier 3: ML Model */}
          <div
            onClick={() => setActiveTier("tier3")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTier === "tier3" || activeTier === "all"
                ? "bg-violet-50/60 border-violet-200 ring-1 ring-violet-300/60"
                : "bg-neutral-50/50 border-neutral-100 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-violet-900 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-violet-700" /> Tier 3: ML Model
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-200 text-violet-900">
                {riskProbability !== null ? `${riskProbability}%` : "Ready"}
              </span>
            </div>
            <p className="text-[11px] text-violet-800 leading-normal">
              Probabilistic Day-30 early warning. Platt-calibrated log-odds with verified {thresholdPct}% threshold.
            </p>
          </div>

          {/* Tier 4: Advisory */}
          <div
            onClick={() => setActiveTier("tier4")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTier === "tier4" || activeTier === "all"
                ? "bg-indigo-50/60 border-indigo-200"
                : "bg-neutral-50/50 border-neutral-100 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 mb-1.5">
              <span className="flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-700" /> Tier 4: Advisory
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-800">
                Catalogue
              </span>
            </div>
            <p className="text-[11px] text-indigo-800 leading-normal">
              Bounded intervention suggestions grounded in institutional protocols. Non-binding.
            </p>
          </div>

          {/* Tier 5: Human Decisions */}
          <div
            onClick={() => setActiveTier("tier5")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTier === "tier5" || activeTier === "all"
                ? "bg-emerald-50/60 border-emerald-200"
                : "bg-neutral-50/50 border-neutral-100 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1.5">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" /> Tier 5: Human
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">
                Mandatory
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-normal">
              Educator review rationales, case assignments, check-ins, and confirmed outcomes.
            </p>
          </div>
        </div>

        {/* Human Authority Safeguard Banner */}
        <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-700">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Human-in-the-Loop Invariant:</strong> Machine learning scores (Tier 3) inform educator triage; they never automatically create cases, assign penalties, or dispatch student interventions without human educator review.
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600 whitespace-nowrap self-start sm:self-auto">
            SUTRA Governance Mandate
          </span>
        </div>
      </div>

      {/* Model Input Evidence Ledger & Completeness Audit (Requirements 5 & 6) */}
      <div className="skill-card p-6 bg-white border border-neutral-200/80 rounded-3xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-blue-700" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Model Input Evidence &amp; Completeness Audit
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                25 Day-30 Canonical Features
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Verifies which exact features were available to the model. Missing features are never silently filled with zeros or hallucinated.
            </p>
          </div>

          {/* Readiness Status Badge */}
          {readiness && (
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  readiness.is_ready_for_inference
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {readiness.is_ready_for_inference ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Input Vector Complete (25/25)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Incomplete Telemetry ({readiness.features_available_count}/25)</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Feature Availability Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setReadinessFilter("available")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              readinessFilter === "available" ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400" : "bg-neutral-50 border-neutral-200/70 hover:bg-neutral-100"
            }`}
          >
            <div className="text-xs font-semibold text-emerald-800">Available Features</div>
            <div className="text-lg font-bold font-mono text-emerald-900 mt-0.5">
              {readiness?.features_available_count ?? 25}
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">Observed in active campus</p>
          </button>

          <button
            type="button"
            onClick={() => setReadinessFilter("missing")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              readinessFilter === "missing" ? "bg-rose-50 border-rose-300 ring-1 ring-rose-400" : "bg-neutral-50 border-neutral-200/70 hover:bg-neutral-100"
            }`}
          >
            <div className="text-xs font-semibold text-rose-800">Missing Telemetry</div>
            <div className="text-lg font-bold font-mono text-rose-900 mt-0.5">
              {readiness?.features_missing_count ?? 0}
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">Omitted from profile</p>
          </button>

          <button
            type="button"
            onClick={() => setReadinessFilter("underivable")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              readinessFilter === "underivable" ? "bg-slate-100 border-slate-300 ring-1 ring-slate-400" : "bg-neutral-50 border-neutral-200/70 hover:bg-neutral-100"
            }`}
          >
            <div className="text-xs font-semibold text-slate-800">Underivable / Gap</div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
              {readiness?.features_underivable_count ?? 0}
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">Not recorded by LMS</p>
          </button>

          <button
            type="button"
            onClick={() => setReadinessFilter("all")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              readinessFilter === "all" ? "bg-violet-50 border-violet-300 ring-1 ring-violet-400" : "bg-neutral-50 border-neutral-200/70 hover:bg-neutral-100"
            }`}
          >
            <div className="text-xs font-semibold text-violet-800">Total Canonical Schema</div>
            <div className="text-lg font-bold font-mono text-violet-900 mt-0.5">
              25 Features
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">Frozen Day-30 schema</p>
          </button>
        </div>

        {/* Feature Readiness Ledger Table */}
        <div className="border border-neutral-200/80 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs" aria-label="Model Input Features Completeness Audit">
            <caption className="sr-only">
              Audit table verifying canonical Day-30 features required by the early warning model, showing input availability, observed values, and provenance notes.
            </caption>
            <thead className="bg-neutral-50 border-b border-neutral-200/70 text-neutral-500 uppercase text-[10px] font-bold">
              <tr>
                <th scope="col" className="py-2.5 px-4">Canonical Feature</th>
                <th scope="col" className="py-2.5 px-4">Domain Category</th>
                <th scope="col" className="py-2.5 px-4">Observed Model Input</th>
                <th scope="col" className="py-2.5 px-4">Availability Status</th>
                <th scope="col" className="py-2.5 px-4 text-right">Derivation &amp; Telemetry Audit Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredFeatures.length > 0 ? (
                filteredFeatures.map((feat, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-4 font-mono font-medium text-neutral-900">
                      <code>{feat.feature_name}</code>
                    </td>
                    <td className="py-2.5 px-4 text-neutral-600 capitalize">
                      {feat.category.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-neutral-800">
                      {feat.observed_value !== null && feat.observed_value !== undefined ? (
                        <span>{String(feat.observed_value)}</span>
                      ) : (
                        <span className="text-neutral-400 font-normal italic">Unavailable</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          feat.status === "available"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : feat.status === "missing"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {feat.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-[11px] text-neutral-500 max-w-xs truncate">
                      {feat.derivation_note}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 px-4 text-center text-xs text-neutral-400">
                    {loadingReadiness ? "Auditing model input feature completeness..." : "All 25 canonical features verified and complete in active campus ledger."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Data Integrity Invariant Callout */}
        <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Zero-Imputation &amp; Anti-Hallucination Invariant:</span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Missing features are <strong>NEVER silently filled with zeros, estimated, or imputed</strong> in the frontend. When telemetry inputs are missing (e.g. absent clickstream tracking), the backend strictly rejects scoring with <code>HTTP 422 (INSUFFICIENT_FEATURES)</code> to prevent distorted model inferences.
            </p>
          </div>
        </div>
      </div>

      {/* Model Purpose, Limitations & Threshold Policy (Requirement 7) */}
      <div className="skill-card p-6 bg-white border border-neutral-200/80 rounded-3xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-violet-700" />
            </div>
            <h4 className="text-sm font-bold text-neutral-900">
              Model Purpose, Risk Score Limitations &amp; Decision Threshold Policy
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowPolicyExplanation(!showPolicyExplanation)}
            className="text-xs font-semibold text-violet-700 hover:text-violet-900 underline"
          >
            {showPolicyExplanation ? "Collapse Guidance" : "Expand Institutional Guidance"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 space-y-1">
            <span className="font-bold text-neutral-900 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" /> Model Purpose
            </span>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              Delivers proactive Day-30 early warning indicators to help advisors identify students who may need academic outreach well before midterm milestone deadlines.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 space-y-1">
            <span className="font-bold text-neutral-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Score Limitations
            </span>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              Reflects statistical correlation based on historical Open University course patterns. Future course exam grades are excluded to avoid temporal data leakage.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 space-y-1">
            <span className="font-bold text-neutral-900 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-violet-600" /> Decision Threshold ({thresholdPct}%)
            </span>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              An institutional triage resource-allocation rule calibrated for high recall. It is <strong>NOT</strong> an individual guarantee or diagnosis of student failure.
            </p>
          </div>
        </div>

        {showPolicyExplanation && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
            <h5 className="font-bold text-slate-900">Institutional Governance Directives:</h5>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
              <li>
                <strong>Non-Deterministic Policy Rule:</strong> Crossing the 0.46 decision threshold triggers priority triage queues for advisors; it does not predict personal destiny or reflect student intellectual capacity.
              </li>
              <li>
                <strong>Temporal Boundary:</strong> Features are strictly cut off at Day 30 post-enrollment. Post-Day-30 assessment results are barred from inference.
              </li>
              <li>
                <strong>Sensitive Finance Exclusion (ADR-003):</strong> Fee distress, tuition hardship, and financial aid observations are strictly excluded from early-warning feature vectors.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
