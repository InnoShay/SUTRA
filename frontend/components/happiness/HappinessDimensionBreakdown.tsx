"use client";

import React from "react";
import {
  HappinessIndexAggregateResponse,
  HappinessDimensionKey,
} from "@/lib/types";
import {
  HAPPINESS_DIMENSIONS,
} from "@/lib/happinessData";
import {
  getHappinessInterpretationBand,
  isGroupPrivacyProtected,
} from "@/lib/happinessScoring";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

interface HappinessDimensionBreakdownProps {
  aggregate: HappinessIndexAggregateResponse | null;
  isLoading?: boolean;
}

/**
 * Generates neutral, reviewed interpretation copy based on change points.
 * Avoids psychological conclusions or causal claims.
 */
function getNeutralInterpretation(
  title: string,
  change: number | null,
  score: number | null
): string {
  if (score === null) {
    return "The current period has insufficient responses for reliable comparison.";
  }
  if (change === null) {
    return `${title} recorded a baseline aggregate score of ${score.toFixed(1)} / 100 for this period.`;
  }
  if (change >= 2.0) {
    return `${title} scores increased by +${change.toFixed(1)} points compared with the previous period.`;
  }
  if (change <= -2.0) {
    return `${title} scores decreased by ${change.toFixed(1)} points compared with the previous period.`;
  }
  return `${title} scores remained broadly stable across reporting periods (${change >= 0 ? "+" : ""}${change.toFixed(1)} pts).`;
}

export function HappinessDimensionBreakdown({
  aggregate,
  isLoading,
}: HappinessDimensionBreakdownProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 space-y-4 shadow-2xs animate-pulse">
        <div className="h-4 bg-neutral-100 rounded-md w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-neutral-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!aggregate) return null;

  const isPrivacyProtected = isGroupPrivacyProtected(aggregate.response_count);

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div>
          <h3 className="text-base font-bold text-neutral-900 font-heading">
            Six Core Dimensions of Student Experience
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Normalized 0–100 scale based on weekly Likert responses (equal weighting)
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 self-start sm:self-auto">
          6 Dimensions
        </span>
      </div>

      {!isPrivacyProtected ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Dimension-level breakdowns are suppressed until at least 10 valid student responses are received to safeguard respondent privacy.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {HAPPINESS_DIMENSIONS.map((dimMeta) => {
            const dimScore = aggregate.dimension_scores[dimMeta.key];
            const score = dimScore?.score ?? null;
            const prevScore = dimScore?.previous_score ?? null;
            const change = dimScore?.change_points ?? null;
            const band = getHappinessInterpretationBand(score);
            const interpretationText = getNeutralInterpretation(
              dimMeta.title,
              change,
              score
            );

            return (
              <div
                key={dimMeta.key}
                className="p-5 rounded-2xl bg-neutral-50/60 border border-neutral-200/80 space-y-3.5 hover:bg-neutral-50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 font-heading">
                      {dimMeta.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                      {dimMeta.focusArea}
                    </p>
                  </div>
                  {band && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${band.badgeClass}`}
                    >
                      {band.label}
                    </span>
                  )}
                </div>

                {/* Score & Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-neutral-900 tracking-tight font-heading">
                        {score !== null ? score.toFixed(1) : "—"}
                      </span>
                      <span className="text-[11px] text-neutral-400">/ 100</span>
                    </div>

                    {/* Change indicator */}
                    <div className="flex items-center gap-1 font-semibold text-xs">
                      {change !== null && change > 0 && (
                        <span className="text-emerald-700 flex items-center gap-0.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+{change.toFixed(1)}</span>
                        </span>
                      )}
                      {change !== null && change < 0 && (
                        <span className="text-rose-700 flex items-center gap-0.5">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>{change.toFixed(1)}</span>
                        </span>
                      )}
                      {change !== null && change === 0 && (
                        <span className="text-neutral-500 flex items-center gap-0.5">
                          <Minus className="w-3.5 h-3.5" />
                          <span>0.0</span>
                        </span>
                      )}
                      {change === null && (
                        <span className="text-neutral-400 text-[11px]">
                          Prev: {prevScore !== null ? prevScore.toFixed(1) : "—"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-neutral-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, score || 0))}%` }}
                    />
                  </div>
                </div>

                {/* Neutral description caption */}
                <p className="text-[11px] text-neutral-600 leading-relaxed pt-2 border-t border-neutral-200/60">
                  {interpretationText}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
