"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import {
  SignalDTO,
  SignalReviewRequest,
  AIStructuredReviewBriefResponse,
  AICandidateInterventionItem,
} from "@/lib/types";
import { api } from "@/lib/api";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Info,
  Layers,
  FileCheck,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SignalReviewModalProps {
  signal: SignalDTO | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SignalReviewModal({
  signal,
  onClose,
  onSuccess,
}: SignalReviewModalProps) {
  const { reviewSignal, interventions } = useSkillHub();

  const [decision, setDecision] = useState<
    "approve" | "modify" | "dismiss" | "request_more_data"
  >("approve");
  const [selectedInterventionKey, setSelectedInterventionKey] = useState<string>(
    signal?.explanation?.recommended_intervention || "academic_tutoring_offer"
  );
  const [rationale, setRationale] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Phase 6: Bounded AI Orchestration Assistant State
  const [aiBrief, setAiBrief] = useState<AIStructuredReviewBriefResponse | null>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState<boolean>(false);
  const [adoptedKey, setAdoptedKey] = useState<string | null>(null);

  if (!signal) return null;

  const handleGenerateAiBrief = async () => {
    if (!signal) return;
    setLoadingAi(true);
    setAiError(null);
    setAiExpanded(true);
    try {
      const data = await api.ai.getReviewBrief(signal.id);
      setAiBrief(data);
    } catch (err: any) {
      setAiError(
        err?.message ||
          "AI review service unavailable or provider timed out. Proceed with manual review."
      );
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAdoptIntervention = (candidate: AICandidateInterventionItem) => {
    setSelectedInterventionKey(candidate.intervention_key);
    if (decision === "dismiss") {
      setDecision("approve");
    }
    const prefill = `AI Suggestion Adopted: ${candidate.display_label}. Grounding: ${candidate.evidence_grounding}. Caveats acknowledged: ${candidate.caveats}.`;
    setRationale(prefill);
    setAdoptedKey(candidate.intervention_key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rationale.trim() || rationale.trim().length < 5) {
      setError("Please provide a substantive rationale (at least 5 characters) per SUTRA policy.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: SignalReviewRequest = {
      decision,
      selected_intervention_key:
        decision === "dismiss" ? undefined : selectedInterventionKey,
      reason_code:
        decision === "approve"
          ? "REVIEWER_APPROVED_RECOMMENDATION"
          : decision === "dismiss"
          ? "REVIEWER_DISMISSED_FALSE_POSITIVE"
          : "REVIEWER_SELECTED_ALTERNATIVE",
      rationale: rationale.trim(),
    };

    try {
      const response = await reviewSignal(signal.id, payload);
      setSuccessMessage(
        decision === "approve"
          ? `Signal approved! Intervention Case ${response.case_id ? `#${response.case_id.slice(0, 8)}` : ""} created.`
          : `Signal updated with decision: ${decision}.`
      );
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to review signal. Please verify your role permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const attributions = signal.evidence_card?.attributions || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                signal.result === "concern"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-amber-500 text-white shadow-sm"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 font-heading">
                  Review Policy Signal
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-700">
                  {signal.rule_key}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Target:{" "}
                <span className="font-semibold text-neutral-800">
                  {signal.student_display_name}
                </span>{" "}
                ({signal.external_student_ref})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200/50 text-neutral-400 hover:text-neutral-700 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Success State Alert */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center gap-3 text-xs text-emerald-800 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Evidence Card Display */}
          <div className="skill-card-subtle p-4 bg-neutral-50/70 border border-neutral-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-neutral-500" /> Evidence Card
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                Evaluated: {new Date(signal.evaluated_at).toLocaleString()}
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              {signal.evidence_digest ||
                "Deterministic rule evaluation triggered intervention threshold based on temporal multi-domain telemetry."}
            </p>

            {/* Feature Attributions / Telemetry metrics */}
            {attributions.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {attributions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-neutral-200/60 text-xs flex flex-col justify-between"
                  >
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      {item.feature.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-extrabold text-neutral-900 mt-0.5">
                      {typeof item.value === "number"
                        ? item.value.toFixed(2)
                        : String(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phase 6: Bounded AI Review Assistant */}
          <div className="rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-neutral-900">
                      AI Review Assistant
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700">
                      Advisory Only
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Synthesize observations, isolate facts from predictions, and suggest catalogue interventions.
                  </p>
                </div>
              </div>

              {!aiBrief ? (
                <button
                  type="button"
                  onClick={handleGenerateAiBrief}
                  disabled={loadingAi}
                  className="px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60 flex-shrink-0"
                >
                  {loadingAi ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Prepare Review Brief</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAiExpanded(!aiExpanded)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors"
                  title={aiExpanded ? "Collapse brief" : "Expand brief"}
                >
                  {aiExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {/* Error State */}
            {aiError && (
              <div className="p-3 mx-4 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{aiError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAiBrief}
                  className="underline text-xs font-bold hover:text-rose-900"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading State Banner */}
            {loadingAi && (
              <div className="px-4 pb-4">
                <div className="p-3 rounded-xl bg-white border border-indigo-100 flex items-center gap-3 text-xs text-indigo-700">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
                  <span>Cross-referencing student telemetry with campus catalog & constructing bounded brief...</span>
                </div>
              </div>
            )}

            {/* Generated Brief Content */}
            {aiBrief && aiExpanded && (
              <div className="px-4 pb-4 pt-1 space-y-3.5 text-xs border-t border-indigo-100/60">
                {/* 1. Summary */}
                <div className="p-3 rounded-xl bg-white/90 border border-neutral-200/60 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    Evidence Summary
                  </div>
                  <p className="text-neutral-700 leading-relaxed text-xs">
                    {aiBrief.summary}
                  </p>
                </div>

                {/* 2. Observed Facts vs Model Predictions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Observed Facts */}
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Verified Observed Facts
                    </span>
                    <ul className="space-y-1 text-emerald-900 text-[11px] list-disc list-inside">
                      {aiBrief.observed_facts.map((fact, i) => (
                        <li key={i}>{fact}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Model Predictions */}
                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-purple-800 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-purple-600" /> Model Predictions
                    </span>
                    <ul className="space-y-1 text-purple-900 text-[11px] list-disc list-inside">
                      {aiBrief.model_predictions.map((pred, i) => (
                        <li key={i}>{pred}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. Uncertainties & Review Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Uncertainties */}
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Uncertainties & Data Gaps
                    </span>
                    <ul className="space-y-1 text-amber-900 text-[11px] list-disc list-inside">
                      {aiBrief.uncertainties.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Review Questions */}
                  <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-sky-800 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-sky-600" /> Questions for Staff Investigation
                    </span>
                    <ul className="space-y-1 text-sky-900 text-[11px] list-disc list-inside">
                      {aiBrief.review_questions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 4. Candidate Interventions from Campus Catalog */}
                {aiBrief.candidate_interventions && aiBrief.candidate_interventions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Candidate Interventions (Campus Catalog Verified)
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Click Adopt to prefill review decision
                      </span>
                    </div>

                    <div className="space-y-2">
                      {aiBrief.candidate_interventions.map((item) => {
                        const isAdopted = adoptedKey === item.intervention_key;
                        return (
                          <div
                            key={item.intervention_key}
                            className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                              isAdopted
                                ? "bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-300"
                                : "bg-white border-neutral-200/70 hover:border-neutral-300"
                            }`}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900 text-xs">
                                  {item.display_label}
                                </span>
                                <span className="text-[9px] uppercase px-1.5 py-0.5 bg-neutral-100 text-neutral-600 font-bold rounded">
                                  {item.recipient_role}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-400">
                                  Match: {Math.round(item.confidence * 100)}%
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-600 leading-snug">
                                {item.evidence_grounding}
                              </p>
                              <div className="text-[10px] text-neutral-400 italic">
                                Caveat: {item.caveats}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAdoptIntervention(item)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all flex-shrink-0 ${
                                isAdopted
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{isAdopted ? "Adopted" : "Adopt"}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Audit & Disclaimer Footer */}
                <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="font-mono">
                    Model: {aiBrief.metadata.model_name} • {aiBrief.metadata.latency_ms}ms • {aiBrief.metadata.provider}
                  </span>
                  <span>Non-binding • Requires authorized human confirmation</span>
                </div>
              </div>
            )}
          </div>

          {/* Review Decision Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-2">
                1. Human Review Action
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "approve", label: "Approve & Convert", desc: "Create Active Case" },
                  { id: "modify", label: "Modify Plan", desc: "Change Action" },
                  { id: "dismiss", label: "Dismiss Signal", desc: "No Action Needed" },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setDecision(opt.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      decision === opt.id
                        ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        decision === opt.id ? "text-neutral-300" : "text-neutral-400"
                      }`}
                    >
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {decision !== "dismiss" && (
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1.5">
                  2. Select Intervention from Catalog
                </label>
                <select
                  value={selectedInterventionKey}
                  onChange={(e) => setSelectedInterventionKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-h-[42px]"
                >
                  {interventions.map((inv) => (
                    <option key={inv.intervention_key} value={inv.intervention_key}>
                      {inv.display_label} ({inv.domain.toUpperCase()} • Assigned to{" "}
                      {inv.recipient_role})
                    </option>
                  ))}
                  {interventions.length === 0 && (
                    <>
                      <option value="academic_tutoring_offer">
                        Subject Tutoring Referral (Faculty / Academic)
                      </option>
                      <option value="mentor_check_in">
                        Academic Mentor Check-In (Mentor / Academic)
                      </option>
                      <option value="counselling_referral">
                        Student Wellbeing Referral (Counselor / Wellbeing)
                      </option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-neutral-800 flex items-center justify-between mb-1.5">
                <span>
                  {decision === "dismiss" ? "2." : "3."} Reviewer Rationale (Mandatory)
                </span>
                <span className="text-[10px] font-normal text-neutral-400">
                  Principle: No Alert Without Action
                </span>
              </label>
              <textarea
                rows={3}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder={
                  decision === "approve"
                    ? "Explain why this intervention is recommended (e.g. Student missed 3 key labs; tutorial session assigned)..."
                    : decision === "dismiss"
                    ? "Explain why this alert is being dismissed (e.g. Valid medical leave on file)..."
                    : "Specify modifications and expected recovery milestones..."
                }
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !!successMessage}
                className="px-5 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Recording Decision...</span>
                ) : (
                  <>
                    <span>Confirm Decision</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
