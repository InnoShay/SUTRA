'use client';

import React, { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  Info,
  Table as TableIcon,
  LineChart as ChartIcon,
  ShieldCheck,
  Cpu,
  History,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CohortRiskTrendResponse, HistoricalSnapshotPoint } from '@/lib/types';

interface HistoricalRiskTrendChartProps {
  trendData: CohortRiskTrendResponse | null;
  isLoading?: boolean;
}

export default function HistoricalRiskTrendChart({ trendData, isLoading = false }: HistoricalRiskTrendChartProps) {
  const [showDataTable, setShowDataTable] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-[#121620] border border-white/5 rounded-2xl p-8 flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Loading historical prediction snapshots...</p>
        </div>
      </div>
    );
  }

  if (!trendData) {
    return (
      <div className="bg-[#121620] border border-white/5 rounded-2xl p-8 text-center text-slate-400">
        <History className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-300">No Historical Risk Data Available</p>
        <p className="text-xs text-slate-500 mt-1">Run predictions across multiple observation windows to generate trend snapshots.</p>
      </div>
    );
  }

  const {
    snapshots = [],
    has_comparable_history,
    data_gap_notice,
    incompatible_snapshots_detected,
    causality_disclaimer,
    reference_model_version,
  } = trendData;

  return (
    <div className="bg-[#121620] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white tracking-tight">Longitudinal Cohort Risk Trajectory</h3>
            <span className="text-[11px] font-mono text-slate-400">
              • Ref: {reference_model_version}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tracks shifts in predicted student risk distributions across verified temporal observation snapshots.
          </p>
        </div>

        <button
          onClick={() => setShowDataTable(!showDataTable)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors self-start sm:self-auto"
        >
          {showDataTable ? <ChartIcon className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
          {showDataTable ? 'Show Visual Chart' : 'Show Accessible Data Table'}
        </button>
      </div>

      {/* Mandatory Non-Causal Policy Notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <span className="font-semibold text-amber-300">Non-Causal Governance Notice: </span>
          {causality_disclaimer}
        </div>
      </div>

      {/* Incompatibility Alert Banner */}
      {incompatible_snapshots_detected > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200/90 leading-relaxed">
            <span className="font-semibold text-rose-300">Incompatible Model Version Warning: </span>
            {incompatible_snapshots_detected} historical snapshot(s) were generated using differing model architectures or cutoff windows.
            Scores across incompatible models cannot be compared on a continuous baseline without recalibration.
          </div>
        </div>
      )}

      {/* Anti-Fabrication Safeguard on Missing History */}
      {!has_comparable_history ? (
        <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10 my-2">
          <AlertTriangle className="w-8 h-8 text-amber-400/80 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-white">Insufficient Historical Observations</h4>
          <p className="text-xs text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
            {data_gap_notice ||
              'SUTRA requires at least two comparable evaluation snapshots to display risk trends over time. SUTRA does not synthesize fake predictions to fill historical gaps.'}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-mono px-3 py-1 rounded-md bg-white/5 text-slate-400">
            <span>Evaluated Snapshots Available: {snapshots.length} / 2 Required</span>
          </div>
        </div>
      ) : showDataTable ? (
        /* Accessible Structured Data Table Alternative */
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-slate-400 font-mono border-b border-white/5">
              <tr>
                <th className="py-2.5 px-3">Snapshot Date</th>
                <th className="py-2.5 px-3">Model Version</th>
                <th className="py-2.5 px-3">Runs (Total)</th>
                <th className="py-2.5 px-3">Unique Students</th>
                <th className="py-2.5 px-3">Rescores</th>
                <th className="py-2.5 px-3">At-Risk Rate (%)</th>
                <th className="py-2.5 px-3">Mean Score</th>
                <th className="py-2.5 px-3">Comparability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {snapshots.map((snap) => (
                <tr key={snap.snapshot_id} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-mono text-white">{snap.snapshot_id}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{snap.model_version} ({snap.prediction_cutoff})</td>
                  <td className="py-2.5 px-3 font-mono">{snap.total_prediction_runs}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-white">{snap.unique_students_evaluated}</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">{snap.repeated_rescores_count}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {snap.is_privacy_suppressed ? (
                      <span className="text-amber-400 italic">Suppressed (N &lt; 5)</span>
                    ) : (
                      <span className="font-semibold text-rose-400">{snap.at_risk_percentage}%</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono">{(snap.mean_risk_probability * 100).toFixed(1)}%</td>
                  <td className="py-2.5 px-3 font-mono">
                    {snap.is_comparable ? (
                      <span className="text-emerald-400 font-medium">Comparable</span>
                    ) : (
                      <span className="text-rose-400 font-medium" title={snap.incompatibility_reason || ''}>
                        Incompatible
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Visual Timeline & Snapshot Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshots.map((snap, idx) => {
            const isLatest = idx === snapshots.length - 1;
            const prevSnap = idx > 0 ? snapshots[idx - 1] : null;
            const atRiskDelta =
              prevSnap && snap.at_risk_percentage != null && prevSnap.at_risk_percentage != null
                ? snap.at_risk_percentage - prevSnap.at_risk_percentage
                : null;

            return (
              <div
                key={snap.snapshot_id}
                className={`rounded-xl p-4 border flex flex-col gap-3 transition-all ${
                  isLatest
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : snap.is_comparable
                    ? 'bg-white/[0.02] border-white/5'
                    : 'bg-rose-950/10 border-rose-500/30'
                }`}
              >
                {/* Snapshot Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-mono font-semibold text-white">{snap.snapshot_id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isLatest && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                        Latest
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        snap.is_comparable
                          ? 'bg-white/5 text-slate-400'
                          : 'bg-rose-500/20 text-rose-300 font-medium'
                      }`}
                    >
                      {snap.model_version}
                    </span>
                  </div>
                </div>

                {/* Risk Distribution Bar */}
                {snap.is_privacy_suppressed ? (
                  <div className="p-3 rounded-lg bg-amber-500/10 text-center text-amber-300 text-xs font-mono">
                    [Suppressed under ADR-004: Cell size N &lt; 5]
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">At-Risk Prevalence</span>
                      <div className="flex items-center gap-1">
                        <span className="text-base font-bold text-rose-400 font-mono">
                          {snap.at_risk_percentage}%
                        </span>
                        {atRiskDelta !== null && (
                          <span
                            className={`text-[11px] font-mono flex items-center ${
                              atRiskDelta > 0
                                ? 'text-rose-400'
                                : atRiskDelta < 0
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {atRiskDelta > 0 ? (
                              <TrendingUp className="w-3 h-3 inline mr-0.5" />
                            ) : atRiskDelta < 0 ? (
                              <TrendingDown className="w-3 h-3 inline mr-0.5" />
                            ) : null}
                            {atRiskDelta > 0 ? `+${atRiskDelta.toFixed(1)}%` : `${atRiskDelta.toFixed(1)}%`}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Visual Segment Bar */}
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                      <div
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${snap.at_risk_percentage || 0}%` }}
                      />
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${snap.on_track_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Counts Breakdown (Runs vs Unique Students) */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
                  <div className="bg-white/[0.02] rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Runs</span>
                    <span className="text-xs font-mono font-semibold text-slate-200">
                      {snap.total_prediction_runs}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Unique</span>
                    <span className="text-xs font-mono font-semibold text-emerald-400">
                      {snap.unique_students_evaluated}
                    </span>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Rescores</span>
                    <span className="text-xs font-mono font-semibold text-amber-400">
                      {snap.repeated_rescores_count}
                    </span>
                  </div>
                </div>

                {/* Incompatibility Callout if flagged */}
                {!snap.is_comparable && snap.incompatibility_reason && (
                  <p className="text-[11px] text-rose-300/90 italic bg-rose-500/10 p-2 rounded-lg leading-tight">
                    {snap.incompatibility_reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
