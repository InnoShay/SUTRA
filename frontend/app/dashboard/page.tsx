"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { SkillHubProgressBar } from "@/components/SkillHubProgressBar";
import { EngagementChart } from "@/components/EngagementChart";
import { SignalReviewModal } from "@/components/SignalReviewModal";
import { SignalDTO, CaseDetailDTO, CaseState } from "@/lib/types";
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
  Lock,
  ListFilter,
  SlidersHorizontal,
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
    transitionCase,
  } = useSkillHub();

  const [activeTab, setActiveTab] = useState<"overview" | "triage">("overview");
  const [growthOpen, setGrowthOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedSignalForReview, setSelectedSignalForReview] =
    useState<SignalDTO | null>(null);

  const timeframes: ("This Week" | "This Month" | "This Year")[] = [
    "This Week",
    "This Month",
    "This Year",
  ];

  // Derived SUTRA operational metrics
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

  // Dynamic growth metrics matching original Hackingly presentation
  const growthMetrics = {
    "This Week": {
      activeLearners: "6.8k",
      newEnrollments: "2.8K",
      totalEnrollments: "3.5K",
      progress: 62,
    },
    "This Month": {
      activeLearners: "25k",
      newEnrollments: "12K",
      totalEnrollments: "15K",
      progress: 38,
    },
    "This Year": {
      activeLearners: "142k",
      newEnrollments: "64K",
      totalEnrollments: "88K",
      progress: 84,
    },
  }[growthTimeframe];

  // Dynamic analytics metrics matching original Hackingly presentation
  const analyticsMetrics = {
    "This Week": {
      totalStudents: "28.4K",
      studentsChange: "+15% vs last week",
      avgTime: "4h 32m",
      timeChange: "-15% vs last week",
      completion: "68.4%",
      completionChange: "+12% vs last week",
    },
    "This Month": {
      totalStudents: "124K",
      studentsChange: "+28% vs last month",
      avgTime: "18h 40m",
      timeChange: "+22% vs last month",
      completion: "76.2%",
      completionChange: "+18% vs last month",
    },
    "This Year": {
      totalStudents: "460K",
      studentsChange: "+65% vs last year",
      avgTime: "74h 10m",
      timeChange: "+45% vs last year",
      completion: "84.5%",
      completionChange: "+24% vs last year",
    },
  }[analyticsTimeframe];

  // Dynamic live course matching original Hackingly presentation
  const liveCourse = courses.find((c) => c.isUpcomingLive) || courses[0] || {
    id: "course-live",
    title: "Advanced UI/UX Design",
    liveTime: "Today, 10:00 AM",
    studentsCount: "2k+",
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER: Welcome Title, Segmented Tabs, and + New Course Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            Welcome back, {user.name}!
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
            <span>{currentPersona?.title || "Lead Instructor"}</span>
            <span>•</span>
            <span>Apex University Main Campus</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented Apple-Style Tab Switcher: Overview vs Operational Triage */}
          <div className="inline-flex p-1 bg-neutral-100 rounded-full border border-neutral-200/60 shadow-2xs">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                activeTab === "overview"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("triage")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                activeTab === "triage"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <span>Operational Triage</span>
              {pendingSignals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {pendingSignals.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setIsNewCourseModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-sm transition-all min-h-[44px] self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Course</span>
          </button>
        </div>
      </div>

      {/* 2. OVERVIEW TAB: EXACT HACKINGLY 2-COLUMN APPLE-INSPIRED GRID */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start animate-in fade-in duration-200">
          {/* LEFT COLUMN (5 cols) */}
          <div className="lg:col-span-5 space-y-5 sm:space-y-6">
            {/* Card 1: Growth Overview with Dual-Layer Tick Bar */}
            <div className="skill-card p-5 sm:p-6 bg-white space-y-5 relative">
              {/* Header with interactive dropdown */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
                  Growth Overview
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
                  Active Learners ({growthTimeframe})
                </span>
              </div>

              {/* Dynamic Enrollments Comparison */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-base font-bold text-neutral-900 block">
                    {growthMetrics.newEnrollments}
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">
                    New Enrollments
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-neutral-900 block">
                    {growthMetrics.totalEnrollments}
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">
                    Total Enrollments
                  </span>
                </div>
              </div>

              {/* Signature Dual-Layer Gradient Tick Bar */}
              <div className="pt-2">
                <SkillHubProgressBar progress={growthMetrics.progress} heightClass="h-5" />
              </div>
            </div>

            {/* Card 2: Dynamic Live Class Card */}
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
                  title="View Courses"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Bottom avatars & Interactive Live toggle badge */}
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
                    {liveCourse.studentsCount || `${students.length}+`}
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

          {/* RIGHT COLUMN (7 cols) */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            {/* Card 1: Learning Analytics */}
            <div className="skill-card p-5 sm:p-6 bg-white space-y-5 relative">
              {/* Header with interactive timeframe dropdown */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
                  Learning Analytics
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
                    Total Students
                  </span>
                  <span className="text-xl font-extrabold text-neutral-900 mt-2 block">
                    {analyticsMetrics.totalStudents}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 mt-2 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                    <span>{analyticsMetrics.studentsChange}</span>
                  </span>
                </div>

                {/* Sub-card 2: Avg. Learning Time */}
                <div className="skill-card-subtle p-4 bg-neutral-50/80 border border-neutral-100">
                  <span className="text-[11px] font-medium text-neutral-400 block">
                    Avg. Learning Time
                  </span>
                  <span className="text-xl font-extrabold text-neutral-900 mt-2 block">
                    {analyticsMetrics.avgTime}
                  </span>
                  <span className="text-[11px] font-medium text-rose-500 mt-2 flex items-center gap-1">
                    <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                    <span>{analyticsMetrics.timeChange}</span>
                  </span>
                </div>

                {/* Sub-card 3: Completion Rate */}
                <div className="skill-card-subtle p-4 bg-neutral-50/80 border border-neutral-100">
                  <span className="text-[11px] font-medium text-neutral-400 block">
                    Completion Rate
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
      )}

      {/* 3. OPERATIONAL TRIAGE TAB: SUTRA "No Alert Without Action" WORKFLOWS */}
      {activeTab === "triage" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* SUTRA Operational Summary Bar */}
          <div className="skill-card p-5 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-3xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    SUTRA Principle
                  </span>
                  <span className="text-xs font-bold text-neutral-200">
                    No Alert Without Action
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Deterministic early-warning policy signals with mandatory human rationale capture and 48-hour SLA case tracking.
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

          {/* Leadership Role Privacy Guardrail */}
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
                  Executive leadership accounts are restricted to anonymized cohort indicators and cannot inspect individual student records or operational review queues.
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
            <>
              {/* Priority Review Queue: Signals Pending Evaluation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 tracking-tight font-heading">
                      Priority Review Queue
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Signals awaiting authorized human evaluation &amp; rationale
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                    {pendingSignals.length} Pending Actions
                  </span>
                </div>

                <div className="skill-card bg-white overflow-hidden rounded-3xl border border-neutral-100 shadow-sm">
                  {signals.length === 0 ? (
                    <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="font-semibold text-neutral-800">All alerts triaged!</p>
                      <p>No policy signals pending evaluation at this moment.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4">Signal Title</th>
                            <th className="py-3 px-4">Risk Confidence</th>
                            <th className="py-3 px-4">Primary Trigger</th>
                            <th className="py-3 px-4">SLA Deadline</th>
                            <th className="py-3 px-4 text-right">Review Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {signals.map((sig) => {
                            const conf = sig.evidence_card?.risk_probability ? Math.round(sig.evidence_card.risk_probability * 100) : 65;
                            const trigger = sig.evidence_card?.attributions?.[0]?.feature || sig.rule_key;
                            return (
                              <tr key={sig.id} className="hover:bg-neutral-50/60 transition-colors">
                                <td className="py-3.5 px-4 font-semibold text-neutral-900">
                                  {sig.student_display_name}
                                </td>
                                <td className="py-3.5 px-4 text-neutral-600 font-medium capitalize">
                                  {sig.rule_key.replace(/_/g, " ")}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                      conf >= 75
                                        ? "bg-rose-50 text-rose-700"
                                        : conf >= 50
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {conf}% Confidence
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px]">
                                  {trigger}
                                </td>
                                <td className="py-3.5 px-4 text-neutral-400 text-[11px]">
                                  48h SLA
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => setSelectedSignalForReview(sig)}
                                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                                  >
                                    Review Signal
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Case Lifecycle Tracker: 10-State Cases */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 tracking-tight font-heading">
                      Active Case Lifecycle Tracker
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      10-State closed-loop cases governed by institutional service level agreements
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                    {cases.length} Tracked Cases
                  </span>
                </div>

                <div className="skill-card bg-white overflow-hidden rounded-3xl border border-neutral-100 shadow-sm">
                  {cases.length === 0 ? (
                    <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="font-semibold text-neutral-800">No active cases</p>
                      <p>All student support requests have reached verified resolution.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4">Current State</th>
                            <th className="py-3 px-4">Intervention Match</th>
                            <th className="py-3 px-4">Case Owner</th>
                            <th className="py-3 px-4">Status &amp; SLA</th>
                            <th className="py-3 px-4 text-right">Progress Case</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {cases.map((c: any) => (
                            <tr key={c.id} className="hover:bg-neutral-50/60 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-neutral-900">
                                {c.student_display_name || c.student_name || "Enrolled Student"}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200/60">
                                  {c.state}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-neutral-600">
                                {(c.selected_intervention_key || c.intervention_key || "Academic Mentoring").replace(/_/g, " ")}
                              </td>
                              <td className="py-3.5 px-4 text-neutral-500 font-medium">
                                {c.owner_role || "Lead Advisor"}
                              </td>
                              <td className="py-3.5 px-4">
                                {c.is_escalated ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Escalated
                                  </span>
                                ) : (
                                  <span className="text-neutral-500 text-[11px]">
                                    On Track
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => {
                                    const nextState: CaseState =
                                      c.state === "NEW"
                                        ? "TRIAGED"
                                        : c.state === "TRIAGED"
                                        ? "UNDER_REVIEW"
                                        : c.state === "UNDER_REVIEW"
                                        ? "ACTIONABLE"
                                        : c.state === "ACTIONABLE"
                                        ? "ASSIGNED"
                                        : c.state === "ASSIGNED"
                                        ? "ACCEPTED"
                                        : c.state === "ACCEPTED"
                                        ? "IN_PROGRESS"
                                        : c.state === "IN_PROGRESS"
                                        ? "FOLLOW_UP_REQUIRED"
                                        : c.state === "FOLLOW_UP_REQUIRED"
                                        ? "RESOLVED"
                                        : "CLOSED";
                                    transitionCase(c.id, {
                                      to_state: nextState,
                                      reason_code: "progressed_triage",
                                    });
                                  }}
                                  className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-medium transition-colors"
                                >
                                  Advance State →
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Signal Review Modal */}
      {selectedSignalForReview && (
        <SignalReviewModal
          signal={selectedSignalForReview}
          onClose={() => setSelectedSignalForReview(null)}
        />
      )}
    </div>
  );
}
