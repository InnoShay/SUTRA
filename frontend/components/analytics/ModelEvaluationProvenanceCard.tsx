"use client";

import React from "react";
import { ModelDatasetProvenance, LiveMonitoringTelemetryDTO } from "@/lib/types";
import { Database, ShieldAlert, Cpu, Calendar, Activity, CheckCircle2, AlertTriangle, Layers } from "lucide-react";

interface ModelEvaluationProvenanceCardProps {
  modelName: string;
  modelVersion: string;
  operationalThreshold: number;
  datasetProvenance: ModelDatasetProvenance;
  liveTelemetry?: LiveMonitoringTelemetryDTO | null;
}

export function ModelEvaluationProvenanceCard({
  modelName,
  modelVersion,
  operationalThreshold,
  datasetProvenance,
  liveTelemetry,
}: ModelEvaluationProvenanceCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
      {/* Top Banner: Model Version & Environment Distinction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{modelName}</h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                <span>v{modelVersion}</span>
                <span className="text-slate-300">•</span>
                <span>Threshold: {operationalThreshold.toFixed(2)}</span>
                <span className="text-slate-300">•</span>
                <span>Cutoff: Day 30</span>
              </div>
            </div>
          </div>
        </div>

        {/* Environment Distinction Badge (Requirement 5) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-900 text-xs font-semibold">
            <Database className="w-4 h-4 text-purple-600" />
            <span>OFFLINE HELD-OUT BENCHMARK</span>
          </div>

          {liveTelemetry && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold">
              <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>LIVE TELEMETRY ACTIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Provenance Metadata Grid (Requirement 6) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 my-5 text-sm">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Dataset Identity</div>
          <div className="font-semibold text-slate-900 truncate mt-1" title={datasetProvenance.dataset_label}>
            {datasetProvenance.dataset_label}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Evaluation Partition</div>
          <div className="font-semibold text-slate-900 truncate mt-1" title={datasetProvenance.partition}>
            {datasetProvenance.partition}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Sample Size (N)</div>
          <div className="font-semibold text-slate-900 mt-1">
            {datasetProvenance.sample_size.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-500">
              ({datasetProvenance.unique_students.toLocaleString()} students)
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Class Prevalence</div>
          <div className="font-semibold text-slate-900 mt-1">
            {(datasetProvenance.class_prevalence * 100).toFixed(1)}%{" "}
            <span className="text-xs font-normal text-slate-500">
              ({datasetProvenance.actual_at_risk_count.toLocaleString()} at-risk)
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Outcome Target</div>
          <div className="font-semibold text-slate-900 truncate mt-1" title={datasetProvenance.outcome_definition}>
            Binary Withdrawal
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Evaluation Date</div>
          <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {datasetProvenance.evaluation_date}
          </div>
        </div>
      </div>

      {/* Historical Partition Governance Warning (Requirement 6 & Methodological Integrity) */}
      {datasetProvenance.provenance_warning && (
        <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold">Historical Partition Notice: </strong>
            {datasetProvenance.provenance_warning}
          </div>
        </div>
      )}

      {/* Live Production Telemetry Distinction (Requirement 5) */}
      {liveTelemetry && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-4">
            <span>
              <strong>Live Inferences Audited:</strong> {liveTelemetry.total_inferences_logged}
            </span>
            <span>
              <strong>Avg Latency:</strong> {liveTelemetry.average_latency_ms.toFixed(1)}ms
            </span>
            <span>
              <strong>Campuses Active:</strong> {liveTelemetry.active_campus_count}
            </span>
          </div>
          <span className="text-slate-400 italic">
            Telemetry tracks serving execution throughput, not offline generalization accuracy.
          </span>
        </div>
      )}
    </div>
  );
}
