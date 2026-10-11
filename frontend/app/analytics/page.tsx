"use client";

import React from "react";
import { useSkillHub } from "@/lib/store";
import { LearningProgressChart } from "@/components/LearningProgressChart";
import { EngagementChart } from "@/components/EngagementChart";
import { RadialProgressGauge } from "@/components/RadialProgressGauge";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import {
  Plus,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  Shield,
  Layers,
  Activity,
  Lock,
} from "lucide-react";

export default function AnalyticsPage() {
  const {
    setIsCreatePostModalOpen,
    analyticsTimeframe,
    setAnalyticsTimeframe,
    students,
    signals,
    cases,
    activeRole,
  } = useSkillHub();

  const timeframes = ["This Week", "This Month", "This Year"] as const;

  const pendingSignals = signals.filter((s) => !s.reviewed_decision);
  const triageActionRate =
    signals.length > 0
      ? Math.round(
          ((signals.length - pendingSignals.length) / signals.length) * 100
        )
      : 100;

  const metricsByTimeframe = {
    "This Week": {
      studentsActive: `${students.length || 6}`,
      studyHours: `${signals.length} Signals`,
      completionRate: `${triageActionRate}%`,
      growth: "+14.2%",
    },
    "This Month": {
      studentsActive: `${students.length || 6}`,
      studyHours: `${signals.length} Signals`,
      completionRate: `${triageActionRate}%`,
      growth: "+8.6%",
    },
    "This Year": {
      studentsActive: `${students.length || 6}`,
      studyHours: `${signals.length} Signals`,
      completionRate: `${triageActionRate}%`,
      growth: "+28.4%",
    },
  };

  const metrics = metricsByTimeframe[analyticsTimeframe] || metricsByTimeframe["This Month"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            Cohort Analytics &amp; Indicators
          </h1>
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
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  analyticsTimeframe === tf
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreatePostModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-sm transition-all min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* Institutional Privacy Badge for Leadership Role */}
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
              You are viewing anonymized aggregate cohort indicators. Individual student records and operational triage queues are suppressed.
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="skill-card bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Students Evaluated
            </span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900">
            {metrics.studentsActive}
          </div>
          <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            <span>Active UG Cohort</span>
          </p>
        </div>

        <div className="skill-card bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Generated Signals
            </span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900">
            {metrics.studyHours}
          </div>
          <p className="text-[10px] text-neutral-400">
            Deterministic rule engine
          </p>
        </div>

        <div className="skill-card bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Closed-Loop Action Rate
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900">
            {metrics.completionRate}
          </div>
          <p className="text-[10px] text-emerald-600 font-medium">
            No Alert Without Action
          </p>
        </div>

        <div className="skill-card bg-white p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Active Cases
            </span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900">
            {cases.length}
          </div>
          <p className="text-[10px] text-neutral-400">
            10-State lifecycle tracked
          </p>
        </div>
      </div>

      {/* 2x2 Grid matching established design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
        {/* Top Left: Learning Progress Overview */}
        <LearningProgressChart />

        {/* Top Right: Student Engagement Trend */}
        <EngagementChart timeframe={analyticsTimeframe} />

        {/* Bottom Left: Course Performance */}
        <RadialProgressGauge />

        {/* Bottom Right: Activity by Day */}
        <ActivityHeatmap />
      </div>
    </div>
  );
}
