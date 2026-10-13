"use client";

import React from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import {
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  HeartHandshake,
  ArrowUpRight,
  AlertCircle,
  Sparkles,
  Heart,
  Coins,
  Gift,
  Trophy,
} from "lucide-react";
import { StudentCaseSummaryDTO } from "@/lib/types";
import { api, isDemoMode } from "@/lib/api";
import { DEMO_CASES } from "@/lib/skillhub-data";
import { HappinessPulseModal } from "./HappinessPulseModal";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const mins = String(d.getUTCMinutes()).padStart(2, "0");
    return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${hours}:${mins}`;
  } catch {
    return dateStr;
  }
}

export function StudentDashboardView() {
  const {
    user,
    currentPersona,
    cases,
    callRequests,
    activeCampusName,
    backendError,
    refreshBackendData,
    studentPulseSubmitted,
    pointsWallet,
    leaderboardWeekly,
    myPrivateRankWeekly,
  } = useSkillHub();
  const [mounted, setMounted] = React.useState(false);
  const [isPulseModalOpen, setIsPulseModalOpen] = React.useState(false);

  // Authenticated student-scoped case state
  const [studentCases, setStudentCases] = React.useState<StudentCaseSummaryDTO[]>([]);
  const [isLoadingCases, setIsLoadingCases] = React.useState(true);
  const [casesError, setCasesError] = React.useState<string | null>(null);
  const [isDemoPreview, setIsDemoPreview] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Authenticated student reference
  const studentId = currentPersona?.userId || "SYN-1007";

  const mapCallRequestToSummary = React.useCallback((r: any): StudentCaseSummaryDTO => {
    let title = "Student Support Request";
    if (r.student_notes && r.student_notes.startsWith("[")) {
      const endBracket = r.student_notes.indexOf("]");
      if (endBracket !== -1) {
        title = r.student_notes.substring(1, endBracket);
      }
    } else if (r.student_notes) {
      title = r.student_notes.split(":")[0].slice(0, 40);
    }

    return {
      id: r.id,
      institution_id: "00000000-0000-0000-0000-000000000001",
      student_id: r.student_id,
      title: title,
      state: (r.status || "REQUESTED").toUpperCase(),
      severity: (r.risk_score || 0) >= 0.7 ? "HIGH" : "MEDIUM",
      selected_intervention_key: "counselling_referral",
      primary_owner_name: r.assigned_counselor_name || "Counselor / Wellbeing Staff",
      tasks_count: 1,
      open_tasks_count: r.status === "contact_completed" ? 0 : 1,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }, []);

  const fetchStudentCases = React.useCallback(async () => {
    setIsLoadingCases(true);
    setCasesError(null);
    setIsDemoPreview(false);
    try {
      const response = await api.proposed.getMyCases();
      const backendItems = response.items || [];
      const matchingCalls = callRequests
        .filter(
          (r) =>
            r.student_id === studentId ||
            r.external_student_ref === studentId ||
            studentId === "SYN-1007" ||
            r.student_id === "66666666-6666-6666-6666-666666666666" ||
            r.external_student_ref === "66666666-6666-6666-6666-666666666666"
        )
        .map(mapCallRequestToSummary);

      const merged = [...matchingCalls];
      for (const item of backendItems) {
        if (!merged.some((m) => m.id === item.id)) {
          merged.push(item);
        }
      }
      setStudentCases(merged);
    } catch (err: any) {
      if (isDemoMode()) {
        const demoFiltered = cases.filter(
          (c) =>
            c.student_id === studentId ||
            c.external_student_ref === studentId ||
            c.student_id === "SYN-1007" ||
            c.external_student_ref === "SYN-1007"
        );
        const resolvedList = demoFiltered.length > 0 ? demoFiltered : DEMO_CASES;
        const matchingCalls = callRequests
          .filter(
            (r) =>
              r.student_id === studentId ||
              r.external_student_ref === studentId ||
              studentId === "SYN-1007"
          )
          .map(mapCallRequestToSummary);

        const mappedCases = resolvedList.map((c) => ({
          id: c.id,
          institution_id: c.institution_id || "00000000-0000-0000-0000-000000000001",
          student_id: c.student_id,
          title: c.selected_intervention_key
            ? c.selected_intervention_key.replace(/_/g, " ")
            : "Support Plan",
          state: c.state,
          selected_intervention_key: c.selected_intervention_key,
          primary_owner_name: c.primary_owner_user_id || "Faculty Mentor",
          tasks_count: c.tasks?.length || 0,
          open_tasks_count:
            c.tasks?.filter((t) => t.state !== "DONE" && t.state !== "COMPLETED").length || 0,
          created_at: c.created_at,
          updated_at: c.updated_at,
          tasks: c.tasks,
          events: c.events,
        } as any));

        setStudentCases([...matchingCalls, ...mappedCases]);
      } else {
        setCasesError(
          err?.message ||
            "Unable to retrieve student support cases. Backend endpoint GET /api/v1/cases/my-cases is pending release."
        );
        setStudentCases([]);
      }
    } finally {
      setIsLoadingCases(false);
    }
  }, [studentId, cases, callRequests, mapCallRequestToSummary]);

  // Prevent stale requests and clean state across user / persona changes
  React.useEffect(() => {
    let active = true;
    setIsLoadingCases(true);
    setCasesError(null);
    setIsDemoPreview(false);
    setStudentCases([]);

    api.proposed
      .getMyCases()
      .then((res) => {
        if (!active) return;
        const backendItems = res.items || [];
        const matchingCalls = callRequests
          .filter(
            (r) =>
              r.student_id === studentId ||
              r.external_student_ref === studentId ||
              studentId === "SYN-1007" ||
              r.student_id === "66666666-6666-6666-6666-666666666666" ||
              r.external_student_ref === "66666666-6666-6666-6666-666666666666"
          )
          .map(mapCallRequestToSummary);

        const merged = [...matchingCalls];
        for (const item of backendItems) {
          if (!merged.some((m) => m.id === item.id)) {
            merged.push(item);
          }
        }
        setStudentCases(merged);
        setIsLoadingCases(false);
      })
      .catch((err) => {
        if (!active) return;
        if (isDemoMode()) {
          const demoFiltered = cases.filter(
            (c) =>
              c.student_id === studentId ||
              c.external_student_ref === studentId ||
              c.student_id === "SYN-1007" ||
              c.external_student_ref === "SYN-1007"
          );
          const resolvedList = demoFiltered.length > 0 ? demoFiltered : DEMO_CASES;
          const matchingCalls = callRequests
            .filter(
              (r) =>
                r.student_id === studentId ||
                r.external_student_ref === studentId ||
                studentId === "SYN-1007"
            )
            .map(mapCallRequestToSummary);

          const mappedCases = resolvedList.map((c) => ({
            id: c.id,
            institution_id: c.institution_id || "00000000-0000-0000-0000-000000000001",
            student_id: c.student_id,
            title: c.selected_intervention_key
              ? c.selected_intervention_key.replace(/_/g, " ")
              : "Support Plan",
            state: c.state,
            selected_intervention_key: c.selected_intervention_key,
            primary_owner_name: c.primary_owner_user_id || "Faculty Mentor",
            tasks_count: c.tasks?.length || 0,
            open_tasks_count:
              c.tasks?.filter((t) => t.state !== "DONE" && t.state !== "COMPLETED").length || 0,
            created_at: c.created_at,
            updated_at: c.updated_at,
            tasks: c.tasks,
            events: c.events,
          } as any));

          setStudentCases([...matchingCalls, ...mappedCases]);
        } else {
          setCasesError(
            err?.message ||
              "Unable to retrieve student support cases. Backend endpoint GET /api/v1/cases/my-cases is pending release."
          );
          setStudentCases([]);
        }
        setIsLoadingCases(false);
      });

    return () => {
      active = false;
    };
  }, [currentPersona?.userId, studentId, cases, callRequests, mapCallRequestToSummary]);

  // Tasks / Next Steps
  const nextSteps = studentCases.flatMap((c: any) =>
    (c.tasks || []).map((t: any) => ({
      ...t,
      caseId: c.id,
      caseTitle: c.selected_intervention_key
        ? c.selected_intervention_key.replace(/_/g, " ")
        : c.title || "Academic Support Plan",
    }))
  );

  // Recent activity events across the student's cases
  const recentEvents = studentCases.flatMap((c: any) =>
    (c.events || []).map((e: any) => ({
      ...e,
      caseId: c.id,
    }))
  );

  return (
    <div className="space-y-6">
      {/* Backend Offline or Authentication Indicator Banner */}
      {mounted && backendError && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 ${
            backendError.toLowerCase().includes("jwt") ||
            backendError.toLowerCase().includes("auth") ||
            backendError.toLowerCase().includes("token") ||
            backendError.toLowerCase().includes("unauthorized")
              ? "bg-rose-50 border border-rose-200/80 text-rose-800"
              : "bg-amber-50 border border-amber-200/80 text-amber-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                backendError.toLowerCase().includes("jwt") ||
                backendError.toLowerCase().includes("auth") ||
                backendError.toLowerCase().includes("token") ||
                backendError.toLowerCase().includes("unauthorized")
                  ? "bg-rose-500"
                  : "bg-amber-500"
              }`}
            />
            {backendError.toLowerCase().includes("jwt") ||
            backendError.toLowerCase().includes("auth") ||
            backendError.toLowerCase().includes("token") ||
            backendError.toLowerCase().includes("unauthorized") ? (
              <span>
                Authentication error ({backendError}). Please sign in to verify your credentials.
              </span>
            ) : isDemoMode() ? (
              <span>Backend service is unreachable ({backendError}). Viewing local student state.</span>
            ) : (
              <span>Backend service is unreachable ({backendError}). Unable to load remote records.</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(backendError.toLowerCase().includes("jwt") ||
              backendError.toLowerCase().includes("auth") ||
              backendError.toLowerCase().includes("token") ||
              backendError.toLowerCase().includes("unauthorized")) && (
              <Link
                href="/login"
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Sign In
              </Link>
            )}
            <button
              onClick={() => refreshBackendData()}
              className="px-3 py-1 bg-white hover:bg-neutral-50 text-neutral-800 rounded-lg text-xs font-semibold border border-neutral-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER: Welcome Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            Welcome back, {user.name}!
          </h1>
          <p className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Enrolled Student</span>
            <span>•</span>
            <span className="font-medium text-neutral-700">Cohort CS-Y2</span>
            <span>•</span>
            <span className="text-neutral-600">
              {activeCampusName || "Apex University Main Campus"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/assessment"
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-50 active:scale-[0.98] text-neutral-800 border border-neutral-200 rounded-xl text-xs font-semibold shadow-2xs transition-all min-h-[42px]"
          >
            <Sparkles className="w-4 h-4 text-neutral-900" />
            <span>Self-Reflection Assessment</span>
          </Link>
          <Link
            href="/request-support"
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-2xs transition-all min-h-[42px]"
          >
            <HeartHandshake className="w-4 h-4 text-white" />
            <span>Request Support</span>
          </Link>
        </div>
      </div>

      {/* 1. Assessment Interactive Callout Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:border-neutral-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                Self-Reflection
              </span>
              <span className="text-xs text-neutral-400 font-mono">18 Questions</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 font-heading mt-1">
              Explore Your Learning Strengths &amp; Support Priorities
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Confidential guidance assessment across 6 dimensions to prepare for your mentor check-in.
            </p>
          </div>
        </div>
        <Link
          href="/assessment"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all shrink-0 active:scale-[0.98]"
        >
          <span>Take Assessment</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. Weekly Happiness Pulse Compact Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:border-neutral-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-neutral-900 fill-neutral-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                Weekly Pulse
              </span>
              <span className="text-xs text-neutral-400 font-mono">6 Questions · Confidential</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 font-heading mt-1">
              Your Weekly Happiness Pulse
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Quick check-in to share feedback on wellbeing, campus life, and student support.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mounted && studentPulseSubmitted ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-100 border border-neutral-300 text-neutral-900 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900" />
              <span>Check-in Complete</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsPulseModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-white text-white" />
              <span>Start check-in</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Voluntary Student Engagement & Rewards Summary Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:border-neutral-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                Points &amp; Rewards
              </span>
              <span suppressHydrationWarning className="text-xs text-neutral-400 font-mono">
                {pointsWallet?.points_this_week ?? 85} pts this week
              </span>
            </div>
            <h3 suppressHydrationWarning className="text-sm sm:text-base font-bold text-neutral-900 font-heading mt-1">
              Your SUTRA Points: {(pointsWallet?.available_balance ?? 385).toLocaleString()} Available
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Earned through voluntary participation in pulses, workshops, and campus activities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link
            href="/shop"
            data-legacy-href="/rewards?tab=store"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-white" />
            <span>Rewards Store</span>
          </Link>
          <Link
            href="/rewards?tab=leaderboard"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-neutral-50 active:scale-[0.98] text-neutral-900 border border-neutral-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-neutral-700" />
            <span>My Progress</span>
          </Link>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN GRID: Left (Support Cases & Activity) | Right (Next Steps & Mentor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 8 cols */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Section: My Support Cases */}
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-bold text-neutral-900 font-heading">
                  My Support Cases
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Track ongoing academic mentorship, tutoring, and student welfare requests.
                </p>
              </div>
              <Link
                href="/cases"
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 hover:underline"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Demonstration Preview Badge */}
            {isDemoPreview && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                <span>
                  <strong>Demonstration Preview:</strong> Viewing synthetic student case (CASE-SYN-1007) for evaluation.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsDemoPreview(false);
                    fetchStudentCases();
                  }}
                  className="text-amber-800 hover:text-amber-950 font-bold underline shrink-0 cursor-pointer"
                >
                  Clear Preview
                </button>
              </div>
            )}

            {isLoadingCases ? (
              <div className="p-4 space-y-3">
                <div className="h-14 bg-neutral-100 rounded-2xl animate-pulse" />
                <div className="h-14 bg-neutral-100 rounded-2xl animate-pulse" />
              </div>
            ) : casesError ? (
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-neutral-900">Student Case History Service</p>
                    <p className="text-neutral-600 mt-0.5">{casesError}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const demoTarget =
                        cases.find(
                          (c) =>
                            c.student_id === "SYN-1007" ||
                            c.external_student_ref === "SYN-1007"
                        ) || DEMO_CASES[0];
                      setStudentCases([
                        {
                          id: demoTarget.id,
                          institution_id:
                            demoTarget.institution_id ||
                            "00000000-0000-0000-0000-000000000001",
                          student_id: demoTarget.student_id,
                          title: demoTarget.selected_intervention_key
                            ? demoTarget.selected_intervention_key.replace(/_/g, " ")
                            : "Support Plan",
                          state: demoTarget.state,
                          selected_intervention_key:
                            demoTarget.selected_intervention_key,
                          primary_owner_name:
                            demoTarget.primary_owner_user_id || "Faculty Mentor",
                          tasks_count: demoTarget.tasks?.length || 0,
                          open_tasks_count:
                            demoTarget.tasks?.filter(
                              (t) => t.state !== "DONE" && t.state !== "COMPLETED"
                            ).length || 0,
                          created_at: demoTarget.created_at,
                          updated_at: demoTarget.updated_at,
                          tasks: demoTarget.tasks,
                          events: demoTarget.events,
                        } as any,
                      ]);
                      setIsDemoPreview(true);
                      setCasesError(null);
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  >
                    Preview Demo Case Record
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchStudentCases()}
                    className="px-3.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-800 rounded-xl text-xs font-semibold border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : studentCases.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-900">
                  No active support cases
                </p>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  You do not have any pending academic or wellbeing support requests.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentCases.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-neutral-50/70 hover:bg-neutral-50 rounded-2xl border border-neutral-200/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900 break-words">
                          {c.selected_intervention_key
                            ? c.selected_intervention_key
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())
                            : "Academic Tutoring & Mentorship"}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          ({c.id})
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                        <span>
                          Created:{" "}
                          <span suppressHydrationWarning className="text-neutral-600 font-normal">
                            {formatDate(c.created_at)}
                          </span>
                        </span>
                        <span>•</span>
                        <span>
                          Status:{" "}
                          <span className="font-semibold text-neutral-800">
                            {c.state.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </span>
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Link
                        href={`/cases/${c.id}`}
                        className="w-full sm:w-auto text-center px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 transition-colors shadow-2xs"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Recent Activity */}
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                Recent Activity
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Timeline of updates, assigned mentors, and verified progress.
              </p>
            </div>

            {recentEvents.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center italic">
                No recent activity recorded.
              </p>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-neutral-100">
                {recentEvents.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="relative flex items-start gap-3.5 pl-1">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-neutral-300 flex items-center justify-center shrink-0 mt-0.5 z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-semibold text-neutral-800">
                        {evt.event_type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p suppressHydrationWarning className="text-[11px] text-neutral-400 mt-0.5">
                        {formatDateTime(evt.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 4 cols */}
        <div className="lg:col-span-4 space-y-6 min-w-0">
          {/* Section: Your Next Steps */}
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                Your Next Steps
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Scheduled check-ins and action items prepared by your assigned mentor.
              </p>
            </div>

            {nextSteps.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center italic">
                No immediate follow-ups scheduled. Check back after your next consultation.
              </p>
            ) : (
              <div className="space-y-2.5">
                {nextSteps.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl mt-0.5 shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-semibold text-neutral-900">
                          {task.generic_label}
                        </h3>
                        <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                          Part of: {task.caseTitle}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Target Timeline:{" "}
                          <span className="font-medium text-neutral-600">
                            Within 48 hours
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-neutral-700 shrink-0 pt-0.5">
                      {task.state.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Assigned Faculty Mentor */}
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                Assigned Faculty Mentor
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Direct advisor assigned for academic guidance and support.
              </p>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-700 font-bold text-xs shrink-0">
                AS
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  Prof. Ananya Sharma
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  Course Instructor &amp; Mentor
                </p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed pt-2 border-t border-neutral-100">
              Department of Computer Science • Office Hours:{" "}
              <span className="font-medium text-neutral-700">Tue/Thu 14:00 - 16:00</span>
            </p>
            <div className="pt-1">
              <Link
                href="/messages"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 hover:text-neutral-950 hover:underline"
              >
                <span>Send Message</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Happiness Pulse Modal Dialog */}
      <HappinessPulseModal
        isOpen={isPulseModalOpen}
        onClose={() => setIsPulseModalOpen(false)}
      />
    </div>
  );
}
