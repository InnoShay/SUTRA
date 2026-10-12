"use client";

import React, { useState } from "react";
import { EvidenceCardItem } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  Info,
  Table as TableIcon,
  BarChart2,
  AlertTriangle,
  HelpCircle,
  Scale,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Minus,
} from "lucide-react";

export interface FeatureMetadata {
  label: string;
  unit: string;
  baselineMean?: number;
  category: "participation" | "academic" | "demographic" | "orientation";
  description: string;
}

export const CANONICAL_FEATURE_METADATA: Record<string, FeatureMetadata> = {
  num_of_prev_attempts: {
    label: "Prior Module Attempts",
    unit: "attempts",
    baselineMean: 0.0,
    category: "academic",
    description: "Number of previous attempts on modules within this qualification.",
  },
  studied_credits: {
    label: "Enrolled Course Credits",
    unit: "credits",
    baselineMean: 60.0,
    category: "academic",
    description: "Total credits for modules the student is currently studying.",
  },
  days_registered_before_start: {
    label: "Registration Lead Time",
    unit: "days",
    baselineMean: -32.0,
    category: "orientation",
    description: "Days between course registration date and formal module start date.",
  },
  has_missing_registration_date: {
    label: "Missing Registration Timestamp Flag",
    unit: "flag",
    baselineMean: 0.0,
    category: "orientation",
    description: "Indicator of incomplete or retroactive registration logging.",
  },
  vle_total_clicks_d30: {
    label: "Total LMS Activity Clicks",
    unit: "clicks",
    baselineMean: 142.0,
    category: "participation",
    description: "Cumulative virtual learning platform clicks up to Day 30.",
  },
  vle_active_days_d30: {
    label: "Active LMS Learning Days",
    unit: "days",
    baselineMean: 8.0,
    category: "participation",
    description: "Distinct calendar days with recorded virtual learning activity by Day 30.",
  },
  vle_clicks_precourse: {
    label: "Pre-Course Portal Clicks",
    unit: "clicks",
    baselineMean: 24.0,
    category: "orientation",
    description: "Interaction clicks on virtual learning site prior to module start date.",
  },
  vle_clicks_poststart_d30: {
    label: "Post-Start LMS Clicks",
    unit: "clicks",
    baselineMean: 118.0,
    category: "participation",
    description: "LMS interaction clicks between Day 0 and Day 30.",
  },
  vle_clicks_last_7d: {
    label: "LMS Clicks (Recent 7 Days)",
    unit: "clicks",
    baselineMean: 12.0,
    category: "participation",
    description: "LMS interaction velocity during the final 7 days before cutoff.",
  },
  vle_days_since_last_click: {
    label: "Days Inactive Since Last LMS Login",
    unit: "days",
    baselineMean: 6.0,
    category: "participation",
    description: "Recency gap in days since the most recent platform interaction.",
  },
  vle_clicks_forumng_d30: {
    label: "Discussion Forum Clicks",
    unit: "clicks",
    baselineMean: 18.0,
    category: "participation",
    description: "Interactions with module forums and collaborative discussion boards.",
  },
  vle_clicks_oucontent_d30: {
    label: "Course Material Reading Clicks",
    unit: "clicks",
    baselineMean: 82.0,
    category: "participation",
    description: "Visits and reading interactions with core learning content.",
  },
  vle_clicks_quiz_d30: {
    label: "Practice Quiz Clicks",
    unit: "clicks",
    baselineMean: 0.0,
    category: "participation",
    description: "Self-assessment interactive practice quizzes accessed.",
  },
  vle_clicks_homepage_d30: {
    label: "Portal Homepage Visits",
    unit: "visits",
    baselineMean: 28.0,
    category: "participation",
    description: "Navigations to the student course homepage.",
  },
  vle_clicks_other_d30: {
    label: "Supplementary Resource Access",
    unit: "clicks",
    baselineMean: 14.0,
    category: "participation",
    description: "Interactions with supplementary module tools and external links.",
  },
  has_vle_activity_d30: {
    label: "Any LMS Activity Logged Flag",
    unit: "flag",
    baselineMean: 1.0,
    category: "participation",
    description: "Binary indicator of whether student logged into LMS by Day 30.",
  },
  assessments_submitted_d30: {
    label: "Formative Assessments Handed In",
    unit: "submissions",
    baselineMean: 1.0,
    category: "academic",
    description: "Count of formative coursework submissions completed by Day 30.",
  },
  assessment_banked_d30: {
    label: "Banked Prior Credit Submissions",
    unit: "submissions",
    baselineMean: 0.0,
    category: "academic",
    description: "Submissions transferred or credited from prior module enrollments.",
  },
  has_early_assessment_submission_d30: {
    label: "Early Assignment Hand-In Flag",
    unit: "flag",
    baselineMean: 1.0,
    category: "academic",
    description: "Indicator of early assessment submission ahead of formal deadline.",
  },
  highest_education: {
    label: "Highest Prior Education",
    unit: "category",
    category: "demographic",
    description: "Highest academic credential achieved prior to entry.",
  },
  imd_band: {
    label: "Index of Multiple Deprivation Band",
    unit: "quintile",
    category: "demographic",
    description: "Socioeconomic geographic indicator based on postal code.",
  },
  age_band: {
    label: "Age Band",
    unit: "category",
    category: "demographic",
    description: "Age bracket at module commencement.",
  },
  disability: {
    label: "Declared Disability Status",
    unit: "indicator",
    category: "demographic",
    description: "Self-declared accessibility support indicator.",
  },
  gender: {
    label: "Gender Category",
    unit: "category",
    category: "demographic",
    description: "Demographic gender classification.",
  },
  region: {
    label: "Geographic Region",
    unit: "region",
    category: "demographic",
    description: "Geographic territory of residence during study.",
  },
};

