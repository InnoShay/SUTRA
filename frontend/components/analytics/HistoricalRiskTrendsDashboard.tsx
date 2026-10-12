'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  TrendingUp,
  Users,
  Repeat,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  CohortRiskTrendResponse,
  HistoricalPerformanceMonitoringResponse,
} from '@/lib/types';
import HistoricalRiskTrendChart from './HistoricalRiskTrendChart';
import LongitudinalPerformanceMonitoringCard from './LongitudinalPerformanceMonitoringCard';

interface HistoricalRiskTrendsDashboardProps {
  availableCohorts?: string[];
  selectedCohort?: string;
  onSelectCohort?: (cohort: string) => void;
}

export default function HistoricalRiskTrendsDashboard({
  availableCohorts = [],
  selectedCohort = '',
  onSelectCohort,
}: HistoricalRiskTrendsDashboardProps) {
  const [trendData, setTrendData] = useState<CohortRiskTrendResponse | null>(null);
  const [monitoringData, setMonitoringData] = useState<HistoricalPerformanceMonitoringResponse | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);
  const [isLoadingMonitoring, setIsLoadingMonitoring] = useState(true);
  const [retentionDays, setRetentionDays] = useState<number>(365);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());

  const fetchTrends = async () => {
    setIsLoadingTrends(true);
    try {
      const data = await api.analytics.getRiskTrends({
        cohort: selectedCohort || undefined,
        model_version: 'v1.0.0',
        cutoff: 'Day 30',
        retention_days: retentionDays,
      });
      setTrendData(data);
    } catch (err) {
      console.warn('Could not fetch historical risk trends, fallback data used:', err);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const fetchMonitoring = async () => {
    setIsLoadingMonitoring(true);
    try {
      const data = await api.analytics.getPerformanceMonitoring();
      setMonitoringData(data);
    } catch (err) {
      console.warn('Could not fetch performance monitoring, fallback data used:', err);
    } finally {
      setIsLoadingMonitoring(false);
    }
  };

  useEffect(() => {
    fetchTrends();
    fetchMonitoring();
    setLastRefreshedAt(new Date().toLocaleTimeString());
  }, [selectedCohort, retentionDays]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner and Filter Bar */}
      <div className="bg-[#121620] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Historical Risk Trends &amp; Monitoring</h2>
            <span className="text-[11px] font-mono text-slate-400 font-normal">
              • Phase 7 Audited
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Longitudinal evaluation of student risk shifts over time. Enforces distinct accounting for repeated rescores,
            prohibits silent comparisons across model versions, and distinguishes score drift from certified term outcomes.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Cohort Selector */}
          {availableCohorts.length > 0 && onSelectCohort && (
            <select
              value={selectedCohort}
              onChange={(e) => onSelectCohort(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Cohorts</option>
              {availableCohorts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Retention Selector */}
          <select
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          >
            <option value={90}>Retention: 90 Days</option>
            <option value={180}>Retention: 180 Days</option>
            <option value={365}>Retention: 365 Days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchTrends();
              fetchMonitoring();
              setLastRefreshedAt(new Date().toLocaleTimeString());
            }}
            disabled={isLoadingTrends || isLoadingMonitoring}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Refresh historical trends"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingTrends ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Prediction Runs */}
        <div className="bg-[#121620] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Historical Prediction Runs</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {trendData?.total_historical_runs != null ? trendData.total_historical_runs.toLocaleString() : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Total inference invocations</span>
        </div>

        {/* Metric 2: Unique Students */}
        <div className="bg-[#121620] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Unique Evaluated Students</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-2">
            {trendData?.total_unique_students != null ? trendData.total_unique_students.toLocaleString() : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Deduplicated unique learners</span>
        </div>

        {/* Metric 3: Rescore Frequency */}
        <div className="bg-[#121620] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Rescore Frequency</span>
            <Repeat className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {trendData?.rescore_frequency != null ? `${trendData.rescore_frequency}x` : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Avg runs per unique student</span>
        </div>

        {/* Metric 4: Comparable History Status */}
        <div className="bg-[#121620] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Trend Comparability</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold font-mono mt-2">
            {trendData?.has_comparable_history ? (
              <span className="text-emerald-400">Comparable History</span>
            ) : (
              <span className="text-amber-400">Limited Snapshots (&lt; 2)</span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            {trendData?.snapshots?.length || 0} snapshot(s) in window
          </span>
        </div>

        {/* Metric 5: Model Version Invariant */}
        <div className="bg-[#121620] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Model Version</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm font-bold font-mono text-white mt-2">v1.0.0 (Day 30)</div>
          <span className="text-[11px] text-slate-500 mt-1">Frozen serving baseline</span>
        </div>
      </div>

      {/* Primary Trend Chart */}
      <HistoricalRiskTrendChart trendData={trendData} isLoading={isLoadingTrends} />

      {/* Longitudinal Performance & Outcome Monitoring (Requirement 6) */}
      <LongitudinalPerformanceMonitoringCard monitoringData={monitoringData} isLoading={isLoadingMonitoring} />
    </div>
  );
}
