"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  HeartHandshake,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import { StudentCaseSummaryDTO } from "@/lib/types";
import { api, isDemoMode } from "@/lib/api";
import { DEMO_CASES } from "@/lib/skillhub-data";

export default function CasesPage() {
  const { user, currentPersona, cases, callRequests, activeRole, backendConnected, backendError, refreshBackendData } = useSkillHub();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const isStudent = activeRole === "student";
  const studentId = currentPersona?.userId || "SYN-1007";

  // Authenticated student-scoped case state
  const [studentCases, setStudentCases] = useState<StudentCaseSummaryDTO[]>([]);
  const [isLoadingStudentCases, setIsLoadingStudentCases] = useState(isStudent);
  const [studentCasesError, setStudentCasesError] = useState<string | null>(null);

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
    if (!isStudent) return;
    setIsLoadingStudentCases(true);
    setStudentCasesError(null);
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
        }));

        setStudentCases([...matchingCalls, ...mappedCases]);
      } else {
        setStudentCasesError(
          err?.message ||
            "Unable to retrieve student support cases. Backend endpoint GET /api/v1/cases/my-cases is pending release."
        );
        setStudentCases([]);
      }
    } finally {
      setIsLoadingStudentCases(false);
    }
  }, [isStudent, studentId, cases, callRequests, mapCallRequestToSummary]);

  // Load student cases on mount or identity change, clearing stale data
  React.useEffect(() => {
    if (!isStudent) {
      setIsLoadingStudentCases(false);
      setStudentCasesError(null);
      return;
    }
    let active = true;
    setIsLoadingStudentCases(true);
    setStudentCasesError(null);
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
        setIsLoadingStudentCases(false);
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
          }));

          setStudentCases([...matchingCalls, ...mappedCases]);
        } else {
          setStudentCasesError(
            err?.message ||
              "Unable to retrieve student support cases. Backend endpoint GET /api/v1/cases/my-cases is pending release."
          );
          setStudentCases([]);
        }
        setIsLoadingStudentCases(false);
      });

    return () => {
      active = false;
    };
  }, [isStudent, user.fullName, currentPersona?.userId, studentId, cases, callRequests, mapCallRequestToSummary]);

  // For students: student-scoped records; for staff: campus-wide authorized queue
  const relevantCases = isStudent ? (studentCases as any[]) : cases;

  // Search & Status filtering
  const filteredCases = relevantCases.filter((c) => {
    const studentName = (c as any).student_display_name || (c as any).title || "";
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.selected_intervention_key &&
        c.selected_intervention_key.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "RESOLVED") return c.state === "RESOLVED" || c.state === "CLOSED";
    if (statusFilter === "ACTIVE")
      return c.state !== "RESOLVED" && c.state !== "CLOSED";
    return true;
  });

  const backendErrorText = backendError?.toLowerCase() || "";
  const backendRequiresAuthentication = /auth|token|unauthor|forbidden|permission|campus/.test(backendErrorText);
  const backendIsUnreachable = !backendConnected || /unable to connect|network|failed to fetch|backend offline/.test(backendErrorText);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            {isStudent ? "My Support Cases" : "Student Support Cases"}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {isStudent
              ? "Track your support requests, scheduled check-ins, and consultation progress."
              : "Review active student cases, task assignments, and intervention milestones."}
          </p>
        </div>

        {isStudent && (
          <Link
            href="/request-support"
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
          >
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span>Request Support</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case reference or subject..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-xs text-neutral-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Cases</option>
            <option value="RESOLVED">Resolved Cases</option>
          </select>
        </div>
      </div>

      {/* Backend Offline Indicator Banner */}
      {backendError && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 ${
            backendRequiresAuthentication
              ? "bg-rose-50 border border-rose-200/80 text-rose-800"
              : "bg-amber-50 border border-amber-200/80 text-amber-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                backendRequiresAuthentication
                  ? "bg-rose-500"
                  : "bg-amber-500"
              }`}
            />
            {backendRequiresAuthentication ? (
              <span>Authentication error ({backendError}). Please sign in to verify your credentials.</span>
            ) : backendIsUnreachable ? (
              <span>Backend service is unreachable ({backendError}).</span>
            ) : (
              <span>The backend is available but did not return this case data ({backendError}).</span>
            )}
          </div>
          <button
            onClick={() => refreshBackendData()}
            className="px-3 py-1 bg-white hover:bg-neutral-50 text-neutral-800 rounded-lg text-xs font-semibold border border-neutral-200 transition-colors shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Case List */}
      <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
        {isStudent && isLoadingStudentCases ? (
          <div className="p-6 space-y-4">
            <div className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
            <div className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
          </div>
        ) : isStudent && studentCasesError ? (
          <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-neutral-900">Student Case History Service</p>
                <p className="text-neutral-600 mt-0.5">{studentCasesError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => fetchStudentCases()}
                className="px-3.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-800 rounded-xl text-xs font-semibold border border-amber-300 transition-colors shrink-0 shadow-2xs cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center bg-neutral-50 rounded-2xl border border-neutral-100">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-neutral-900">
              No matching cases found
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Try adjusting your search query or filter."
                : "You currently have no open support cases."}
            </p>
            {isStudent && (
              <div className="mt-4">
                <Link
                  href="/request-support"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-full hover:bg-neutral-800 transition-colors"
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Submit a Request</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCases.map((c: any) => {
              const isResolved = c.state === "RESOLVED" || c.state === "CLOSED";
              const taskCount = c.tasks_count !== undefined ? c.tasks_count : (c.tasks?.length || 0);
              const ownerName = c.primary_owner_name || c.primary_owner_user_id || "Faculty Mentor";
              return (
                <div
                  key={c.id}
                  className="p-5 bg-neutral-50/70 hover:bg-neutral-50 rounded-2xl border border-neutral-200/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-neutral-900 truncate">
                        {c.selected_intervention_key
                          ? c.selected_intervention_key
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l: string) => l.toUpperCase())
                          : c.title || "Academic Support & Mentorship Plan"}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        ({c.id})
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isResolved
                              ? "bg-emerald-500"
                              : c.state === "FOLLOW_UP_REQUIRED"
                              ? "bg-amber-500"
                              : "bg-neutral-400"
                          }`}
                        />
                        <span>{c.state.replace(/_/g, " ")}</span>
                      </span>
                    </div>

                    <p className="text-xs text-neutral-500 flex flex-wrap items-center gap-2">
                      <span>Submitted: {new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span>•</span>
                      <span>Assigned to: <strong className="text-neutral-700 font-semibold">{ownerName}</strong></span>
                      <span>•</span>
                      <span>Tasks: {taskCount} scheduled</span>
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Link
                      href={`/cases/${c.id}`}
                      className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-full text-xs font-semibold text-neutral-800 transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <span>View Case Details</span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
