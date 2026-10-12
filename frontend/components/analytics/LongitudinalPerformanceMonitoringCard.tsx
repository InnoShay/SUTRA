'use client';

import React from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Activity,
  Layers,
} from 'lucide-react';
import { HistoricalPerformanceMonitoringResponse } from '@/lib/types';

interface LongitudinalPerformanceMonitoringCardProps {
  monitoringData: HistoricalPerformanceMonitoringResponse | null;
  isLoading?: boolean;
}

export default function LongitudinalPerformanceMonitoringCard({
  monitoringData,
  isLoading = false,
}: LongitudinalPerformanceMonitoringCardProps) {
  if (isLoading) {
    return (
      <div className="bg-[#121620] border border-white/5 rounded-2xl p-6 flex items-center justify-center min-h-[250px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Loading longitudinal performance tracking...</p>
        </div>
      </div>
    );
  }

  if (!monitoringData) {
    return null;
  }

  const { evaluations = [], outcome_definition, evaluation_protocol_notice, governance_disclaimers } = monitoringData;

  return (
    <div className="bg-[#121620] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white tracking-tight">
              Longitudinal Model Performance &amp; Drift Monitoring
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              • Protocol: Setting 2
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Separates retrospective ground-truth evaluation from continuous live operational monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 self-start sm:self-auto">
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>Outcome: {outcome_definition}</span>
        </div>
      </div>

      {/* Protocol Banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 flex items-start gap-3">
        <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-200/90 leading-relaxed">
          <span className="font-semibold text-indigo-300">Longitudinal Evaluation Standard: </span>
          {evaluation_protocol_notice} Model performance (ROC-AUC, Precision, Recall) cannot be evaluated mid-term because final outcomes require official registrar grade locks upon semester completion.
        </div>
      </div>

      {/* Cohort Evaluations Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.03] text-slate-400 font-mono border-b border-white/5">
            <tr>
              <th className="py-2.5 px-3">Cohort Partition</th>
              <th className="py-2.5 px-3">Sample (N)</th>
              <th className="py-2.5 px-3">Ground Truth Status</th>
              <th className="py-2.5 px-3">ROC-AUC</th>
              <th className="py-2.5 px-3">Recall</th>
              <th className="py-2.5 px-3">Precision</th>
              <th className="py-2.5 px-3">FPR</th>
              <th className="py-2.5 px-3">Brier Score</th>
              <th className="py-2.5 px-3">Drift Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {evaluations.map((ev, idx) => {
              const isHistorical = ev.ground_truth_status === 'AVAILABLE_HISTORICAL';

              return (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-medium text-white">
                    <div>{ev.cohort_label}</div>
                    <span className="text-[10px] font-mono text-slate-400">{ev.model_version}</span>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {ev.labeled_sample_size > 0 ? ev.labeled_sample_size.toLocaleString() : 'Pending'}
                  </td>
                  <td className="py-3 px-3">
                    {isHistorical ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Certified Outcomes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Pending Day 120
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold">
                    {ev.realized_roc_auc != null ? ev.realized_roc_auc.toFixed(4) : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {ev.realized_recall != null ? `${(ev.realized_recall * 100).toFixed(2)}%` : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {ev.realized_precision != null ? `${(ev.realized_precision * 100).toFixed(2)}%` : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {ev.realized_fpr != null ? `${(ev.realized_fpr * 100).toFixed(2)}%` : '—'}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {ev.realized_brier != null ? ev.realized_brier.toFixed(4) : '—'}
                  </td>
                  <td className="py-3 px-3">
                    {ev.drift_status === 'STABLE' ? (
                      <span className="text-emerald-400 font-medium font-mono text-[11px]">STABLE (±0.005)</span>
                    ) : (
                      <span className="text-amber-400 font-medium font-mono text-[11px]">LABELS_PENDING</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Disclaimers footer */}
      {governance_disclaimers && governance_disclaimers.length > 0 && (
        <div className="border-t border-white/5 pt-3">
          <ul className="space-y-1">
            {governance_disclaimers.map((disc, i) => (
              <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                <span className="text-slate-600 font-mono">•</span>
                <span>{disc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
