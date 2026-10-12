"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { HappinessIndexSummaryCard } from "./HappinessIndexSummaryCard";
import { HappinessWeeklyTrendChart } from "./HappinessWeeklyTrendChart";
import { HappinessDimensionBreakdown } from "./HappinessDimensionBreakdown";
import {
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Heart,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

interface HappinessAnalyticsViewProps {
  roleScope?: "admin" | "counselor" | "faculty";
}

export function HappinessAnalyticsView({
  roleScope = "admin",
}: HappinessAnalyticsViewProps) {
  const {
    happinessAggregate,
    happinessTrends,
    refreshHappinessData,
  } = useSkillHub();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshHappinessData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Institutional Improvement Initiatives (Section 3C: "Review the status of approved improvement initiatives")
  const approvedInitiatives = [
    {
      id: "init-1",
      title: "Mid-Term Workload Rebalancing Review",
      dimension: "Academic Experience",
      targetScope: "Cohort CS-Y2",
      status: "In Progress",
      lead: "Academic Affairs Committee",
      progress: 65,
    },
    {
      id: "init-2",
      title: "Evening Peer Mentorship Study Circles",
      dimension: "Belonging & Community",
      targetScope: "Campus-Wide",
      status: "Active",
      lead: "Dean of Student Welfare",
      progress: 90,
    },
    {
      id: "init-3",
      title: "Advisory Channel Directory & Awareness Drive",
      dimension: "Support & Trust",
      targetScope: "First & Second Year Cohorts",
      status: "Under Review",
      lead: "Student Counseling Center",
      progress: 40,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-heading">
              SUTRA Happiness Index &amp; Experience Analytics
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white uppercase tracking-wider">
              {roleScope === "admin" ? "Institutional Scope" : "Department Scope"}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Weekly aggregate student sentiment across 6 dimensions to guide campus improvements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded-full text-xs font-semibold text-neutral-800 shadow-2xs transition-all cursor-pointer"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 text-neutral-500 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Card */}
      <HappinessIndexSummaryCard aggregate={happinessAggregate} />

      {/* 3. Middle 2-Column: Trend Graph (7 cols) & Institutional Initiatives (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Weekly Trend Line Chart */}
        <div className="lg:col-span-7">
          <HappinessWeeklyTrendChart trendData={happinessTrends} />
        </div>

        {/* Right Column: Institutional Improvement Initiatives */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-bold text-neutral-900 font-heading">
                Campus Action Initiatives
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Approved follow-up programs mapped to index dimensions
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
              3 Active
            </span>
          </div>

          <div className="space-y-3">
            {approvedInitiatives.map((init) => (
              <div
                key={init.id}
                className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">
                      {init.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Dimension:{" "}
                      <span className="font-semibold text-rose-700">
                        {init.dimension}
                      </span>{" "}
                      • {init.targetScope}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    {init.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Lead: {init.lead}</span>
                    <span className="font-mono font-semibold text-neutral-700">
                      {init.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${init.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:underline"
            >
              <span>View All Support Protocols &amp; Interventions</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Six Dimensions Grid */}
      <HappinessDimensionBreakdown aggregate={happinessAggregate} />

      {/* 5. Governance & Privacy Disclaimer Footer */}
      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-start gap-3 text-xs text-neutral-500 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-neutral-800">
            SUTRA Wellbeing Governance Invariants (ADR-004 &amp; Least-Privilege Access)
          </p>
          <p className="mt-0.5 text-neutral-600">
            The SUTRA Happiness Index is designed strictly for institutional and departmental cohort insights. Individual student responses are never disclosed on public leaderboards, ranked, or used to determine academic eligibility, grading, awards, or disciplinary action. In cohorts with fewer than 10 respondents, dimension metrics are strictly suppressed to protect student privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
