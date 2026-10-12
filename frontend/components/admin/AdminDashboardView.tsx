"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { SignalReviewModal } from "@/components/SignalReviewModal";
import { SignalDTO, CaseState } from "@/lib/types";
import {
  ShieldCheck,
  Users,
  FileText,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ArrowUpRight,
  BarChart2,
  Settings,
  Activity,
  Layers,
  Clock,
} from "lucide-react";

export function AdminDashboardView() {
  const {
    user,
    students,
    signals,
    cases,
    backendConnected,
    transitionCase,
    activeCampusName,
    refreshBackendData,
  } = useSkillHub();

  const [selectedSignalForReview, setSelectedSignalForReview] =
    useState<SignalDTO | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Derived SUTRA operational metrics
  const pendingSignals = signals.filter(
    (s) => !s.reviewed_decision || s.reviewed_decision.trim() === ""
  );
  const openCases = cases.filter(
    (c) => c.state !== "CLOSED" && c.state !== "RESOLVED"
  );
  const terminalCases = cases.filter(
    (c) => c.state === "CLOSED" || c.state === "RESOLVED"
  );
  const resolutionRate =
    cases.length > 0
      ? Math.round((terminalCases.length / cases.length) * 100)
      : 100;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshBackendData) {
        await refreshBackendData();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER: Welcome Title, Role Badge, and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Welcome back, Admin!
            </h1>
            <span className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-wider">
              (System Admin)
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Institutional Governance &amp; Platform Oversight</span>
            <span>•</span>
            <span className="font-medium text-neutral-600">
              {activeCampusName || "Apex University Main Campus"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
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
            <span>Refresh</span>
          </button>

          {/* Institutional Analytics Action */}
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded-full text-xs font-semibold text-neutral-800 shadow-2xs transition-all cursor-pointer"
          >
            <BarChart2 className="w-3.5 h-3.5 text-neutral-600" />
            <span>Analytics</span>
          </Link>

          {/* Access Governance Shortcut */}
          <Link
            href="/settings"
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Role Governance</span>
          </Link>
        </div>
      </div>

      {/* 2. SECTION A: 4 ADMINISTRATIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Enrolled Cohort Scope */}
        <div className="p-5 bg-white rounded-2xl border border-neutral-200/70 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Enrolled Students
            </span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-extrabold text-neutral-900 font-heading">
            {students.length > 0 ? students.length : "120"}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Active cohort scope on main campus
          </p>
        </div>

        {/* Card 2: Cross-Campus Open Cases */}
        <div className="p-5 bg-white rounded-2xl border border-neutral-200/70 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Active Cases
            </span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-extrabold text-neutral-900 font-heading">
            {openCases.length}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Open student support cases
          </p>
        </div>

        {/* Card 3: Pending Signal Audit Queue */}
        <div className="p-5 bg-white rounded-2xl border border-neutral-200/70 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Pending Reviews
            </span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-neutral-900 font-heading">
            {pendingSignals.length}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Signals awaiting human review action
          </p>
        </div>

        {/* Card 4: Closed-Loop Resolution Rate */}
        <div className="p-5 bg-white rounded-2xl border border-neutral-200/70 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Resolution Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-neutral-900 font-heading">
            {resolutionRate}%
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Closed-loop terminal resolution
          </p>
        </div>
      </div>

      {/* 3. SECTION B: MAIN GRID (8 Cols Left, 4 Cols Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (8 cols): Signal Audit Queue & Case Closed-Loop Tracker */}
        <div className="lg:col-span-8 space-y-6">
          {/* Signal Audit Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 font-heading">
                  System Signal Audit Queue
                </h2>
                <p className="text-xs text-neutral-500">
                  ML-evaluated signals with Platt calibration thresholds
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                ({signals.length} Signals)
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden shadow-2xs">
              {signals.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  Zero active signals in audit queue.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="py-3 px-4">STUDENT</th>
                        <th className="py-3 px-4">CALIBRATED RISK</th>
                        <th className="py-3 px-4">KEY ATTRIBUTION</th>
                        <th className="py-3 px-4">STATUS</th>
                        <th className="py-3 px-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {signals.slice(0, 5).map((s) => {
                        const isPending =
                          !s.reviewed_decision ||
                          s.reviewed_decision.trim() === "";
                        const riskVal =
                          s.explanation?.baseline_risk_probability ?? 0.5;
                        return (
                          <tr
                            key={s.id}
                            className="hover:bg-neutral-50/50 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-semibold text-neutral-900">
                              {s.student_display_name || "Enrolled Student"}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-neutral-800">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    riskVal >= 0.7
                                      ? "bg-rose-500"
                                      : riskVal >= 0.46
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                />
                                {Math.round(riskVal * 100)}% Risk
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-neutral-600">
                              {s.explanation?.primary_feature ||
                                "Attendance & LMS Telemetry"}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isPending ? "bg-amber-500" : "bg-neutral-400"
                                  }`}
                                />
                                {isPending ? "Awaiting Review" : "Reviewed"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedSignalForReview(s)}
                                className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                Audit Review
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

          {/* Cross-Campus Case Closed-Loop Tracker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 font-heading">
                  Active Case Closed-Loop Tracker
                </h2>
                <p className="text-xs text-neutral-500">
                  Institutional 10-state lifecycle oversight
                </p>
              </div>
              <Link
                href="/cases"
                className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 flex items-center gap-1"
              >
                <span>All Cases</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden shadow-2xs">
              {cases.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400 space-y-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-neutral-800">
                    No active support cases
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="py-3 px-4">STUDENT</th>
                        <th className="py-3 px-4">CURRENT STATE</th>
                        <th className="py-3 px-4">INTERVENTION</th>
                        <th className="py-3 px-4 text-right">LIFECYCLE ADVANCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {cases.slice(0, 5).map((c) => (
                        <tr
                          key={c.id}
                          className="hover:bg-neutral-50/50 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-neutral-900">
                            <Link
                              href={`/cases/${c.id}`}
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>
                                {c.student_display_name || "Enrolled Student"}
                              </span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
                            </Link>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-neutral-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                              {c.state}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-600">
                            {(
                              c.selected_intervention_key ||
                              "Academic Mentoring"
                            ).replace(/_/g, " ")}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
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
                                  reason_code: "admin_lifecycle_transition",
                                });
                              }}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-medium transition-colors cursor-pointer"
                            >
                              Advance State
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
        </div>

        {/* RIGHT COLUMN (4 cols): Platform Governance & Security Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Platform Status Card */}
          <div className="bg-white rounded-2xl border border-neutral-200/70 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                  System Health &amp; Security
                </h3>
                <p className="text-[11px] text-neutral-400">
                  FastAPI v0.115 Core Engine
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Core API Status:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {backendConnected ? "ONLINE" : "STANDBY"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Platt Threshold:</span>
                <span className="font-mono font-bold text-neutral-900">
                  0.46 (Day-30)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Privacy Scope:</span>
                <span className="font-semibold text-neutral-800">
                  ADR-004 Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Auth Session:</span>
                <span className="font-semibold text-neutral-800">
                  Supabase Verified
                </span>
              </div>
            </div>
          </div>

          {/* Quick Administration Links */}
          <div className="bg-white rounded-2xl border border-neutral-200/70 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              Governance Tools
            </h3>
            <div className="space-y-2">
              <Link
                href="/settings"
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-neutral-500" />
                  <span>User &amp; Role Management</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
              </Link>

              <Link
                href="/analytics"
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-neutral-500" />
                  <span>Institutional Cohort Insights</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
              </Link>

              <Link
                href="/courses"
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-neutral-500" />
                  <span>Interventions &amp; Protocols</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>

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
