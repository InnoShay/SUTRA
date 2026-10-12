"use client";

import React, { useState } from "react";
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

export default function CasesPage() {
  const { user, currentPersona, cases, activeRole, backendError, refreshBackendData } = useSkillHub();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const isStudent = activeRole === "student";
  const studentId = currentPersona?.userId || "SYN-1007";

  // For students, filter only their own cases; for staff/admin, display permitted cases
  const relevantCases = isStudent
    ? cases.filter(
        (c) => c.student_id === studentId || c.external_student_ref === studentId
      )
    : cases;

  // Search & Status filtering
  const filteredCases = relevantCases.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.student_display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.selected_intervention_key &&
        c.selected_intervention_key.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "RESOLVED") return c.state === "RESOLVED" || c.state === "CLOSED";
    if (statusFilter === "ACTIVE")
      return c.state !== "RESOLVED" && c.state !== "CLOSED";
    return true;
  });

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
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>Backend service is unreachable ({backendError}). Viewing local case cache.</span>
          </div>
          <button
            onClick={() => refreshBackendData()}
            className="px-3 py-1 bg-white hover:bg-neutral-50 text-neutral-800 rounded-lg text-xs font-semibold border border-amber-200 transition-colors shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Case List */}
      <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
        {filteredCases.length === 0 ? (
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
            {filteredCases.map((c) => {
              const isResolved = c.state === "RESOLVED" || c.state === "CLOSED";
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
                              .replace(/\b\w/g, (l) => l.toUpperCase())
                          : "Academic Support & Mentorship Plan"}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        ({c.id})
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isResolved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : c.state === "FOLLOW_UP_REQUIRED"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-neutral-100 text-neutral-700 border-neutral-200"
                        }`}
                      >
                        {c.state.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-500 flex flex-wrap items-center gap-2">
                      <span>Submitted: {new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span>•</span>
                      <span>Assigned to: <strong className="text-neutral-700 font-semibold">{c.primary_owner_user_id || "Faculty Mentor"}</strong></span>
                      <span>•</span>
                      <span>Tasks: {c.tasks?.length || 0} scheduled</span>
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
