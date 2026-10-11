"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { SkillHubProgressBar } from "@/components/SkillHubProgressBar";
import { EngagementChart } from "@/components/EngagementChart";
import { SignalReviewModal } from "@/components/SignalReviewModal";
import { SignalDTO } from "@/lib/types";
import {
  Plus,
  ChevronDown,
  Clock,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Activity,
  Layers,
  Sparkles,
  Info,
  Lock,
} from "lucide-react";

export default function DashboardPage() {
  const {
    user,
    setIsNewCourseModalOpen,
    courses,
    students,
    growthTimeframe,
    setGrowthTimeframe,
    analyticsTimeframe,
    setAnalyticsTimeframe,
    toggleCourseLive,
    signals,
    cases,
    activeRole,
    currentPersona,
    backendConnected,
  } = useSkillHub();

  const [growthOpen, setGrowthOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedSignalForReview, setSelectedSignalForReview] =
    useState<SignalDTO | null>(null);

  const timeframes: ("This Week" | "This Month" | "This Year")[] = [
    "This Week",
    "This Month",
    "This Year",
  ];

  // SUTRA Metrics derived from live backend signals and cases
  const pendingSignals = signals.filter((s) => !s.reviewed_decision);
  const openCases = cases.filter(
    (c) => c.state !== "CLOSED" && c.state !== "RESOLVED"
  );
  const escalatedCases = cases.filter((c) => c.is_escalated);
  const triageActionRate =
    signals.length > 0
      ? Math.round(
          ((signals.length - pendingSignals.length) / signals.length) * 100
        )
      : 100;

  // Dynamic growth metrics based on timeframe
  const growthMetrics = {
    "This Week": {
      activeLearners: `${students.length || 6} Students`,
      newEnrollments: `${signals.length} Signals`,
      totalEnrollments: `${cases.length} Cases`,
      progress: triageActionRate,
    },
    "This Month": {
      activeLearners: `${students.length || 6} Students`,
      newEnrollments: `${signals.length} Signals`,
      totalEnrollments: `${cases.length} Cases`,
      progress: triageActionRate,
    },
    "This Year": {
      activeLearners: `${students.length || 6} Students`,
      newEnrollments: `${signals.length} Signals`,
      totalEnrollments: `${cases.length} Cases`,
      progress: triageActionRate,
    },
  }[growthTimeframe];

  // Dynamic analytics metrics based on timeframe
  const analyticsMetrics = {
    "This Week": {
      totalStudents: `${students.length || 6}`,
      studentsChange: "+15% vs last week",
      avgTime: "4h 32m",
      timeChange: "-15% vs last week",
      completion: `${triageActionRate}%`,
      completionChange: "+12% vs last week",
    },
    "This Month": {
      totalStudents: `${students.length || 6}`,
      studentsChange: "+28% vs last month",
      avgTime: "18h 40m",
      timeChange: "+22% vs last month",
      completion: `${triageActionRate}%`,
      completionChange: "+18% vs last month",
    },
    "This Year": {
      totalStudents: `${students.length || 6}`,
      studentsChange: "+65% vs last year",
      avgTime: "74h 10m",
      timeChange: "+45% vs last year",
      completion: `${triageActionRate}%`,
      completionChange: "+24% vs last year",
    },
  }[analyticsTimeframe];

  // Derive dynamic live course
  const liveCourse = courses.find((c) => c.isUpcomingLive) || courses[0] || {
    id: "course-live",
    title: "Advanced Academic Mentoring",
    liveTime: "Today, 10:00 AM",
    studentsCount: "2k+",
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER: "Welcome back, Sarah!" and "+ New Course" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            Welcome back, {user.name}!
          </h1>
          <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
            <span>Role:</span>
            <span className="font-semibold text-neutral-800">{currentPersona.title}</span>
            <span>•</span>
            <span className="font-medium text-neutral-500">
              Campus: Apex University Main Campus
            </span>
          </p>
        </div>

        <button
          onClick={() => setIsNewCourseModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-sm transition-all min-h-[44px] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Course</span>
        </button>
      </div>

      {/* SUTRA ACTION BAR: "No Alert Without Action" Orchestration Banner */}
      <div className="skill-card p-4 sm:p-5 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Principle
              </span>
              <span className="text-xs font-bold text-neutral-200">
                No Alert Without Action
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Deterministic early-warning policy signals with mandatory human rationale capture and closed-loop task execution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[90px]">
              <span className="block text-[10px] uppercase font-bold text-neutral-300">
                Signals Pending
              </span>
              <span className="text-lg font-extrabold text-amber-300">
                {pendingSignals.length}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[90px]">
              <span className="block text-[10px] uppercase font-bold text-neutral-300">
                Open Cases
              </span>
              <span className="text-lg font-extrabold text-white">
                {openCases.length}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[90px]">
              <span className="block text-[10px] uppercase font-bold text-neutral-300">
                Escalations
              </span>
              <span className="text-lg font-extrabold text-rose-300">
                {escalatedCases.length}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[90px]">
              <span className="block text-[10px] uppercase font-bold text-neutral-300">
                Action Rate
              </span>
              <span className="text-lg font-extrabold text-emerald-300">
                {triageActionRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
          {/* Card 1: Growth Overview */}
          <div className="skill-card p-5 sm:p-6 bg-white space-y-5 relative">
            {/* Header with interactive dropdown */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
                Support Pipeline Overview
              </h3>
              <div className="relative">
                <button
                  onClick={() => setGrowthOpen(!growthOpen)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-neutral-50 hover:bg-neutral-100 rounded-full border border-neutral-200/60 text-xs font-medium text-neutral-600 transition-colors"
                >
                  <span>{growthTimeframe}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>
                {growthOpen && (
                  <div className="absolute right-0 top-8 z-30 bg-white rounded-xl shadow-xl border border-neutral-100 py-1 w-32 animate-in fade-in zoom-in-95 duration-100">
                    {timeframes.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => {
                          setGrowthTimeframe(tf);
                          setGrowthOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                          growthTimeframe === tf
                            ? "bg-neutral-900 text-white font-semibold"
                            : "text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Learners Number & Subtitle */}
            <div>
              <span className="text-4xl font-extrabold text-neutral-900 tracking-tight block">
                {growthMetrics.activeLearners}
              </span>
              <span className="text-xs text-neutral-400 font-medium block mt-0.5">
                Evaluated Cohort ({growthTimeframe})
              </span>
            </div>

            {/* Dynamic Enrollments Comparison */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-base font-bold text-neutral-900 block">
                  {growthMetrics.newEnrollments}
                </span>
                <span className="text-[11px] text-neutral-400 block mt-0.5">
                  Generated Alerts
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-neutral-900 block">
                  {growthMetrics.totalEnrollments}
                </span>
                <span className="text-[11px] text-neutral-400 block mt-0.5">
                  Orchestrated Cases
                </span>
              </div>
            </div>

            {/* Signature Dual-Layer Gradient Tick Bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
                <span>Triage Completion</span>
                <span className="font-bold text-neutral-800">{triageActionRate}%</span>
              </div>
              <SkillHubProgressBar progress={growthMetrics.progress} heightClass="h-5" />
            </div>
          </div>

          {/* Card 2: Dynamic Live Class / Mentoring Card */}
          <div className="skill-card p-5 sm:p-6 bg-white flex flex-col justify-between min-h-[190px]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
                  {liveCourse.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{liveCourse.liveTime || "Today, 10:00 AM"}</span>
                </div>
              </div>

              <Link
                href="/courses"
                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
                title="View Interventions Catalog"
              >
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Bottom avatars & Interactive Live badge */}
            <div className="flex items-center justify-between pt-6">
              {/* Dynamic Avatars Stack */}
              <div className="flex items-center -space-x-2">
                {students.slice(0, 3).map((s) => (
                  <img
                    key={s.id}
                    src={s.avatar}
                    alt={s.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                  />
                ))}
                <div className="w-8 h-8 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-neutral-600 pl-0.5">
                  {students.length}+
                </div>
              </div>

              {/* Interactive Live Session Toggle Button */}
              <button
                onClick={() => toggleCourseLive(liveCourse.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  liveCourse.isUpcomingLive
                    ? "bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100/70"
                    : "bg-neutral-100 border border-neutral-200 text-neutral-600 hover:bg-neutral-200"
                }`}
                title="Toggle Live Session Status"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    liveCourse.isUpcomingLive
                      ? "bg-rose-500 animate-live-pulse"
                      : "bg-neutral-400"
                  }`}
                />
                <span>{liveCourse.isUpcomingLive ? "Live" : "Scheduled"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          {/* Card 1: Learning Analytics */}
          <div className="skill-card p-5 sm:p-6 bg-white space-y-5 relative">
            {/* Header with interactive timeframe dropdown */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
                Intervention &amp; Learning Analytics
              </h3>
              <div className="relative">
                <button
                  onClick={() => setAnalyticsOpen(!analyticsOpen)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-neutral-50 hover:bg-neutral-100 rounded-full border border-neutral-200/60 text-xs font-medium text-neutral-600 transition-colors"
                >
                  <span>{analyticsTimeframe}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>
                {analyticsOpen && (
                  <div className="absolute right-0 top-8 z-30 bg-white rounded-xl shadow-xl border border-neutral-100 py-1 w-32 animate-in fade-in zoom-in-95 duration-100">
                    {timeframes.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => {
                          setAnalyticsTimeframe(tf);
                          setAnalyticsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                          analyticsTimeframe === tf
                            ? "bg-neutral-900 text-white font-semibold"
                            : "text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3 Sub-Cards dynamically updating */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Sub-card 1: Total Students */}
              <div className="skill-card-subtle p-4 bg-neutral-50/80 border border-neutral-100">
                <span className="text-[11px] font-medium text-neutral-400 block">
                  Students In Scope
                </span>
                <span className="text-xl font-extrabold text-neutral-900 mt-2 block">
                  {analyticsMetrics.totalStudents}
                </span>
                <span className="text-[11px] font-medium text-emerald-600 mt-2 flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                  <span>{analyticsMetrics.studentsChange}</span>
                </span>
              </div>

              {/* Sub-card 2: Avg. Resolution Time */}
              <div className="skill-card-subtle p-4 bg-neutral-50/80 border border-neutral-100">
                <span className="text-[11px] font-medium text-neutral-400 block">
                  Avg. Action Time
                </span>
                <span className="text-xl font-extrabold text-neutral-900 mt-2 block">
                  {analyticsMetrics.avgTime}
                </span>
                <span className="text-[11px] font-medium text-rose-500 mt-2 flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                  <span>{analyticsMetrics.timeChange}</span>
                </span>
              </div>

              {/* Sub-card 3: Action Rate */}
              <div className="skill-card-subtle p-4 bg-neutral-50/80 border border-neutral-100">
                <span className="text-[11px] font-medium text-neutral-400 block">
                  Action Rate
                </span>
                <span className="text-xl font-extrabold text-neutral-900 mt-2 block">
                  {analyticsMetrics.completion}
                </span>
                <span className="text-[11px] font-medium text-emerald-600 mt-2 flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                  <span>{analyticsMetrics.completionChange}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Student Engagement Trend linked to active timeframe */}
          <EngagementChart timeframe={analyticsTimeframe} />
        </div>
      </div>

      {/* 3. PRIORITY TRIAGE QUEUE: Signals Pending Review */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight font-heading">
              Priority Review Queue
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Policy-generated alerts awaiting authorized human evaluation &amp; rationale
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
            {pendingSignals.length} Pending Actions
          </span>
        </div>

        {/* Leadership Privacy Safeguard Check */}
        {activeRole === "leadership" ? (
          <div className="skill-card p-6 bg-white border border-neutral-200/80 rounded-3xl flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-center sm:text-left flex-1">
              <h4 className="text-sm font-bold text-neutral-900">
                Institutional Privacy Protection (ADR-004)
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Executive and Leadership roles are restricted to anonymized cohort-level indicators and cannot inspect individual student records or operational review queues.
              </p>
            </div>
            <Link
              href="/analytics"
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-full shadow-sm whitespace-nowrap"
            >
              View Cohort Analytics
            </Link>
          </div>
        ) : (
          <div className="skill-card bg-white overflow-hidden rounded-3xl border border-neutral-100 shadow-sm">
            {signals.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-neutral-800">
                  All alerts triaged!
                </p>
                <p>No policy signals pending evaluation at this moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Rule / Model</th>
                      <th className="py-3 px-4">Evidence Digest</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {signals.map((sig) => {
                      const isPending = !sig.reviewed_decision;
                      return (
                        <tr
                          key={sig.id}
                          className="hover:bg-neutral-50/80 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-neutral-900">
                              {sig.student_display_name}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                              {sig.external_student_ref}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                              {sig.rule_key}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-neutral-600 line-clamp-2">
                              {sig.evidence_digest}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isPending
                                  ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                                  : sig.reviewed_decision === "approve"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                  : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {isPending
                                ? "Pending Review"
                                : `Reviewed (${sig.reviewed_decision})`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isPending ? (
                              <button
                                onClick={() => setSelectedSignalForReview(sig)}
                                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
                              >
                                Review Signal
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedSignalForReview(sig)}
                                className="px-3 py-1 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-full text-xs font-semibold transition-all"
                              >
                                View Evidence
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Signal Review Modal */}
      {selectedSignalForReview && (
        <SignalReviewModal
          signal={selectedSignalForReview}
          onClose={() => setSelectedSignalForReview(null)}
          onSuccess={() => setSelectedSignalForReview(null)}
        />
      )}
    </div>
  );
}