export interface ProcessedAttribution {
  feature: string;
  label: string;
  rawFeature: string;
  value: any;
  formattedValue: string;
  attribution: number;
  direction: "risk_driver" | "protective" | "neutral";
  baselineMean?: number;
  unit: string;
  category: string;
  sharePercent: number;
}

export interface FeatureAttributionChartProps {
  attributions?: EvidenceCardItem[] | null;
  modelName?: string | null;
  modelVersion?: string | null;
  threshold?: number | null;
  isSynthetic?: boolean;
  className?: string;
}

export function FeatureAttributionChart({
  attributions,
  modelName = "Logistic Regression Baseline",
  modelVersion = "1.0.0",
  threshold = 0.46,
  isSynthetic = false,
  className = "",
}: FeatureAttributionChartProps) {
  const [activeTab, setActiveTab] = useState<"diverging" | "drivers" | "protective" | "table">("diverging");
  const [showExplanation, setShowExplanation] = useState(false);

  // 1. Safe extraction and handling of empty / missing data
  if (!attributions || !Array.isArray(attributions) || attributions.length === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-3 ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-neutral-200">No Feature Attributions Supplied</h4>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            The model service did not return feature attributions for this prediction record.
            Attribution values are never fabricated or estimated in the browser.
          </p>
        </div>
      </div>
    );
  }

  // 2. Sanitize and categorize attributions safely
  const validItems: ProcessedAttribution[] = attributions
    .map((item) => {
      const rawFeature = String(item.feature || "unknown_feature");
      const meta = CANONICAL_FEATURE_METADATA[rawFeature] || {
        label: rawFeature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        unit: "value",
        category: "participation",
        description: "Observed student telemetry metric.",
      };

      // Safely parse attribution number
      let attrNum = 0.0;
      if (typeof item.attribution === "number" && !isNaN(item.attribution) && isFinite(item.attribution)) {
        attrNum = item.attribution;
      }

      // Format observed value
      let formattedVal = "-";
      if (item.value !== null && item.value !== undefined) {
        if (typeof item.value === "number") {
          formattedVal = Number.isInteger(item.value) ? item.value.toString() : item.value.toFixed(1);
        } else if (typeof item.value === "boolean") {
          formattedVal = item.value ? "Yes (1)" : "No (0)";
        } else {
          formattedVal = String(item.value);
        }
      }

      // Determine directional role safely
      let direction: "risk_driver" | "protective" | "neutral" = "neutral";
      if (Math.abs(attrNum) < 1e-5) {
        direction = "neutral";
      } else if (attrNum > 0 || item.direction === "increases_risk") {
        direction = "risk_driver";
      } else {
        direction = "protective";
      }

      return {
        feature: rawFeature,
        label: meta.label,
        rawFeature,
        value: item.value,
        formattedValue: formattedVal,
        attribution: attrNum,
        direction,
        baselineMean: meta.baselineMean,
        unit: meta.unit,
        category: meta.category,
        sharePercent: 0,
      };
    })
    .filter((item) => item.feature !== "unknown_feature");

  if (validItems.length === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-2 ${className}`}>
        <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" />
        <p className="text-xs text-neutral-300">No valid feature attribution values could be resolved.</p>
      </div>
    );
  }

  // 3. Compute relative scale and totals
  const totalAbsAttribution = validItems.reduce((acc, curr) => acc + Math.abs(curr.attribution), 0);
  validItems.forEach((item) => {
    item.sharePercent = totalAbsAttribution > 0 ? (Math.abs(item.attribution) / totalAbsAttribution) * 100 : 0;
  });

  const riskDrivers = validItems.filter((i) => i.direction === "risk_driver");
  const protectiveFactors = validItems.filter((i) => i.direction === "protective");
  const neutralFactors = validItems.filter((i) => i.direction === "neutral");

  const totalRiskImpact = riskDrivers.reduce((acc, curr) => acc + curr.attribution, 0);
  const totalProtectiveImpact = protectiveFactors.reduce((acc, curr) => acc + Math.abs(curr.attribution), 0);
  const netLogOdds = totalRiskImpact - totalProtectiveImpact;

  // Scaling baseline for diverging bars (clamped against extreme outliers)
  const maxAbsMagnitude = Math.max(...validItems.map((i) => Math.abs(i.attribution)), 0.1);
  const hasOutlier = maxAbsMagnitude > 4.0;

  return (
    <div className={`p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-5 text-white ${className}`}>
      {/* Header with Title, Model Info, and Units */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold tracking-tight text-neutral-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-violet-400" />
              Feature Attribution Decomposition
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800/60">
              Unit: Δ Log-Odds
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Method: Linear Log-Odds Decomposition ({modelName} v{modelVersion}) relative to Cohort Baseline Mean
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("diverging")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "diverging"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            aria-label="View diverging bar chart"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Diverging Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("drivers")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "drivers"
                ? "bg-rose-900/80 text-rose-200 border border-rose-700/60"
                : "text-neutral-400 hover:text-rose-300"
            }`}
            aria-label="View risk drivers only"
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            <span>Risk Drivers ({riskDrivers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("protective")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "protective"
                ? "bg-emerald-900/80 text-emerald-200 border border-emerald-700/60"
                : "text-neutral-400 hover:text-emerald-300"
            }`}
            aria-label="View protective factors only"
          >
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Protective ({protectiveFactors.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("table")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "table"
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            aria-label="View accessible data table"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Attribution Balance Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40">
          <div className="flex items-center justify-between text-xs text-rose-400">
            <span className="font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Total Risk Drivers
            </span>
            <span className="font-mono font-bold">+{totalRiskImpact.toFixed(2)} Δ logit</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">
            {riskDrivers.length} factor{riskDrivers.length === 1 ? "" : "s"} elevating risk above cohort mean
          </p>
        </div>

        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="font-semibold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Total Protective Offset
            </span>
            <span className="font-mono font-bold">-{totalProtectiveImpact.toFixed(2)} Δ logit</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">
            {protectiveFactors.length} protective factor{protectiveFactors.length === 1 ? "" : "s"} lowering risk
          </p>
        </div>

        <div className="p-3 rounded-xl bg-neutral-950/50 border border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-300">
            <span className="font-semibold flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-violet-400" /> Net Telemetry Shift
            </span>
            <span
              className={`font-mono font-bold ${
                netLogOdds > 0 ? "text-rose-400" : netLogOdds < 0 ? "text-emerald-400" : "text-neutral-400"
              }`}
            >
              {netLogOdds >= 0 ? `+${netLogOdds.toFixed(2)}` : netLogOdds.toFixed(2)} Δ logit
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">
            Net directional shift from centered cohort baseline
          </p>
        </div>
      </div>

      {/* Outlier Warning Indicator if present */}
      {hasOutlier && (
        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center gap-2 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            One or more telemetry features exhibit high-magnitude log-odds weights (&gt; 4.0). Visual bar scaling has been clamped for readability.
          </span>
        </div>
      )}

      {/* Main Visual Display */}
      {activeTab === "diverging" && (
        <div className="space-y-4 pt-2">
          {/* Axis Legend Header */}
          <div className="grid grid-cols-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-1 text-emerald-400 justify-end pr-6">
              <ArrowLeft className="w-3 h-3" />
              <span>Protective Factors (Decreases Risk)</span>
            </div>
            <div className="flex items-center gap-1 text-rose-400 pl-6">
              <span>Risk Drivers (Increases Risk)</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Diverging Bar List */}
          <div className="space-y-3" role="list" aria-label="Feature attribution diverging bars">
            {validItems.map((item, idx) => {
              const absVal = Math.abs(item.attribution);
              const barWidthPct = Math.min(100, Math.max(3, (absVal / maxAbsMagnitude) * 100));

              return (
                <div
                  key={idx}
                  className="group relative p-2.5 rounded-xl bg-neutral-950/40 hover:bg-neutral-950/80 border border-neutral-800/70 transition-colors"
                  role="listitem"
                >
                  {/* Feature Label and Canonical Key */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-100">{item.label}</span>
                      <code className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {item.rawFeature}
                      </code>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
                      <span>
                        Observed: <strong className="text-neutral-200">{item.formattedValue}</strong> {item.unit}
                      </span>
                      {item.baselineMean !== undefined && (
                        <span className="text-neutral-500">
                          (Cohort Mean: {item.baselineMean})
                        </span>
                      )}
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          item.direction === "risk_driver"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                            : item.direction === "protective"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {item.direction === "risk_driver" ? `+${item.attribution.toFixed(2)}` : item.attribution.toFixed(2)} Δ
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Diverging Bar Track */}
                  <div className="relative h-6 w-full rounded-md bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center">
                    {/* Centered Zero Guideline */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-neutral-600 z-10" />

                    {/* Left Half (Protective / Negative Contributions) */}
                    <div className="w-1/2 h-full flex justify-end items-center pr-0.5">
                      {item.direction === "protective" && (
                        <div
                          className="h-4 rounded-l bg-gradient-to-l from-emerald-500 to-emerald-600 transition-all duration-300 relative group-hover:brightness-110 flex items-center justify-start pl-2"
                          style={{ width: `${barWidthPct}%` }}
                          aria-label={`Protective factor: -${absVal.toFixed(2)} log-odds`}
                        >
                          {barWidthPct > 20 && (
                            <span className="text-[9px] font-mono font-bold text-emerald-950">
                              -{absVal.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Half (Risk Drivers / Positive Contributions) */}
                    <div className="w-1/2 h-full flex justify-start items-center pl-0.5">
                      {item.direction === "risk_driver" && (
                        <div
                          className="h-4 rounded-r bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-300 relative group-hover:brightness-110 flex items-center justify-end pr-2"
                          style={{ width: `${barWidthPct}%` }}
                          aria-label={`Risk driver: +${absVal.toFixed(2)} log-odds`}
                        >
                          {barWidthPct > 20 && (
                            <span className="text-[9px] font-mono font-bold text-rose-950">
                              +{absVal.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                      {item.direction === "neutral" && (
                        <div className="flex items-center gap-1 pl-2 text-[10px] text-neutral-500 italic">
                          <Minus className="w-3 h-3" /> Baseline reference (0.00)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtered View: Risk Drivers Only */}
      {activeTab === "drivers" && (
        <div className="space-y-3 pt-2">
          {riskDrivers.length > 0 ? (
            <div className="space-y-2">
              {riskDrivers.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-100">{item.label}</span>
                      <code className="text-[10px] font-mono px-1 rounded bg-neutral-800 text-neutral-300">
                        {item.rawFeature}
                      </code>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Observed: <strong className="text-neutral-200">{item.formattedValue}</strong> {item.unit}{" "}
                      {item.baselineMean !== undefined && `• Cohort Mean: ${item.baselineMean}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded"
                        style={{ width: `${Math.min(100, (item.attribution / maxAbsMagnitude) * 100)}%` }}
                      />
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800/80">
                      +{item.attribution.toFixed(2)} Δ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic py-4 text-center">
              No significant risk-elevating telemetry factors identified for this student record.
            </p>
          )}
        </div>
      )}

      {/* Filtered View: Protective Factors Only */}
      {activeTab === "protective" && (
        <div className="space-y-3 pt-2">
          {protectiveFactors.length > 0 ? (
            <div className="space-y-2">
              {protectiveFactors.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-100">{item.label}</span>
                      <code className="text-[10px] font-mono px-1 rounded bg-neutral-800 text-neutral-300">
                        {item.rawFeature}
                      </code>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Observed: <strong className="text-neutral-200">{item.formattedValue}</strong> {item.unit}{" "}
                      {item.baselineMean !== undefined && `• Cohort Mean: ${item.baselineMean}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded"
                        style={{ width: `${Math.min(100, (Math.abs(item.attribution) / maxAbsMagnitude) * 100)}%` }}
                      />
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                      {item.attribution.toFixed(2)} Δ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic py-4 text-center">
              Telemetry does not yet reflect strong protective engagement markers relative to cohort average.
            </p>
          )}
        </div>
      )}

      {/* Accessible Structured Audit Table View */}
      {activeTab === "table" && (
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse" aria-label="Model Feature Attributions Audit Table">
            <caption className="sr-only">
              Comprehensive tabular breakdown of machine learning model feature attributions, showing canonical identifier, observed values, directions, and log-odds contributions.
            </caption>
            <thead>
              <tr className="border-b border-neutral-800 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                <th scope="col" className="pb-2">Feature Name & Identifier</th>
                <th scope="col" className="pb-2">Observed Value</th>
                <th scope="col" className="pb-2">Cohort Baseline Mean</th>
                <th scope="col" className="pb-2">Direction</th>
                <th scope="col" className="pb-2 text-right">Log-Odds Impact (Δ logit)</th>
                <th scope="col" className="pb-2 text-right">Relative Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {validItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-neutral-950/40">
                  <td className="py-2.5 pr-2 font-sans">
                    <div className="font-semibold text-neutral-200">{item.label}</div>
                    <div className="text-[10px] font-mono text-neutral-400">{item.rawFeature}</div>
                  </td>
                  <td className="py-2.5 text-neutral-300">
                    {item.formattedValue} {item.unit}
                  </td>
                  <td className="py-2.5 text-neutral-400">
                    {item.baselineMean !== undefined ? `${item.baselineMean} ${item.unit}` : "N/A"}
                  </td>
                  <td className="py-2.5 font-sans">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.direction === "risk_driver"
                          ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                          : item.direction === "protective"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {item.direction === "risk_driver" && <TrendingUp className="w-3 h-3" />}
                      {item.direction === "protective" && <TrendingDown className="w-3 h-3" />}
                      {item.direction === "risk_driver"
                        ? "Risk Driver"
                        : item.direction === "protective"
                        ? "Protective Factor"
                        : "Baseline Neutral"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-bold">
                    <span
                      className={
                        item.direction === "risk_driver"
                          ? "text-rose-400"
                          : item.direction === "protective"
                          ? "text-emerald-400"
                          : "text-neutral-400"
                      }
                    >
                      {item.direction === "risk_driver" ? `+${item.attribution.toFixed(2)}` : item.attribution.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-neutral-400">
                    {item.sharePercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Attribution Semantics & Governance Notice */}
      <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2 text-[11px] text-neutral-400">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
            What do positive (+) and negative (-) attribution directions mean?
          </span>
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-[10px] text-violet-400 hover:text-violet-300 underline"
          >
            {showExplanation ? "Hide guidance" : "Read explanation"}
          </button>
        </div>

        {showExplanation && (
          <div className="space-y-2 pt-1 text-neutral-400 leading-relaxed border-t border-neutral-800/60">
            <p>
              In SUTRA&apos;s Day-30 early warning model, each numerical telemetry metric contributes to the student&apos;s log-odds of requiring academic intervention according to linear coefficient weighting relative to historical cohort averages:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded bg-rose-950/20 border border-rose-900/30 text-rose-300">
                <strong>Positive (+Δ Log-Odds):</strong> Indicates that the observed metric (e.g. low recent clicks or multiple prior attempts) shifted the model&apos;s logit score upward, elevating the predicted risk relative to cohort mean baseline.
              </div>
              <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/30 text-emerald-300">
                <strong>Negative (-Δ Log-Odds):</strong> Indicates that the observed metric (e.g. frequent logins or early coursework hand-in) shifted the model&apos;s logit score downward, acting as a protective factor.
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-1.5 text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/60">
          <ShieldAlert className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong className="text-neutral-300">Non-Causal Statistical Association:</strong> Feature attributions reflect correlation within the calibrated linear model. They do <em>NOT</em> establish causal mechanisms or prove that a metric caused a student to become at risk. Institutional advisors must use qualitative judgment alongside model signals.
          </span>
        </div>
      </div>
    </div>
  );
}
