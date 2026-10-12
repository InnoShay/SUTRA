"use client";

import React from "react";
import { HappinessIndexAggregateResponse } from "@/lib/types";
import {
  getHappinessInterpretationBand,
  isGroupPrivacyProtected,
} from "@/lib/happinessScoring";
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  ShieldAlert,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";

interface HappinessIndexSummaryCardProps {
  aggregate: HappinessIndexAggregateResponse | null;
  isLoading?: boolean;
}

export function HappinessIndexSummaryCard({
  aggregate,
  isLoading,
}: HappinessIndexSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 space-y-4 shadow-2xs animate-pulse">
        <div className="h-4 bg-neutral-100 rounded-md w-1/3" />
        <div className="h-10 bg-neutral-100 rounded-lg w-1/4" />
        <div className="h-4 bg-neutral-100 rounded-md w-1/2" />
      </div>
    );
  }

  if (!aggregate) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-2xs text-center space-y-2">
        <Heart className="w-8 h-8 text-neutral-300 mx-auto" />
        <h3 className="text-sm font-semibold text-neutral-800">
          No Happiness Index Data Available
        </h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          No aggregate student responses have been recorded for this period yet.
        </p>
      </div>
    );
  }

  const isPrivacyProtected = isGroupPrivacyProtected(aggregate.response_count);
  const band = isPrivacyProtected
    ? getHappinessInterpretationBand(aggregate.happiness_index)
    : null;

  const change = aggregate.change_points ?? null;
  const isPositiveChange = change !== null && change > 0;
  const isNegativeChange = change !== null && change < 0;
  const isNeutralChange = change !== null && change === 0;

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-2xs space-y-6">
      {/* Top Header: Period, Demo Tag, Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              AGGREGATE CAMPUS METRIC
            </span>
            {aggregate.is_demo_data && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Demonstration Data
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 font-heading mt-0.5">
            Institutional Happiness Index
          </h2>
          <p className="text-xs text-neutral-500">
            Reporting Period:{" "}
            <span className="font-semibold text-neutral-700">
              {aggregate.reporting_period}
            </span>{" "}
            • Model: {aggregate.calculation_version}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400 self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>Refreshed: {aggregate.last_refreshed_at}</span>
        </div>
      </div>

      {/* Main KPI Row */}
      {!isPrivacyProtected ? (
        /* Privacy suppression warning */
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              Not enough responses to calculate a reliable index
            </p>
            <p className="text-amber-800 leading-relaxed">
              To safeguard student anonymity, aggregate indices require a minimum of 10 valid respondents (current valid responses: {aggregate.response_count}). Individual dimension scores are hidden until the privacy threshold is reached.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* 1. Main Score */}
          <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              CURRENT INDEX
            </span>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-heading">
                {aggregate.happiness_index?.toFixed(1) ?? "—"}
              </span>
              <span className="text-xs font-medium text-neutral-400">/ 100</span>
            </div>
            {band && (
              <div className="pt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${band.badgeClass}`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{band.label}</span>
                </span>
              </div>
            )}
          </div>

          {/* 2. Absolute Point Change */}
          <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              PERIOD CHANGE
            </span>
            <div className="flex items-center gap-2 pt-1">
              {isPositiveChange && (
                <div className="flex items-center gap-1 text-emerald-700 font-bold text-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span>+{change?.toFixed(1)} pts</span>
                </div>
              )}
              {isNegativeChange && (
                <div className="flex items-center gap-1 text-rose-700 font-bold text-lg">
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                  <span>{change?.toFixed(1)} pts</span>
                </div>
              )}
              {isNeutralChange && (
                <div className="flex items-center gap-1 text-neutral-600 font-bold text-lg">
                  <Minus className="w-5 h-5 text-neutral-400" />
                  <span>0.0 pts</span>
                </div>
              )}
              {change === null && (
                <span className="text-neutral-400 font-medium text-sm">
                  First Period
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 pt-0.5">
              vs previous period ({aggregate.previous_index?.toFixed(1) ?? "baseline"})
            </p>
          </div>

          {/* 3. Valid Response Count */}
          <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              VALID RESPONSES
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-extrabold text-neutral-900 tracking-tight font-heading">
                {aggregate.response_count}
              </span>
              <span className="text-xs text-neutral-500">Students</span>
            </div>
            <p className="text-xs text-emerald-700 font-medium flex items-center gap-1 pt-0.5">
              <span>Threshold Met</span>
              <span className="text-neutral-400">• Min 10</span>
            </p>
          </div>

          {/* 4. Participation Rate */}
          <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              PARTICIPATION RATE
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-extrabold text-neutral-900 tracking-tight font-heading">
                {aggregate.participation_rate !== undefined &&
                aggregate.participation_rate !== null
                  ? `${aggregate.participation_rate.toFixed(1)}%`
                  : "N/A"}
              </span>
            </div>
            <p className="text-xs text-neutral-400 pt-0.5 truncate">
              {aggregate.eligible_students_count
                ? `${aggregate.response_count} of ${aggregate.eligible_students_count} eligible`
                : "Cohort denominator pending"}
            </p>
          </div>
        </div>
      )}

      {/* Explanatory Caption */}
      <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-2.5 text-xs text-neutral-600">
        <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          The SUTRA Happiness Index is computed as an equal-weighted average of valid responses across 6 core campus dimensions. It measures aggregate campus experience to inform institutional support and is not used for individual student risk diagnosis or academic scoring.
        </p>
      </div>
    </div>
  );
}
