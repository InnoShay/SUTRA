"use client";

import React from "react";
import { AlertTriangle, CheckCircle, HelpCircle, Lock, ShieldCheck, TrendingDown, Users } from "lucide-react";
import { RiskDistributionDTO } from "@/lib/types";

interface CohortRiskDistributionChartProps {
  riskDistribution?: RiskDistributionDTO | null;
  totalStudents?: number;
  evaluatedStudents?: number;
  coveragePercentage?: number;
  totalPredictionRuns?: number;
  className?: string;
}

export function CohortRiskDistributionChart({
  riskDistribution,
  totalStudents = 0,
  evaluatedStudents = 0,
  coveragePercentage = 0,
  totalPredictionRuns = 0,
  className = "",
}: CohortRiskDistributionChartProps) {
  const isSuppressed = riskDistribution?.is_privacy_suppressed || false;
  const suppressionReason = riskDistribution?.suppression_reason || "Subgroup size < 5 (Protected under ADR-004)";
  const threshold = riskDistribution?.threshold ?? 0.46;

  const atRiskCount = riskDistribution?.at_risk_count ?? 0;
  const atRiskPct = riskDistribution?.at_risk_percentage ?? 0;
  const onTrackCount = riskDistribution?.on_track_count ?? 0;
  const onTrackPct = riskDistribution?.on_track_percentage ?? 0;
  const unevaluatedCount = riskDistribution?.unevaluated_count ?? Math.max(0, totalStudents - evaluatedStudents);

  const lowRisk = riskDistribution?.granular_tiers?.low_risk ?? 0;
  const modRisk = riskDistribution?.granular_tiers?.moderate_risk ?? 0;
  const elevRisk = riskDistribution?.granular_tiers?.elevated_risk ?? 0;

  return (
    <div className={`skill-card p-5 sm:p-6 bg-white relative rounded-3xl border border-neutral-200/80 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-neutral-900 tracking-tight font-heading">
              Cohort Early-Warning Risk Distribution
            </h3>
            <span className="text-[11px] font-mono text-neutral-500 font-medium">
              Threshold: {threshold.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Statistical disengagement probability evaluated strictly on canonical Day-30 telemetry
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-neutral-500">
          <Users className="w-3.5 h-3.5 text-neutral-400" />
          <span>
            <strong className="text-neutral-900">{evaluatedStudents}</strong> of {totalStudents} evaluated ({coveragePercentage}%)
          </span>
        </div>
      </div>

      {/* Small-Group Privacy Suppression State (ADR-004) */}
      {isSuppressed ? (
        <div className="py-8 px-4 my-2 text-center bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-amber-900">
            Small-Group Privacy Suppression Active
          </div>
          <p className="text-xs text-amber-700 max-w-md mx-auto leading-relaxed">
            {suppressionReason}. Under SUTRA ADR-004, individual risk classifications are masked for cohorts with fewer than 5 students in aggregate leadership views to prevent student re-identification.
          </p>
        </div>
      ) : totalStudents === 0 ? (
        /* Empty State */
        <div className="py-10 text-center text-neutral-400 text-xs">
          No student records found in the selected cohort scope.
        </div>
      ) : (
        /* Normal Distribution View */
        <div className="space-y-6 pt-4">
          {/* Proportional Progress Distribution Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-medium">
              <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                At-Risk ({atRiskPct}% · {atRiskCount} {atRiskCount === 1 ? "student" : "students"})
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                On-Track ({onTrackPct}% · {onTrackCount} {onTrackCount === 1 ? "student" : "students"})
              </span>
              {unevaluatedCount > 0 && (
                <span className="flex items-center gap-1.5 text-neutral-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 inline-block" />
                  Unevaluated ({unevaluatedCount})
                </span>
              )}
            </div>

            <div className="h-4 w-full bg-neutral-100 rounded-full overflow-hidden flex shadow-inner">
              {evaluatedStudents > 0 ? (
                <>
                  <div
                    style={{ width: `${(atRiskCount / totalStudents) * 100}%` }}
                    className="bg-rose-500 hover:bg-rose-600 transition-all"
                    title={`At-Risk: ${atRiskCount} students (${atRiskPct}% of evaluated)`}
                  />
                  <div
                    style={{ width: `${(onTrackCount / totalStudents) * 100}%` }}
                    className="bg-emerald-500 hover:bg-emerald-600 transition-all"
                    title={`On-Track: ${onTrackCount} students (${onTrackPct}% of evaluated)`}
                  />
                  <div
                    style={{ width: `${(unevaluatedCount / totalStudents) * 100}%` }}
                    className="bg-neutral-300 transition-all"
                    title={`Unevaluated / Incomplete Telemetry: ${unevaluatedCount} students`}
                  />
                </>
              ) : (
                <div className="w-full bg-neutral-200 text-[10px] text-neutral-500 flex items-center justify-center">
                  0% evaluated
                </div>
              )}
            </div>
          </div>

          {/* Granular Risk Tiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Low Risk Tier */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/50 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
                <span>Low Risk (&lt; 0.30)</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-emerald-900">{lowRisk}</div>
              <div className="text-[10px] text-emerald-700">Strong Day-30 course pacing</div>
            </div>

            {/* Moderate Risk Tier */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/50 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800">
                <span>Moderate (0.30 - 0.46)</span>
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-extrabold text-amber-900">{modRisk}</div>
              <div className="text-[10px] text-amber-700">Sub-threshold disengagement alerts</div>
            </div>

            {/* Elevated Risk Tier */}
            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/50 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-rose-800">
                <span>Elevated (≥ 0.46)</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-xl font-extrabold text-rose-900">{elevRisk}</div>
              <div className="text-[10px] text-rose-700">Classified At-Risk under governance policy</div>
            </div>
          </div>

          {/* Audit Denominators & Provenance Subtext */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
            <span>
              Total execution volume: <strong className="text-neutral-700">{totalPredictionRuns}</strong> prediction runs (deduplicated to {evaluatedStudents} unique students)
            </span>
            <span className="font-mono text-[10px] text-neutral-400">
              OULAD Day-30 Baseline Model · Logistic Regression
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
