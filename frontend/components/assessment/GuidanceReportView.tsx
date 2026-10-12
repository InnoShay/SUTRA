"use client";

import React from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PhoneCall,
  RotateCcw,
  X,
  ArrowRight,
  ShieldAlert,
  Info,
} from "lucide-react";
import {
  AssessmentReportResult,
  DimensionScoreResult,
} from "./assessmentScoring";
import { ASSESSMENT_DISCLAIMER } from "./assessmentData";

interface GuidanceReportViewProps {
  report: AssessmentReportResult;
  onRetake: () => void;
  onClose: () => void;
  onRequestCounselorCall?: () => void;
}

export function GuidanceReportView({
  report,
  onRetake,
  onClose,
  onRequestCounselorCall,
}: GuidanceReportViewProps) {
  const scoredCount = report.dimensions.filter((d) => d.status === "scored").length;

  return (
    <div className="space-y-6 text-neutral-900">
      {/* 1. Header Banner */}
      <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Self-Reflection Summary</span>
            </span>
            <span className="text-xs text-neutral-500">
              • {report.answeredQuestionsCount} of {report.totalQuestionsCount} questions answered
            </span>
          </div>

          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
            Stored Locally in Browser (Not Database-Persisted)
          </span>
        </div>

        <div>
          <h2 className="text-lg font-bold text-neutral-900 font-heading">
            Your Guidance Reflection Profile
          </h2>
          <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
            The dimension summaries below represent your self-reported learning habits and needs.
            Use them as starting points for conversation with your faculty mentor or academic counselor.
          </p>
        </div>

        {/* Mandatory Disclaimer */}
        <div className="p-3 bg-white rounded-xl border border-neutral-200/60 text-[11px] text-neutral-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-neutral-800">Important Note: </strong>
            {ASSESSMENT_DISCLAIMER} No composite score, clinical evaluation, or automated ranking is
            generated from this tool.
          </p>
        </div>
      </div>

      {/* 2. Six Dimension Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Dimension Summaries ({scoredCount}/6 Complete)
          </h3>
          <span className="text-[11px] text-neutral-400">Scale 1.00 – 5.00</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {report.dimensions.map((dim) => (
            <DimensionScoreCard key={dim.dimensionKey} dimension={dim} />
          ))}
        </div>
      </div>

      {/* 3. Optional Reflection Summary (if answered) */}
      {(report.reflections.q19Challenge || report.reflections.q20SessionGoal) && (
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Your Focus Areas for Counseling
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {report.reflections.q19Challenge && (
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1">
                <span className="text-[11px] font-semibold text-neutral-500 block">
                  Identified Priority Challenge
                </span>
                <p className="text-xs font-bold text-neutral-900">
                  {report.reflections.q19Challenge}
                </p>
                {report.reflections.q19CustomText && (
                  <p className="text-[11px] text-neutral-600 italic">
                    &ldquo;{report.reflections.q19CustomText}&rdquo;
                  </p>
                )}
              </div>
            )}

            {report.reflections.q20SessionGoal && (
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1">
                <span className="text-[11px] font-semibold text-neutral-500 block">
                  Desired Session Outcome
                </span>
                <p className="text-xs font-bold text-neutral-900">
                  {report.reflections.q20SessionGoal}
                </p>
                {report.reflections.q20CustomText && (
                  <p className="text-[11px] text-neutral-600 italic">
                    &ldquo;{report.reflections.q20CustomText}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Action Banner: Discuss with Counselor */}
      <div className="p-5 rounded-2xl bg-neutral-900 text-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Ready to Discuss These Reflections?</span>
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
              You can connect with an authorized campus counselor or mentor. Counseling sessions
              are free, confidential, and focus on supportive guidance agreed upon with you.
            </p>
          </div>

          {onRequestCounselorCall && (
            <button
              type="button"
              onClick={onRequestCounselorCall}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-semibold rounded-full text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Request Counselor Call</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
        <button
          type="button"
          onClick={onRetake}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retake Reflection</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-full transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

/**
 * Subcomponent rendering an individual dimension score card.
 */
function DimensionScoreCard({ dimension }: { dimension: DimensionScoreResult }) {
  const isScored = dimension.status === "scored" && dimension.mean !== null;

  // Percentage for progress bar (Scale 1.00 to 5.00 -> 0% to 100%)
  const percentage = isScored ? Math.max(0, Math.min(100, ((dimension.mean! - 1) / 4) * 100)) : 0;

  return (
    <div className="bg-white p-4.5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-neutral-900 truncate">
              {dimension.title}
            </h4>
            <p className="text-[11px] text-neutral-500 line-clamp-1">
              {dimension.shortDescription}
            </p>
          </div>

          {isScored && dimension.band ? (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${dimension.band.badgeClass}`}
            >
              {dimension.band.label}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
              Insufficient responses
            </span>
          )}
        </div>

        {/* Score & Progress Bar */}
        {isScored ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-neutral-500 text-[11px]">Dimension Mean</span>
              <span className="font-extrabold text-neutral-900 text-sm">
                {dimension.formattedMean}{" "}
                <span className="text-[11px] font-normal text-neutral-400">/ 5.00</span>
              </span>
            </div>

            <div
              className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={dimension.mean!}
              aria-valuemin={1}
              aria-valuemax={5}
              aria-label={`${dimension.title} score`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dimension.band?.barColorClass || "bg-neutral-500"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-[11px] text-neutral-500">
            All 3 questions in this dimension must be answered to calculate a summary score.
            ({dimension.validAnswerCount}/3 answered)
          </div>
        )}
      </div>

      {/* Exploratory Discussion Topic */}
      <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-600 space-y-0.5">
        <span className="font-semibold text-neutral-700 block">
          Possible discussion topic:
        </span>
        <p className="leading-snug text-neutral-500">
          {dimension.discussionSuggestion}
        </p>
      </div>
    </div>
  );
}
