"use client";

import React, { useState } from "react";
import { SubgroupMetricDTO } from "@/lib/types";
import { ShieldAlert, AlertTriangle, Filter, Lock, HelpCircle } from "lucide-react";

interface SubgroupFairnessTableProps {
  subgroupMetrics: SubgroupMetricDTO[];
  fairnessDisclaimer: string;
}

export function SubgroupFairnessTable({
  subgroupMetrics,
  fairnessDisclaimer = "FAIRNESS & PARITY NOTICE: Disaggregated subgroup metrics highlight performance differences across courses, demographics, and prior education. The presence of this dashboard does NOT demonstrate that the model is fair, unbiased, or suitable for automated high-stakes decisions.",
}: SubgroupFairnessTableProps) {

  const [selectedDimension, setSelectedDimension] = useState<string>("all");

  const dimensions = Array.from(new Set(subgroupMetrics.map((m) => m.dimension))).sort();

  const filteredMetrics = selectedDimension === "all"
    ? subgroupMetrics
    : subgroupMetrics.filter((m) => m.dimension === selectedDimension);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Subgroup Parity & Demographic Disaggregation</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Empirical performance across course modules, demographics, and educational background
          </p>
        </div>

        {/* Dimension Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedDimension}
            onChange={(e) => setSelectedDimension(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Filter subgroup dimension"
          >
            <option value="all">All Dimensions ({subgroupMetrics.length})</option>
            {dimensions.map((dim) => (
              <option key={dim} value={dim}>
                {dim}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mandatory Governance Fairness Disclaimer (Requirement 8) */}
      <div className="my-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold">Fairness & Parity Notice: </strong>
          {fairnessDisclaimer}
        </div>
      </div>

      {/* Subgroup Metrics Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg my-2">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th className="px-3.5 py-2.5">Dimension</th>
              <th className="px-3.5 py-2.5">Subgroup</th>
              <th className="px-3.5 py-2.5 text-right">Sample (N)</th>
              <th className="px-3.5 py-2.5">Confidence Status</th>
              <th className="px-3.5 py-2.5 text-right">Prevalence</th>
              <th className="px-3.5 py-2.5 text-right">Recall (Catch Rate)</th>
              <th className="px-3.5 py-2.5 text-right">Precision</th>
              <th className="px-3.5 py-2.5 text-right">False Alarm Rate</th>
              <th className="px-3.5 py-2.5 text-right">ROC-AUC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredMetrics.map((row, idx) => {
              if (row.is_suppressed || row.sample_size < 5) {
                return (
                  <tr key={`${row.dimension}-${row.subgroup}-${idx}`} className="bg-slate-50/50">
                    <td className="px-3.5 py-2 font-medium text-slate-900">{row.dimension}</td>
                    <td className="px-3.5 py-2 font-medium text-slate-800">{row.subgroup}</td>
                    <td className="px-3.5 py-2 text-right font-mono text-slate-500">{row.sample_size}</td>
                    <td colSpan={6} className="px-3.5 py-2 text-center text-amber-700 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {"[Suppressed under ADR-004: Cell size N < 5]"}
                      </span>
                    </td>
                  </tr>
                );
              }

              const isLowConfidence = row.confidence_flag === "LOW_CONFIDENCE (<100)";

              return (
                <tr key={`${row.dimension}-${row.subgroup}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-3.5 py-2 font-medium text-slate-900">{row.dimension}</td>
                  <td className="px-3.5 py-2 font-semibold text-slate-800">{row.subgroup}</td>
                  <td className="px-3.5 py-2 text-right font-mono text-slate-600">
                    {row.sample_size.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-2">
                    {isLowConfidence ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{"Low Confidence (N < 100)"}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Stable Sample</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono text-slate-600">
                    {(row.prevalence * 100).toFixed(1)}%
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono font-semibold text-amber-700">
                    {(row.recall * 100).toFixed(1)}%
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono text-indigo-700">
                    {(row.precision * 100).toFixed(1)}%
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono text-rose-700">
                    {(row.false_positive_rate * 100).toFixed(1)}%
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono text-slate-700">
                    {row.roc_auc > 0 ? row.roc_auc.toFixed(3) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[11px] text-slate-500 leading-relaxed">
        <strong>Subgroup Insight:</strong> Notable recall disparity exists across course modules (e.g., Module AAA achieves 40.0% recall, while Module GGG reaches 87.5% recall). Low confidence flags are strictly assigned to sample sizes below 100 registrations.
      </div>
    </div>
  );
}
