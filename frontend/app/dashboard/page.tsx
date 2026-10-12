"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { SignalReviewModal } from "@/components/SignalReviewModal";
import { SignalDTO, CaseState } from "@/lib/types";
import { CounselorDashboardView } from "@/components/counselor/CounselorDashboardView";
import { StudentDashboardView } from "@/components/student/StudentDashboardView";
import { AdminDashboardView } from "@/components/admin/AdminDashboardView";
import {
  computeDashboardMetrics,
  getNearestUpcomingFollowUp,
} from "@/lib/dashboard-selectors";
import {
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function DashboardPage() {
  const { t } = useLanguage();
  const {
    user,
    students,
    signals,
    cases,
    activeRole,
    backendConnected,
    transitionCase,
    activeCampusName,
    supabaseSession,
    mlModelInfo,
    refreshBackendData,
  } = useSkillHub();

  const [selectedSignalForReview, setSelectedSignalForReview] =
    useState<SignalDTO | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dedicated role-based views (for backward compatibility if role state is switched programmatically)
  if (activeRole === "student") {
    return <StudentDashboardView />;
  }

  if (activeRole === "admin" || activeRole === "superadmin") {
    return <AdminDashboardView />;
  }

  if (activeRole === "counselor") {
    return <CounselorDashboardView />;
  }

  // Authoritative operational metrics
  const metrics = computeDashboardMetrics(
    signals,
    cases,
    students,
    activeRole,
    backendConnected
  );

  const nearestFollowUp = getNearestUpcomingFollowUp(cases);

  // Derived SUTRA operational metrics
  const pendingSignals = signals.filter(
    (s) => !s.reviewed_decision || s.reviewed_decision.trim() === ""
  );
  const openCases = cases.filter(
    (c) => c.state !== "CLOSED" && c.state !== "RESOLVED"
  );
  const triageActionRate =
    signals.length > 0
      ? Math.round(
          ((signals.length - pendingSignals.length) / signals.length) * 100
        )
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
      {/* 1. TOP HEADER: Welcome Title, Mode Tag, and Action Buttons (locked design reference) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            Welcome back, Prof.!
          </h1>
          <p className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Course Instructor &amp; Faculty Mentor</span>
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
            <RotateCcw className={`w-3.5 h-3.5 text-neutral-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Primary Action Button: Triage Next Signal */}
          {pendingSignals.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedSignalForReview(pendingSignals[0])}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Triage Next Signal ({pendingSignals.length})</span>
            </button>
          ) : (
            <Link
              href="/cases"
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Review Complete</span>
            </Link>
          )}
        </div>
      </div>

      {/* 3. SECTION A: 4 OPERATIONAL KPI CARDS (locked design reference) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Students in Scope */}
        <div className="bg-white rounded-2xl border border-neutral-200/70 p-5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              STUDENTS IN SCOPE
            </span>
            <span className="bg-neutral-100 text-neutral-600 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
              {students.length} Learners
            </span>
          </div>
          <div className="text-3xl font-extrabold text-neutral-900 tracking-tight pt-2">
            {students.length}
          </div>
          <p className="text-xs text-neutral-400 pt-0.5">
            Synthetic cohort CS-Y2 (Demo)
          </p>
        </div>

        {/* Card 2: Signals Pending Review */}
        <div className="bg-white rounded-2xl border border-neutral-200/70 p-5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              SIGNALS PENDING REVIEW
            </span>
            <span className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
              {pendingSignals.length > 0 ? "Action Required" : "Queue Clear"}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 tracking-tight pt-2">
            {pendingSignals.length}
          </div>
          <p className="text-xs text-neutral-400 pt-0.5">
            {pendingSignals.length} actionable risk trigger{pendingSignals.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Card 3: Active Support Cases */}
        <div className="bg-white rounded-2xl border border-neutral-200/70 p-5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              ACTIVE SUPPORT CASES
            </span>
            <span className="bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
              In Progress
            </span>
          </div>
          <div className="text-3xl font-extrabold text-neutral-900 tracking-tight pt-2">
            {openCases.length}
          </div>
          <p className="text-xs text-neutral-400 pt-0.5">
            {openCases.length} cases in active lifecycle
          </p>
        </div>

        {/* Card 4: Triage Velocity Rate */}
        <div className="bg-white rounded-2xl border border-neutral-200/70 p-5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              TRIAGE VELOCITY RATE
            </span>
            <span className="bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
              Closed Loop
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 tracking-tight pt-2">
            {triageActionRate}%
          </div>
          <p className="text-xs text-neutral-400 pt-0.5">
            {signals.length - pendingSignals.length} of {signals.length || 1} signals evaluated
          </p>
        </div>
      </div>

      {/* 4. MAIN CONTENT 2-COLUMN GRID: PRIORITY REVIEW QUEUE & ACTIVE INTERVENTION FOLLOW-UP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Priority Signal Review Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-3" aria-label="Priority Signal Review Queue">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                Priority Signal Review Queue
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Early-warning triggers awaiting authorized human evaluation &amp; rationale
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
              {pendingSignals.length} Pending
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden shadow-2xs">
            {pendingSignals.length === 0 ? (
              <div className="p-10 text-center text-xs text-neutral-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-neutral-800">Queue Clear</p>
                <p>All early-warning signals for this cohort have been evaluated.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">STUDENT</th>
                      <th className="py-3 px-4">RISK TRIGGER</th>
                      <th className="py-3 px-4">ML CONFIDENCE</th>
                      <th className="py-3 px-4">PRIMARY FACTOR</th>
                      <th className="py-3 px-4 text-right">REVIEW ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {pendingSignals.map((sig) => {
                      const conf = Math.round(
                        (sig.explanation?.baseline_risk_probability ?? 0.68) * 100
                      );
                      const trigger =
                        sig.rule_key?.replace(/_/g, " ").toUpperCase() ||
                        "DAY30 EARLY WARNING";
                      const factor =
                        (sig as any).primary_factor ||
                        sig.explanation?.top_contributing_factors?.[0]?.feature_name ||
                        "attendance_rate";
                      return (
                        <tr key={sig.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-neutral-900">
                            <Link
                              href={`/students/${sig.student_id}`}
                              className="inline-flex items-center gap-1 hover:text-neutral-700 hover:underline"
                            >
                              <span>{sig.student_display_name}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-neutral-800 text-[11px]">
                            {trigger}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                              {conf}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-600 font-mono text-[11px]">
                            {factor}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedSignalForReview(sig)}
                              className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                            >
                              Review
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

        {/* RIGHT COLUMN: Active Intervention Follow-Up (5 cols) */}
        <div className="lg:col-span-5 space-y-3" aria-label="Active Intervention Follow-Up">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              Active Intervention Follow-Up
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Nearest scheduled task or check-in across active support cases
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/70 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                NEXT ACTIONABLE MILESTONE
              </span>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200/60">
                Active SLA
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                {nearestFollowUp.studentName || students[0]?.name || "Asha (synthetic)"}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {nearestFollowUp.taskLabel || "Mentor Check In"}
              </p>
            </div>

            {/* Inset gray task detail box */}
            <div className="bg-neutral-50 rounded-xl p-3.5 space-y-2 border border-neutral-100 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-neutral-400 font-medium shrink-0">Scheduled Task:</span>
                <span className="text-neutral-800 font-semibold text-right">
                  Initial 1-on-1 Academic Mentorship Session
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-400 font-medium shrink-0">Target Timeline:</span>
                <span className="text-neutral-800 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>14 Oct, 17:30</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-400 font-medium shrink-0">Primary Assignee:</span>
                <span className="text-neutral-800 font-medium">Faculty Mentor</span>
              </div>
            </div>

            {/* Bottom case ref & telemetry link */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs">
              <span className="text-neutral-400 font-mono text-[11px]">
                Case Ref: {cases[0]?.id ? cases[0].id.slice(0, 14) + "..." : "CASE-SYN-1007"}
              </span>
              <Link
                href={`/students/${students[0]?.id || "SYN-1007"}`}
                className="font-semibold text-neutral-800 hover:text-neutral-950 hover:underline flex items-center gap-1"
              >
                <span>View 360° Telemetry</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECTION B: MY CASES / ACTIVE CASE CLOSED-LOOP TRACKER */}
      <div className="space-y-3 pt-2" aria-label="Active Case Closed-Loop Tracker">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              Active Case Closed-Loop Tracker
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Assigned cases in active lifecycle with full 10-state audit tracking
            </p>
          </div>
          <Link
            href="/cases"
            className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            <span>View All ({cases.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden shadow-2xs">
          {cases.length === 0 ? (
            <div className="p-10 text-center text-xs text-neutral-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-neutral-800">No active cases</p>
              <p>All student support cases have reached terminal resolution.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">STUDENT</th>
                    <th className="py-3 px-4">CURRENT STATUS</th>
                    <th className="py-3 px-4">INTERVENTION</th>
                    <th className="py-3 px-4">PRIMARY ASSIGNEE</th>
                    <th className="py-3 px-4 text-right">LIFECYCLE TRANSITION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-neutral-900">
                        <Link
                          href={`/cases/${c.id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>{c.student_display_name || "Enrolled Student"}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200/60">
                          {c.state}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {(c.selected_intervention_key || "Academic Mentoring").replace(/_/g, " ")}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500 font-medium">
                        {c.primary_owner_user_id ? "Faculty Mentor" : "Lead Advisor"}
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
                              reason_code: "progressed_triage",
                            });
                          }}
                          className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-medium transition-colors cursor-pointer"
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
