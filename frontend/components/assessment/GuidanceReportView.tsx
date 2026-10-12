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
  Info,
  BookOpen,
  Target,
  Clock,
  HeartHandshake,
  Compass,
  MessageSquareQuote,
  Printer,
  Flag,
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

/**
 * Returns a distinct Lucide vector icon for each assessment dimension.
 */
function getDimensionIcon(dimensionKey: string) {
  switch (dimensionKey) {
    case "learning_approach":
      return BookOpen;
    case "motivation_engagement":
      return Target;
    case "confidence_self_efficacy":
      return Sparkles;
    case "planning_time_management":
      return Clock;
    case "coping_support":
      return HeartHandshake;
    case "aspirations_career":
      return Compass;
    default:
      return Sparkles;
  }
}

export function GuidanceReportView({
  report,
  onRetake,
  onClose,
  onRequestCounselorCall,
}: GuidanceReportViewProps) {
  const scoredCount = report.dimensions.filter((d) => d.status === "scored").length;

  // Breakdown metrics for the Executive Summary Ribbon
  const currentResourcesCount = report.dimensions.filter(
    (d) => d.status === "scored" && d.band?.key === "current_resource"
  ).length;

  const mixedDevelopingCount = report.dimensions.filter(
    (d) => d.status === "scored" && d.band?.key === "mixed_developing"
  ).length;

  const exploreSupportCount = report.dimensions.filter(
    (d) => d.status === "scored" && d.band?.key === "explore_support"
  ).length;

  const insufficientCount = report.dimensions.filter(
    (d) => d.status === "insufficient"
  ).length;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-6 text-neutral-900">
      {/* 1. Executive Summary Ribbon */}
      <div className="bg-neutral-50/80 rounded-2xl p-5 sm:p-6 border border-neutral-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Self-Reflection Profile
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                {report.answeredQuestionsCount} of {report.totalQuestionsCount} questions completed
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 font-heading mt-1.5">
              Guidance Reflection Summary
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
              Self-reported learning habits and priorities to discuss with your faculty mentor or academic counselor.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-neutral-700 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shadow-2xs">
              Stored In-Session Only
            </span>
          </div>
        </div>

        {/* Status Distribution Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-neutral-800">Current Resources</span>
            </div>
            <span className="text-xs font-extrabold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded-md">
              {currentResourcesCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-sky-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
              <span className="text-xs font-bold text-neutral-800">Developing Areas</span>
            </div>
            <span className="text-xs font-extrabold text-sky-700 px-2 py-0.5 bg-sky-50 rounded-md">
              {mixedDevelopingCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-xs font-bold text-neutral-800">Explore Support</span>
            </div>
            <span className="text-xs font-extrabold text-amber-700 px-2 py-0.5 bg-amber-50 rounded-md">
              {exploreSupportCount}
            </span>
          </div>
        </div>

        {/* Non-Clinical Framing Disclaimer */}
        <div className="p-3 bg-white/80 rounded-xl border border-neutral-200/70 text-[11px] text-neutral-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-neutral-800 font-semibold">Self-Reflection Note: </strong>
            {ASSESSMENT_DISCLAIMER} This tool does not compute an overall clinical ranking, diagnostic evaluation, or composite index.
          </p>
        </div>
      </div>

      {/* 2. Dimension Cards Grid */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
              Dimension Summaries ({scoredCount}/6 Complete)
            </h3>
            <p className="text-[11px] text-neutral-500">
              Arithmetic mean scale from 1.00 (Low agreement) to 5.00 (Strong agreement)
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-400 hidden sm:inline">
            Scale 1.00 – 5.00
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.dimensions.map((dim) => (
            <DimensionScoreCard key={dim.dimensionKey} dimension={dim} />
          ))}
        </div>
      </div>

      {/* 3. Optional Reflection Focus Areas (Q19 / Q20) */}
      {(report.reflections.q19Challenge || report.reflections.q20SessionGoal) && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-neutral-700" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">
              Your Focus Areas for Counseling
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {report.reflections.q19Challenge && (
              <div className="p-4 bg-neutral-50/80 rounded-xl border border-neutral-200/70 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Priority Academic Challenge
                </span>
                <p className="text-xs font-bold text-neutral-900 leading-snug">
                  {report.reflections.q19Challenge}
                </p>
                {report.reflections.q19CustomText && (
                  <p className="text-xs text-neutral-600 italic bg-white p-2.5 rounded-lg border border-neutral-200/60 mt-1">
                    &ldquo;{report.reflections.q19CustomText}&rdquo;
                  </p>
                )}
              </div>
            )}

            {report.reflections.q20SessionGoal && (
              <div className="p-4 bg-neutral-50/80 rounded-xl border border-neutral-200/70 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Desired Session Outcome
                </span>
                <p className="text-xs font-bold text-neutral-900 leading-snug">
                  {report.reflections.q20SessionGoal}
                </p>
                {report.reflections.q20CustomText && (
                  <p className="text-xs text-neutral-600 italic bg-white p-2.5 rounded-lg border border-neutral-200/60 mt-1">
                    &ldquo;{report.reflections.q20CustomText}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Action Banner: Discuss with Counselor */}
      <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 text-white space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <PhoneCall className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-extrabold tracking-tight">
                Ready to Discuss These Reflections?
              </h4>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                Free • Confidential
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
              Connect with an authorized campus counselor or faculty mentor. Sessions focus entirely on supportive guidance agreed upon with you.
            </p>
          </div>

          {onRequestCounselorCall && (
            <button
              type="button"
              onClick={onRequestCounselorCall}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-extrabold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Request Counselor Call</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Footer Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-neutral-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRetake}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Reflection</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer text-center"
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
  const DimensionIcon = getDimensionIcon(dimension.dimensionKey);

  // Percentage for progress bar (Scale 1.00 to 5.00 -> 0% to 100%)
  const percentage = isScored ? Math.max(0, Math.min(100, ((dimension.mean! - 1) / 4) * 100)) : 0;

  // Band-specific progress bar gradient classes
  const getGradientClass = (bandKey?: string) => {
    switch (bandKey) {
      case "explore_support":
        return "bg-gradient-to-r from-amber-400 to-amber-500";
      case "mixed_developing":
        return "bg-gradient-to-r from-sky-400 to-blue-500";
      case "current_resource":
        return "bg-gradient-to-r from-emerald-400 to-teal-500";
      default:
        return "bg-neutral-400";
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between gap-4">
      {/* Top Header Row with Icon, Title, and Band Pill */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-800 shrink-0 mt-0.5">
              <DimensionIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-extrabold text-neutral-900 leading-snug">
                {dimension.title}
              </h4>
              <p className="text-xs text-neutral-500 leading-normal mt-0.5">
                {dimension.shortDescription}
              </p>
            </div>
          </div>

          {isScored && dimension.band ? (
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold border shrink-0 ${dimension.band.badgeClass}`}
            >
              {dimension.band.label}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
              Insufficient responses
            </span>
          )}
        </div>

        {/* Score & Progress Bar */}
        {isScored ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                Score (Mean)
              </span>
              <span className="font-extrabold text-neutral-900 text-sm">
                {dimension.formattedMean}{" "}
                <span className="text-[11px] font-normal text-neutral-400">/ 5.00</span>
              </span>
            </div>

            {/* Gradient Progress Bar */}
            <div
              className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200/50"
              role="progressbar"
              aria-valuenow={dimension.mean!}
              aria-valuemin={1}
              aria-valuemax={5}
              aria-label={`${dimension.title} score`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${getGradientClass(
                  dimension.band?.key
                )}`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Milestone scale labels */}
            <div className="flex justify-between text-[10px] text-neutral-400 font-semibold pt-0.5">
              <span>1.0 Low</span>
              <span>3.0 Moderate</span>
              <span>5.0 Strong</span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-xs text-neutral-600">
            All 3 questions in this dimension must be answered to calculate a summary score.
            ({dimension.validAnswerCount}/3 answered)
          </div>
        )}
      </div>

      {/* Styled Counselor Talking Point Card */}
      <div className="p-3.5 rounded-xl bg-neutral-50/90 border border-neutral-200/70 space-y-1.5">
        <div className="flex items-center gap-1.5 text-neutral-700">
          <MessageSquareQuote className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-700">
            Counselor Talking Point
          </span>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed font-medium">
          {dimension.discussionSuggestion}
        </p>
      </div>
    </div>
  );
}
