"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import {
  Sliders,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen,
  AlertCircle,
  HelpCircle,
  Activity,
  UserCheck,
} from "lucide-react";

export default function CoursesPage() {
  const {
    interventions,
    mlModelInfo,
    backendConnected,
    isLoadingBackend,
    refreshBackendData,
    backendError,
    activeRole,
  } = useSkillHub();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");

  // Domains present in canonical catalog: mentor, academic, finance, counselling
  const domains = [
    { key: "all", label: "All Protocols" },
    { key: "mentor", label: "Mentorship" },
    { key: "academic", label: "Academic Support" },
    { key: "counselling", label: "Wellbeing & Counseling" },
    { key: "finance", label: "Financial Consultation" },
  ];

  const filteredInterventions = interventions.filter((item) => {
    const matchesDomain =
      selectedDomain === "all" ||
      item.domain?.toLowerCase() === selectedDomain.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      item.display_label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.intervention_key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDomain && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. HEADER: Title, Operational Status & Telemetry Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Intervention Catalog &amp; Governance
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                backendConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                  : "bg-amber-50 text-amber-700 border-amber-200/60"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendConnected
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              <span>
                {backendConnected
                  ? "Authoritative Catalog (FastAPI)"
                  : "Synthetic Catalog (Demo)"}
              </span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Institutional early-warning support protocols, human approval policies, and calibrated ML governance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshBackendData()}
            disabled={isLoadingBackend}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-200/80 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-all shadow-2xs active:scale-[0.98]"
            title="Refresh Catalog Data"
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

      {/* 2. ML MODEL GOVERNANCE & POLICY BASELINE */}
      <div className="skill-card p-6 bg-white border border-neutral-200/70 rounded-3xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 font-heading">
                  Early-Warning ML Governance Baseline
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 border border-neutral-200/60">
                  {mlModelInfo?.model_version || "v1.0.0"}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Model: <span className="font-medium text-neutral-700">{mlModelInfo?.model_name || "LogisticRegression_Day30"}</span> • 
                Cutoff: <span className="font-medium text-neutral-700">{mlModelInfo?.cutoff_days || 30} Days</span> • 
                Policy: <span className="font-medium text-neutral-700 font-mono text-[11px]">{mlModelInfo?.active_policy_key || "POLICY-DEFAULT"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Calibrated Baseline</span>
            </span>
          </div>
        </div>

        {/* Verified ML parameters from backend contract */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Operating Threshold
              </span>
              <Activity className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <span className="block text-xl font-extrabold text-neutral-900 mt-1">
              {mlModelInfo?.decision_threshold ?? mlModelInfo?.threshold ?? 0.46}
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              Risk score trigger cut-off
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Temporal Features
              </span>
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <span className="block text-xl font-extrabold text-neutral-900 mt-1">
              {mlModelInfo?.features?.length || 5} Verified Inputs
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5 truncate">
              {mlModelInfo?.features ? mlModelInfo.features.slice(0, 2).join(", ") + "..." : "Attendance, VLE signals"}
            </span>
          </div>

          <div className="p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Governance Boundary
              </span>
              <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <span className="block text-xl font-extrabold text-neutral-900 mt-1">
              Human In The Loop
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5">
              No alert without human review
            </span>
          </div>
        </div>
      </div>

      {/* 3. CATALOG FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Domain Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {domains.map((dom) => (
            <button
              key={dom.key}
              onClick={() => setSelectedDomain(dom.key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] ${
                selectedDomain === dom.key
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/70 border border-neutral-200/60"
              }`}
            >
              {dom.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search protocols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full bg-white border border-neutral-200/80 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* 4. CANONICAL INTERVENTIONS PROTOCOL GRID */}
      {filteredInterventions.length === 0 ? (
        <div className="skill-card p-12 bg-white border border-neutral-200/70 rounded-3xl text-center space-y-3">
          <BookOpen className="w-10 h-10 text-neutral-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-800">
              No Interventions Found
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              {interventions.length === 0
                ? "The institutional intervention catalog contains zero registered protocols."
                : "No intervention protocols match the current search or domain filter criteria."}
            </p>
          </div>
          {interventions.length > 0 && (
            <button
              onClick={() => {
                setSelectedDomain("all");
                setSearchQuery("");
              }}
              className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-full transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredInterventions.map((item) => (
            <div
              key={item.intervention_key}
              className="skill-card bg-white p-6 rounded-3xl border border-neutral-200/70 flex flex-col justify-between hover:border-neutral-300 transition-all shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200/60 font-mono">
                    {item.domain}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <span className="text-[11px] font-medium">Owner:</span>
                    <span className="font-semibold text-neutral-700 capitalize">
                      {item.recipient_role}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-neutral-900 tracking-tight font-heading">
                    {item.display_label}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    {item.description || "Institutional standardized support intervention."}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200/60">
                    {item.intervention_key}
                  </span>
                  {item.requires_human_approval && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                      Approval Required
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Protocol Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. PRIVACY & COMPLIANCE FOOTNOTE */}
      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-400 flex items-start sm:items-center gap-3">
        <Shield className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-relaxed">
          <strong className="text-neutral-700 font-semibold">Institutional Governance (ADR-003 &amp; ADR-004):</strong> Intervention assignment adheres to strict institutional role boundaries. Financial aid consultations are segregated from general academic observations.
        </p>
      </div>
    </div>
  );
}
