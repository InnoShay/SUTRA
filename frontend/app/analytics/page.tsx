"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { api } from "@/lib/api";
import { CohortAnalyticsSummaryResponse } from "@/lib/types";
import { LearningProgressChart } from "@/components/LearningProgressChart";
import { RadialProgressGauge } from "@/components/RadialProgressGauge";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { CohortRiskDistributionChart } from "@/components/analytics/CohortRiskDistributionChart";
import { CohortComparisonTable } from "@/components/analytics/CohortComparisonTable";
import { MultiTierTrendChart } from "@/components/analytics/MultiTierTrendChart";
import { ModelPerformanceDashboard } from "@/components/analytics/ModelPerformanceDashboard";
import HistoricalRiskTrendsDashboard from "@/components/analytics/HistoricalRiskTrendsDashboard";
import {
  computeCaseStateDistribution,
  computeInterventionDistribution,
  computeRiskAttributions,
  computeAnalyticsOperationalCards,
  computeCohortRiskDistribution,
  computeCohortBreakdown,
} from "@/lib/analytics-selectors";
import {
  Users,
  CheckCircle2,
  Layers,
  Activity,
  Lock,
  Download,
  Filter,
  RefreshCw,
  Info,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  History,
  Heart,
} from "lucide-react";
import CounselorAnalyticsPage from "../counselor/analytics/page";
import { HappinessAnalyticsView } from "@/components/happiness/HappinessAnalyticsView";


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

  const timeframes = ["This Week", "This Month", "This Year"] as const;

  // Filter States (Requirement 5)
  const [analyticsTab, setAnalyticsTab] = useState<"cohort" | "model_performance" | "historical_trends" | "happiness_index">("cohort");
  const [selectedCohort, setSelectedCohort] = useState<string>("");
  const [selectedRiskTier, setSelectedRiskTier] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());

  // Listen to ?tab=model-performance, ?tab=historical-trends, or ?tab=happiness URL search parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "model-performance") {
        setAnalyticsTab("model_performance");
      } else if (params.get("tab") === "historical-trends") {
        setAnalyticsTab("historical_trends");
      } else if (params.get("tab") === "happiness" || params.get("tab") === "happiness-index") {
        setAnalyticsTab("happiness_index");
      }
    }
  }, []);

  // Server Analytics Response State
  const [serverAnalytics, setServerAnalytics] = useState<CohortAnalyticsSummaryResponse | null>(null);

  // Available cohorts list derived dynamically from enrolled students
  const availableCohorts = Array.from(
    new Set(students.map((s) => s.cohort_code || (s as any).course).filter((c): c is string => Boolean(c)))
  ).sort();

  // Fetch verified cohort analytics from backend API
  const fetchCohortAnalytics = async () => {
    setIsRefreshing(true);
    try {
      const summary = await api.analytics.getCohortSummary({
        cohort: selectedCohort || undefined,
        timeframe: analyticsTimeframe.toLowerCase().replace(" ", "_"),
      });
      setServerAnalytics(summary);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn("Could not fetch server cohort analytics, using client selector engine:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCohortAnalytics();
  }, [selectedCohort, analyticsTimeframe, backendConnected]);

  if (activeRole === "student") {
    return (
      <div className="p-8 max-w-lg mx-auto bg-white rounded-3xl border border-neutral-200 shadow-sm text-center space-y-4 my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900 font-heading">
          Institutional Analytics Restricted
        </h2>
        <p className="text-xs text-neutral-600 leading-relaxed">
          Aggregated analytics and institutional reporting are restricted to authorized faculty, counselors, and administrators. Please visit your student dashboard to complete your weekly check-in or view your support cases.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
        >
          <span>Return to Student Overview</span>
        </Link>
      </div>
    );
  }

  if (activeRole === "counselor") {
    return <CounselorAnalyticsPage />;
  }

  const isLeadership = activeRole === "leadership";

  // Filter students by selected cohort for client-side fallback/context
  const scopedStudents = selectedCohort
    ? students.filter((s) => (s.cohort_code || (s as any).course) === selectedCohort)
    : students;

  // Compute verified operational metrics through deterministic selector engine
  const clientRiskDist = computeCohortRiskDistribution(scopedStudents, [], isLeadership);
  const clientCohortBreakdown = computeCohortBreakdown(students, [], isLeadership);
  const caseDistribution = computeCaseStateDistribution(cases);
  const interventionDistribution = computeInterventionDistribution(cases);
  const riskAttributions = computeRiskAttributions(signals);
  const operationalCards = computeAnalyticsOperationalCards(
    signals,
    cases,
    scopedStudents,
    activeRole,
    backendConnected,
    analyticsTimeframe
  );

  // Effective aggregated risk data (server response preferred, fallback to client engine)
  const effectiveRiskDistribution = serverAnalytics?.risk_distribution || clientRiskDist;
  const effectiveCohortBreakdown = serverAnalytics?.cohort_breakdown || clientCohortBreakdown;
  const effectiveTimeline = serverAnalytics?.trend_timeline || [];

  return (
    <div className="space-y-6">
      {/* 1. Header with Controls, Filters & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Cohort Risk Analytics &amp; Indicators
            </h1>
            <span className="text-[11px] font-mono text-neutral-400">
              ({dataProvenance === "live" ? "Live Telemetry" : "Demo Snapshot"})
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Aggregated institutional indicators, cohort risk distribution, and support workflow trends
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Segmented Control */}
          <div className="flex items-center p-0.5 bg-neutral-100/90 rounded-xl border border-neutral-200/60">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setAnalyticsTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${analyticsTimeframe === tf
                  ? "bg-white text-neutral-900 shadow-2xs border border-neutral-200/60 font-bold"
                  : "text-neutral-500 hover:text-neutral-800"
                  }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchCohortAnalytics}
            disabled={isRefreshing}
            title={`Last refreshed at ${lastRefreshedAt}`}
            className="p-2 rounded-xl border border-neutral-200/80 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-neutral-900" : ""}`} />
          </button>

          {/* Print / Export Report */}
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.print();
              }
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-sm transition-all min-h-[36px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Audit Report</span>
          </button>
        </div>
      </div>

      {/* View Switcher: Cohort Risk Analytics vs Model Performance Dashboard */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setAnalyticsTab("cohort")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${analyticsTab === "cohort"
            ? "bg-neutral-900 text-white shadow-xs"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
            }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Cohort Risk Analytics</span>
        </button>

        <button
          onClick={() => setAnalyticsTab("model_performance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${analyticsTab === "model_performance"
            ? "bg-neutral-900 text-white shadow-xs"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
            }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Model Performance &amp; Evaluation</span>
        </button>

        <button
          onClick={() => setAnalyticsTab("historical_trends")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            analyticsTab === "historical_trends"
              ? "bg-neutral-900 text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historical Trends &amp; Monitoring</span>
        </button>

        <button
          onClick={() => setAnalyticsTab("happiness_index")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            analyticsTab === "happiness_index"
              ? "bg-neutral-900 text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>Happiness Index</span>
        </button>
      </div>

      {analyticsTab === "happiness_index" ? (
        <HappinessAnalyticsView roleScope="admin" />
      ) : analyticsTab === "model_performance" ? (
        <ModelPerformanceDashboard />
      ) : analyticsTab === "historical_trends" ? (
        <HistoricalRiskTrendsDashboard
          availableCohorts={availableCohorts}
          selectedCohort={selectedCohort}
          onSelectCohort={setSelectedCohort}
        />
      ) : (
        <>
          {/* 2. Interactive Filter Bar (Requirement 5) */}
          <div className="p-3.5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-neutral-500 font-semibold">
                <Filter className="w-3.5 h-3.5 text-neutral-400" />
                <span>Scope Filters:</span>
              </div>

              {/* Cohort Dropdown */}
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="">All Enrolled Cohorts ({students.length} students)</option>
                {availableCohorts.map((c) => (
                  <option key={c} value={c}>
                    Cohort: {c}
                  </option>
                ))}
              </select>

              {/* Risk Tier Filter */}
              <select
                value={selectedRiskTier}
                onChange={(e) => setSelectedRiskTier(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="all">All Risk Tiers</option>
                <option value="at_risk">At-Risk Only (≥ 0.46)</option>
                <option value="on_track">On-Track Only (&lt; 0.46)</option>
              </select>
            </div>

            {/* Reporting Metadata */}
            <div className="text-[11px] text-neutral-400 flex items-center gap-3">
              <span>Reporting as-of: <strong className="text-neutral-700">{lastRefreshedAt}</strong></span>
              <span>Scope: <strong className="text-neutral-700">{selectedCohort ? selectedCohort : "Campus-Wide"}</strong></span>
            </div>
          </div>

          {/* 3. Institutional Privacy Safeguard Badge (ADR-004, Requirement 8) */}
          {isLeadership && (
            <div className="p-4 bg-white rounded-3xl border border-amber-200/80 flex items-center gap-3 text-xs shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <span>Institutional Privacy Mode Active (ADR-004)</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-amber-100 text-amber-800 font-semibold">
                    k &ge; 5 Small-Group Protection
                  </span>
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  You are viewing anonymized aggregate indicators. Individual student rosters, student 360 profiles, and operational triage queues are suppressed. Subgroups with fewer than 5 students are automatically masked.
                </div>
              </div>
            </div>
          )}

          {/* 4. Verified Dynamic Operational Summary Cards */}
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
                {serverAnalytics?.total_students_in_scope ?? operationalCards.studentsInScope.value}
              </div>
              <p className="text-[10px] text-neutral-500 font-medium">
                {serverAnalytics ? `${serverAnalytics.evaluated_students_count} evaluated (${serverAnalytics.coverage_percentage}%)` : operationalCards.studentsInScope.sublabel}
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

          {/* 5. Phase 5 Primary Visualizations Row 1: Cohort Risk Distribution & Multi-Tier Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
            {/* Cohort Risk Distribution (Requirements 1, 6 & 7) */}
            <CohortRiskDistributionChart
              riskDistribution={effectiveRiskDistribution}
              totalStudents={serverAnalytics?.total_students_in_scope ?? scopedStudents.length}
              evaluatedStudents={serverAnalytics?.evaluated_students_count ?? clientRiskDist.evaluatedStudentsCount}
              coveragePercentage={serverAnalytics?.coverage_percentage ?? clientRiskDist.coveragePercentage}
              totalPredictionRuns={serverAnalytics?.total_prediction_runs ?? clientRiskDist.totalPredictionRuns}
            />

            {/* Multi-Tier Trends: Predictions vs Signals vs Cases vs Outcomes (Requirement 3) */}
            <MultiTierTrendChart
              timeline={effectiveTimeline}
              timeframe={analyticsTimeframe}
            />
          </div>

          {/* 6. Phase 5 Secondary Visualizations Row 2: Cohort Comparison & Case Machine Lifecycle */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
            {/* Cohort Comparison Table with ADR-004 small-group masking (Requirements 2 & 8) */}
            <CohortComparisonTable
              cohorts={effectiveCohortBreakdown}
              selectedCohort={selectedCohort}
              onSelectCohort={(cohortCode) => {
                setSelectedCohort(selectedCohort === cohortCode ? "" : cohortCode);
              }}
            />

            {/* 10-State Case Machine Lifecycle Distribution (Requirement 4) */}
            <LearningProgressChart distribution={caseDistribution} />
          </div>

          {/* 7. Tertiary Visualizations Row 3: Intervention Allocation & Observation Ingestion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
            {/* Intervention Protocol Allocation Gauge across 4 canonical keys (Requirement 4) */}
            <RadialProgressGauge distribution={interventionDistribution} />

            {/* Policy Triggers & Observation Ingestion Audit */}
            <ActivityHeatmap
              attributions={riskAttributions}
              backendConnected={backendConnected}
            />
          </div>

          {/* 8. Mandatory Non-Causal Governance Disclaimers Banner */}
          <div className="p-4 bg-neutral-50 rounded-3xl border border-neutral-200/80 space-y-2 text-xs text-neutral-600">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>SUTRA Governance Mandates &amp; Non-Causal Disclaimers</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-neutral-500 leading-relaxed">
              <li>
                <strong>Accuracy Disclaimer:</strong> Case counts reflect proactive educator support workflow velocity and must <em>never</em> be interpreted as a measure of model accuracy.
              </li>
              <li>
                <strong>Efficacy Disclaimer:</strong> Intervention counts reflect assigned student support protocols and do <em>not</em> prove causal treatment effectiveness without randomized control trials.
              </li>
              <li>
                <strong>Statistical Disclaimer:</strong> Early-warning scores represent statistical disengagement likelihood from Day-30 OULAD features, not student character, intelligence, or academic capability.
              </li>
              <li>
                <strong>Privacy Safeguard:</strong> Cells or subgroups with fewer than 5 students are automatically masked under ADR-004 k-anonymity rules in aggregate views.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

