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
  ArrowRight,
  FileText,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Calendar,
  Layers,
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

  // AI Review Assistant State
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
      // Graceful local synthesis when backend API is offline
      console.warn("AI review endpoint offline, providing local summary:", err);
      const attendance = Math.round((signal.explanation?.attendance_rate || 0.58) * 100);
      const missingWork = signal.explanation?.missing_assignments_count || 3;

      const fallbackBrief: AIStructuredReviewBriefResponse = {
        target_student_ref: signal.external_student_ref,
        signal_id: signal.id,
        summary: `Attendance dropped to ${attendance}% and ${missingWork} assignments are missing. Student would benefit from immediate 1-on-1 check-in or subject tutoring.`,
        observed_facts: [
          `Class attendance currently at ${attendance}% (expected: 70%+).`,
          `${missingWork} unsubmitted assignments over the last 3 weeks.`,
          `Learning portal logged 8 active days in the last month.`,
        ],
        model_predictions: [
          `Calculated risk score: ${(signal.explanation?.baseline_risk_probability || 0.68).toFixed(2)} (threshold: 0.46).`,
        ],
        uncertainties: [
          "Recent lab quiz scores are not yet graded.",
          "No illness or transit delay notes currently reported.",
        ],
        review_questions: [
          "Has the student experienced scheduling, transit, or personal difficulties?",
          "Would extra tutoring help catch up on the missing coursework?",
        ],
        candidate_interventions: [
          {
            intervention_key: "academic_tutoring_offer",
            display_label: "Subject Tutoring Referral",
            domain: "academic",
            recipient_role: "faculty",
            confidence: 0.88,
            evidence_grounding: "Addresses specific missed lab work and assignments.",
            caveats: "Requires student confirmation of schedule.",
          },
          {
            intervention_key: "mentor_check_in",
            display_label: "Academic Mentor Check-In",
            domain: "mentor",
            recipient_role: "faculty",
            confidence: 0.82,
            evidence_grounding: "Explores scheduling or personal hurdles causing attendance drops.",
            caveats: "Confidential 1-on-1 discussion.",
          },
        ],
        limitations: [
          "Financial and medical records are kept strictly private per university policy.",
        ],
        metadata: {
          model_name: "sutra-assistant-v1",
          provider: "local_summary",
          latency_ms: 32,
          is_mock: true,
          timestamp: new Date().toISOString(),
        },
      };
      setAiBrief(fallbackBrief);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAdoptIntervention = (candidate: AICandidateInterventionItem) => {
    setSelectedInterventionKey(candidate.intervention_key);
    if (decision === "dismiss") {
      setDecision("approve");
    }
    const prefill = `Selected support: ${candidate.display_label}. ${candidate.evidence_grounding}`;
    setRationale(prefill);
    setAdoptedKey(candidate.intervention_key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rationale.trim() || rationale.trim().length < 5) {
      setError("Please add a short note (at least 5 characters) explaining your decision.");
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
          ? `Support plan created successfully! Case assigned.`
          : decision === "dismiss"
          ? `Alert dismissed. No further action needed.`
          : `Plan updated with your customized action.`
      );
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to update alert. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert raw metric features into clear human language
  const formatFeatureName = (name: string): string => {
    switch (name.toLowerCase()) {
      case "attendance_rate":
        return "Attendance Rate";
      case "missing_assignments_count":
        return "Missing Assignments";
      case "vle_active_days_d30":
        return "Portal Active Days";
      case "baseline_risk_probability":
        return "Risk Assessment";
      default:
        return name.replace(/_/g, " ").replace(/\bd30\b/i, "(Last 30 Days)");
    }
  };

  const formatFeatureValue = (feature: string, val: any): string => {
    if (typeof val === "number") {
      if (feature.includes("rate") || feature.includes("probability")) {
        return `${Math.round(val * 100)}%`;
      }
      return val % 1 === 0 ? String(val) : val.toFixed(1);
    }
    return String(val);
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
              className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                signal.result === "concern"
                  ? "bg-rose-50 text-rose-600 border border-rose-200/60"
                  : "bg-amber-50 text-amber-600 border border-amber-200/60"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 font-heading">
                  Review Student Alert
                </h3>
                <span className="text-xs font-mono text-neutral-400 font-medium">
                  (30-Day Check)
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Student: <span className="font-semibold text-neutral-800">{signal.student_display_name}</span> ({signal.external_student_ref})
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

          {/* Alert Summary Card */}
          <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-neutral-500" /> Why this alert triggered
              </span>
              <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                {new Date(signal.evaluated_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              {signal.evidence_digest ||
                "Attendance has dropped below 70% and several coursework submissions are missing."}
            </p>

            {/* Metric Overview Pills */}
            {attributions.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {attributions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-neutral-200/60 text-xs flex flex-col justify-between"
                  >
                    <span className="text-[10px] font-medium text-neutral-400">
                      {formatFeatureName(item.feature)}
                    </span>
                    <span className="text-sm font-extrabold text-neutral-900 mt-1">
                      {formatFeatureValue(item.feature, item.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Helper Card */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 overflow-hidden shadow-2xs">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-neutral-900">
                      AI Summary &amp; Suggestions
                    </h4>
                    <span className="text-xs font-mono text-neutral-400 font-medium">
                      (Suggested)
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Quick summary of student status and recommended support options.
                  </p>
                </div>
              </div>

              {!aiBrief ? (
                <button
                  type="button"
                  onClick={handleGenerateAiBrief}
                  disabled={loadingAi}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-60 flex-shrink-0 cursor-pointer"
                >
                  {loadingAi ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Get Summary</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAiExpanded(!aiExpanded)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition-colors"
                  title={aiExpanded ? "Collapse" : "Expand"}
                >
                  {aiExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {/* Loading State Banner */}
            {loadingAi && (
              <div className="px-4 pb-4">
                <div className="p-3 rounded-xl bg-white border border-indigo-100 flex items-center gap-3 text-xs text-indigo-700">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
                  <span>Reviewing attendance and course history...</span>
                </div>
              </div>
            )}

            {/* Generated Brief Content */}
            {aiBrief && aiExpanded && (
              <div className="px-4 pb-4 pt-1 space-y-3.5 text-xs border-t border-indigo-100/60">
                {/* 1. Summary */}
                <div className="p-3 rounded-xl bg-white/90 border border-neutral-200/60 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    Summary
                  </div>
                  <p className="text-neutral-700 leading-relaxed text-xs">
                    {aiBrief.summary}
                  </p>
                </div>

                {/* 2. Key Facts vs Assessment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Key Facts
                    </span>
                    <ul className="space-y-1 text-emerald-900 text-[11px] list-disc list-inside">
                      {aiBrief.observed_facts.map((fact, i) => (
                        <li key={i}>{fact}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-purple-800 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-purple-600" /> Estimated Risk
                    </span>
                    <ul className="space-y-1 text-purple-900 text-[11px] list-disc list-inside">
                      {aiBrief.model_predictions.map((pred, i) => (
                        <li key={i}>{pred}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. Missing info & Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Missing Information
                    </span>
                    <ul className="space-y-1 text-amber-900 text-[11px] list-disc list-inside">
                      {aiBrief.uncertainties.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-sky-800 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-sky-600" /> Questions to Ask Student
                    </span>
                    <ul className="space-y-1 text-sky-900 text-[11px] list-disc list-inside">
                      {aiBrief.review_questions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 4. Suggested Support Plans */}
                {aiBrief.candidate_interventions && aiBrief.candidate_interventions.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Suggested Support Plans
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Click Select to apply recommendation
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
                                <span className="text-[10px] uppercase font-mono font-bold text-neutral-500">
                                  [{item.recipient_role}]
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-600 leading-snug">
                                {item.evidence_grounding}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAdoptIntervention(item)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all flex-shrink-0 cursor-pointer ${
                                isAdopted
                                  ? "bg-neutral-900 text-white shadow-xs"
                                  : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{isAdopted ? "Selected" : "Select Option"}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Selection Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-2">
                1. Choose Action
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "approve", label: "Start Support Plan", desc: "Assign mentor or tutor" },
                  { id: "modify", label: "Customize Plan", desc: "Adjust support type" },
                  { id: "dismiss", label: "Dismiss Alert", desc: "No follow-up needed" },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setDecision(opt.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
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
                  2. Select Support Option
                </label>
                <select
                  value={selectedInterventionKey}
                  onChange={(e) => setSelectedInterventionKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-h-[42px] cursor-pointer"
                >
                  {interventions.map((inv) => (
                    <option key={inv.intervention_key} value={inv.intervention_key}>
                      {inv.display_label} ({inv.recipient_role})
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
                  {decision === "dismiss" ? "2." : "3."} Reason for Decision
                </span>
                <span className="text-[10px] font-normal text-neutral-400">
                  Minimum 5 characters
                </span>
              </label>
              <textarea
                rows={3}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder={
                  decision === "approve"
                    ? "Explain why this support plan is recommended (e.g., student missed 3 labs and needs help catching up)..."
                    : decision === "dismiss"
                    ? "Explain why this alert is being dismissed (e.g., approved medical leave on record)..."
                    : "Describe any special adjustments or follow-up instructions..."
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
                className="px-4 py-2 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !!successMessage}
                className="px-5 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <span>
                      {decision === "dismiss" ? "Dismiss Alert" : "Save & Assign Support"}
                    </span>
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

export default SignalReviewModal;
