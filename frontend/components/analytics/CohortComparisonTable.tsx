"use client";

import React, { useState } from "react";
import { Lock, Search, ShieldCheck, Users } from "lucide-react";
import { CohortBreakdownItem } from "@/lib/types";

interface CohortComparisonTableProps {
  cohorts?: CohortBreakdownItem[];
  selectedCohort?: string;
  onSelectCohort?: (cohort: string) => void;
  className?: string;
}

export function CohortComparisonTable({
  cohorts = [],
  selectedCohort = "",
  onSelectCohort,
  className = "",
}: CohortComparisonTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCohorts = cohorts.filter((c) =>
    c.cohort_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`skill-card p-5 sm:p-6 bg-white relative rounded-3xl border border-neutral-200/80 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div>
          <h3 className="text-base font-bold text-neutral-900 tracking-tight font-heading">
            Cohort &amp; Programme Risk Comparison
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Aggregated cohort indicators with automatic ADR-004 small-group privacy protection
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative w-full sm:w-48">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search cohort..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto pt-3">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-200/80 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              <th className="py-2.5 px-3">Cohort Code</th>
              <th className="py-2.5 px-3">Enrolled (N)</th>
              <th className="py-2.5 px-3">Evaluated</th>
              <th className="py-2.5 px-3">At-Risk Count</th>
              <th className="py-2.5 px-3">At-Risk Rate (%)</th>
              <th className="py-2.5 px-3 text-right">Privacy Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-700">
            {filteredCohorts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                  No cohort records match the criteria.
                </td>
              </tr>
            ) : (
              filteredCohorts.map((cohort) => {
                const isSelected = selectedCohort === cohort.cohort_code;
                const isSuppressed = cohort.is_privacy_suppressed;

                return (
                  <tr
                    key={cohort.cohort_code}
                    onClick={() => onSelectCohort && onSelectCohort(cohort.cohort_code)}
                    className={`hover:bg-neutral-50/80 transition-colors cursor-pointer ${
                      isSelected ? "bg-neutral-50 font-semibold" : ""
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-medium text-neutral-900">
                      {cohort.cohort_code}
                    </td>
                    <td className="py-3 px-3">{cohort.total_students}</td>
                    <td className="py-3 px-3">{cohort.evaluated_count}</td>

                    {/* At-Risk Count */}
                    <td className="py-3 px-3">
                      {isSuppressed ? (
                        <span className="text-neutral-400 italic font-mono text-[11px]">
                          &lt; 5 (Masked)
                        </span>
                      ) : (
                        <span className={(cohort.at_risk_count ?? 0) > 0 ? "text-rose-600 font-semibold" : "text-neutral-600"}>
                          {cohort.at_risk_count ?? 0}
                        </span>
                      )}
                    </td>

                    {/* At-Risk Rate */}
                    <td className="py-3 px-3">
                      {isSuppressed ? (
                        <span className="text-neutral-400 italic text-[11px]">
                          Protected
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, cohort.at_risk_percentage ?? 0)}%` }}
                              className="h-full bg-rose-500 rounded-full"
                            />
                          </div>
                          <span>{cohort.at_risk_percentage ?? 0}%</span>
                        </div>
                      )}
                    </td>

                    {/* Privacy Status */}
                    <td className="py-3 px-3 text-right">
                      {isSuppressed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-700">
                          <Lock className="w-3 h-3 text-amber-600" />
                          ADR-004 Suppressed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Authorized
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-3 text-[11px] text-neutral-400 flex items-center justify-between">
        <span>Click any cohort row to filter institutional telemetry.</span>
        <span>Small subgroups (&lt; 5 students) are automatically masked.</span>
      </div>
    </div>
  );
}
