"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { CaseDetailDTO, CaseState } from "@/lib/types";
import {
  Users,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  Lock,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function CommunityPage() {
  const {
    cases,
    students,
    activeRole,
    backendConnected,
    isLoadingBackend,
    refreshBackendData,
    transitionCase,
  } = useSkillHub();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Canonical Case States for Filtering
  const stateFilters: { key: string; label: string }[] = [
    { key: "all", label: "All Cases" },
    { key: "NEW", label: "New" },
    { key: "TRIAGED", label: "Triaged" },
    { key: "IN_PROGRESS", label: "In Progress" },
    { key: "FOLLOW_UP_REQUIRED", label: "Follow-Up" },
    { key: "RESOLVED", label: "Resolved" },
    { key: "CLOSED", label: "Closed" },
  ];

  // Filter cases strictly from authoritative store collection
  const filteredCases = cases.filter((c) => {
    const matchesState =
      selectedStateFilter === "all" ||
      c.state?.toUpperCase() === selectedStateFilter.toUpperCase();

    const matchesSearch =
      searchQuery === "" ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.student_display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.external_student_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.selected_intervention_key &&
        c.selected_intervention_key.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesState && matchesSearch;
  });

  const activeSelectedCase =
    cases.find((c) => c.id === selectedCaseId) ||
    filteredCases[0] ||
    cases[0] ||
    null;

  return (
    <div className="space-y-6">
      {/* 1. HEADER: Title, Operational Status & Sync Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Case Collaboration &amp; Triage
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Multidisciplinary closed-loop support threads, action progress tracking, and institutional SLA governance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshBackendData()}
            disabled={isLoadingBackend}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-200/80 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-all shadow-2xs active:scale-[0.98]"
            title="Refresh Cases"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-neutral-500 ${
                isLoadingBackend ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. LEADERSHIP ADR-004 PRIVACY ENFORCEMENT */}
      {activeRole === "leadership" ? (
        <div className="skill-card p-8 bg-white border border-neutral-200/80 rounded-3xl flex flex-col sm:flex-row items-center gap-5 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <h3 className="text-base font-bold text-neutral-900 font-heading">
              Institutional Privacy Protection (ADR-004)
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-xl">
              Leadership roles are restricted from inspecting individual student case notes and collaborative triage threads. Cohort-level statistical indicators are available on the institutional analytics view.
            </p>
          </div>
          <Link
            href="/analytics"
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-full shadow-sm whitespace-nowrap transition-all"
          >
            View Cohort Analytics →
          </Link>
        </div>
      ) : (
        <>
          {/* 3. CASE SEARCH & STATE FILTERS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* State filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {stateFilters.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStateFilter(tab.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[34px] ${
                    selectedStateFilter === tab.key
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/70 border border-neutral-200/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by case ID, student, protocol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-neutral-200/80 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* 4. MAIN COLLABORATION SPLIT: Case Thread List (Left) & Active Case Detail Inspector (Right) */}
          {cases.length === 0 ? (
            <div className="skill-card p-12 bg-white border border-neutral-200/70 rounded-3xl text-center space-y-3 shadow-xs">
              <FolderOpen className="w-10 h-10 text-neutral-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-800">
                  No Active Support Cases
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Zero active support cases recorded. Any future triaged signals will open case threads here.
                </p>
              </div>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="skill-card p-12 bg-white border border-neutral-200/70 rounded-3xl text-center space-y-3 shadow-xs">
              <Filter className="w-8 h-8 text-neutral-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-800">
                  No Cases Match Filter
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  No cases found for the selected state or search criteria.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedStateFilter("all");
                  setSearchQuery("");
                }}
                className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-full transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT: Case Threads Roster (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Tracked Cases ({filteredCases.length})
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    SLA Window: 48h
                  </span>
                </div>

                <div className="space-y-2.5">
                  {filteredCases.map((c) => {
                    const isSelected = activeSelectedCase?.id === c.id;
                    const isEscalated = c.is_escalated;

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCaseId(c.id)}
                        className={`skill-card p-4 rounded-2xl cursor-pointer transition-all border text-left ${
                          isSelected
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-900/10"
                            : "bg-white hover:bg-neutral-50/80 border-neutral-200/70 text-neutral-800 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[11px] font-mono font-semibold flex items-center gap-1.5 ${
                              isSelected ? "text-white" : "text-neutral-800"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? "bg-white" : "bg-neutral-800"
                              }`}
                            />
                            {c.state}
                          </span>
                          <span
                            className={`text-[11px] font-mono ${
                              isSelected ? "text-neutral-400" : "text-neutral-400"
                            }`}
                          >
                            {c.id}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <h4
                            className={`text-sm font-bold tracking-tight truncate ${
                              isSelected ? "text-white" : "text-neutral-900"
                            }`}
                          >
                            {c.student_display_name || "Enrolled Student"}
                          </h4>
                          <p
                            className={`text-xs truncate ${
                              isSelected ? "text-neutral-300" : "text-neutral-500"
                            }`}
                          >
                            Protocol:{" "}
                            {(c.selected_intervention_key || "Academic Mentorship").replace(/_/g, " ")}
                          </p>
                        </div>

                        <div
                          className={`mt-3 pt-2.5 flex items-center justify-between text-[11px] border-t ${
                            isSelected
                              ? "border-white/10 text-neutral-400"
                              : "border-neutral-100 text-neutral-400"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {c.due_at
                                ? new Date(c.due_at).toLocaleDateString()
                                : "Scheduled"}
                            </span>
                          </span>
                          {isEscalated ? (
                            <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Escalated
                            </span>
                          ) : (
                            <span
                              className={`font-medium ${
                                isSelected ? "text-emerald-300" : "text-emerald-600"
                              }`}
                            >
                              On Track
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Active Case Detail & Verified Collaboration Workspace (7 cols) */}
              {activeSelectedCase && (
                <div className="lg:col-span-7 skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/70 space-y-6 shadow-sm sticky top-6">
                  {/* Case Title & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold text-neutral-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                          {activeSelectedCase.state}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">
                          {activeSelectedCase.id}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-heading">
                        {activeSelectedCase.student_display_name || "Enrolled Student"}
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Student Ref: <span className="font-mono text-neutral-700">{activeSelectedCase.external_student_ref}</span> • 
                        Originating Signal: <span className="font-mono text-neutral-700">{activeSelectedCase.originating_signal_id || "Direct Referral"}</span>
                      </p>
                    </div>

                    <Link
                      href={`/students/${activeSelectedCase.student_id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 border border-neutral-200/60 transition-colors self-start shadow-2xs"
                      title="Inspect Student 360"
                    >
                      <span>360° Profile</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
                    </Link>
                  </div>

                  {/* Case Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Assigned Intervention
                      </span>
                      <span className="font-bold text-neutral-900 block capitalize">
                        {(activeSelectedCase.selected_intervention_key || "Academic Mentoring").replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Case Owner
                      </span>
                      <span className="font-bold text-neutral-900 block truncate">
                        {activeSelectedCase.primary_owner_user_id || "Unassigned Coordinator"}
                      </span>
                    </div>
                  </div>

                  {/* Canonical 10-State Progression Action */}
                  <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800">
                        Lifecycle Progression
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        State Machine v1.0
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Advance case through institutional SLA review states according to established case governance policy.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const nextState: CaseState =
                            activeSelectedCase.state === "NEW"
                              ? "TRIAGED"
                              : activeSelectedCase.state === "TRIAGED"
                              ? "UNDER_REVIEW"
                              : activeSelectedCase.state === "UNDER_REVIEW"
                              ? "ACTIONABLE"
                              : activeSelectedCase.state === "ACTIONABLE"
                              ? "ASSIGNED"
                              : activeSelectedCase.state === "ASSIGNED"
                              ? "ACCEPTED"
                              : activeSelectedCase.state === "ACCEPTED"
                              ? "IN_PROGRESS"
                              : activeSelectedCase.state === "IN_PROGRESS"
                              ? "FOLLOW_UP_REQUIRED"
                              : activeSelectedCase.state === "FOLLOW_UP_REQUIRED"
                              ? "RESOLVED"
                              : "CLOSED";

                          transitionCase(activeSelectedCase.id, {
                            to_state: nextState,
                            reason_code: "collaborative_progress",
                          });
                        }}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white text-xs font-semibold rounded-full shadow-sm transition-all"
                      >
                        Advance State ({activeSelectedCase.state} → Next)
                      </button>
                    </div>
                  </div>

                  {/* Logged Follow-ups & Collaboration Audit Trail */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Formal Follow-Up Records ({activeSelectedCase.follow_ups?.length || 0})
                      </h4>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        Auditable History
                      </span>
                    </div>

                    {!activeSelectedCase.follow_ups || activeSelectedCase.follow_ups.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-neutral-50 text-center text-xs text-neutral-400">
                        No formal follow-up contacts recorded yet for this case.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeSelectedCase.follow_ups.map((fu, idx) => (
                          <div
                            key={fu.id || idx}
                            className="p-3.5 rounded-2xl bg-neutral-50/80 border border-neutral-100 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-neutral-900 capitalize">
                                {fu.follow_up_type.replace(/_/g, " ")} • {fu.contact_status || "Completed"}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {fu.proof_kind}
                              </span>
                            </div>
                            {fu.sanitized_note && (
                              <p className="text-neutral-600 leading-relaxed text-[11px]">
                                {fu.sanitized_note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
