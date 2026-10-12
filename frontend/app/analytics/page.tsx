"use client";

import React from "react";
import { useSkillHub } from "@/lib/store";
import { LearningProgressChart } from "@/components/LearningProgressChart";
import { EngagementChart } from "@/components/EngagementChart";
import { RadialProgressGauge } from "@/components/RadialProgressGauge";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import {
  computeCaseStateDistribution,
  computeInterventionDistribution,
  computeSignalTimeline,
  computeRiskAttributions,
  computeAnalyticsOperationalCards,
} from "@/lib/analytics-selectors";
import {
  Users,
  CheckCircle2,
  TrendingUp,
  Layers,
  Activity,
  Lock,
  Download,
  AlertTriangle,
} from "lucide-react";
import CounselorAnalyticsPage from "../counselor/analytics/page";

export default function AnalyticsPage() {
  const {
    analyticsTimeframe,
    setAnalyticsTimeframe,
    students,
    signals,
    cases,
    activeRole,
    backendConnected,
    dataProvenance,
  } = useSkillHub();

  if (activeRole === "counselor") {
    return <CounselorAnalyticsPage />;
  }

  const timeframes = ["This Week", "This Month", "This Year"] as const;

  // Compute verified operational metrics through deterministic selector engine
  const caseDistribution = computeCaseStateDistribution(cases);
  const interventionDistribution = computeInterventionDistribution(cases);
  const signalTimeline = computeSignalTimeline(signals, analyticsTimeframe);
  const riskAttributions = computeRiskAttributions(signals);
  const operationalCards = computeAnalyticsOperationalCards(
    signals,
    cases,
    students,
    activeRole,
    backendConnected,
    analyticsTimeframe
  );

  return (
    <div className="space-y-6">
      {/* 1. Header with Timeframe Pill Switcher & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Cohort Analytics &amp; Indicators
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Aggregated institutional indicators, intervention velocity, and multi-campus retention rhythms
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Timeframe Pill Switcher */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-full border border-neutral-200/50">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setAnalyticsTimeframe(tf)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${analyticsTimeframe === tf
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                  }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.print();
              }
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-sm transition-all min-h-[40px]"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Audit Report</span>
          </button>
        </div>
      </div>

      {/* 2. Institutional Privacy Safeguard Badge (ADR-004) */}
      {activeRole === "leadership" && (
        <div className="p-4 bg-white rounded-3xl border border-neutral-200/80 flex items-center gap-3 text-xs shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-neutral-900">
              Institutional Privacy Mode Active (ADR-004)
            </div>
            <div className="text-neutral-500 text-[11px]">
              You are viewing anonymized aggregate cohort indicators. Individual student rosters, student 360 views, and operational triage queues are suppressed.
            </div>
          </div>
        </div>
      )}

      {/* 3. Verified Dynamic Operational Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Students in Scope */}
        <div className="skill-card bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {operationalCards.studentsInScope.label}
            </span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900">
            {operationalCards.studentsInScope.value}
          </div>
          <p className="text-[10px] text-neutral-500 font-medium">
            {operationalCards.studentsInScope.sublabel}
          </p>
        </div>

        {/* Card 2: Generated Signals */}
        <div className="skill-card bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {operationalCards.signalsGenerated.label}
            </span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900">
            {operationalCards.signalsGenerated.value}
          </div>
          <p className="text-[10px] text-neutral-500 font-medium">
            {operationalCards.signalsGenerated.sublabel}
          </p>
        </div>

        {/* Card 3: Closed-Loop Action Rate */}
        <div className="skill-card bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {operationalCards.triageReviewRate.label}
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900">
            {operationalCards.triageReviewRate.value}
          </div>
          <p className="text-[10px] text-neutral-500 font-medium">
            {operationalCards.triageReviewRate.sublabel}
          </p>
        </div>

        {/* Card 4: Active Support Cases */}
        <div className="skill-card bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {operationalCards.activeCases.label}
            </span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900">
            {operationalCards.activeCases.value}
          </div>
          <p className="text-[10px] text-neutral-500 font-medium">
            {operationalCards.activeCases.sublabel}
          </p>
        </div>
      </div>

      {/* 4. 2x2 Grid with Operational Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
        {/* Top Left: 10-State Case Lifecycle Distribution */}
        <LearningProgressChart distribution={caseDistribution} />

        {/* Top Right: Signal Generation Velocity & Telemetry */}
        <EngagementChart
          timeline={signalTimeline}
          timeframe={analyticsTimeframe}
          title="Signal Generation & Evaluation Velocity"
        />

        {/* Bottom Left: Intervention Protocol Allocation */}
        <RadialProgressGauge distribution={interventionDistribution} />

        {/* Bottom Right: Observation Ingestion & Policy Risk Drivers */}
        <ActivityHeatmap
          attributions={riskAttributions}
          backendConnected={backendConnected}
        />
      </div>
    </div>
  );
}
