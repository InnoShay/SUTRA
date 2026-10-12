"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ModelPerformanceResponse } from "@/lib/types";
import { ModelEvaluationProvenanceCard } from "./ModelEvaluationProvenanceCard";
import { ConfusionMatrixCard } from "./ConfusionMatrixCard";
import { ReliabilityCalibrationChart } from "./ReliabilityCalibrationChart";
import { ROCPRCurveChart } from "./ROCPRCurveChart";
import { SubgroupFairnessTable } from "./SubgroupFairnessTable";
import { RefreshCw, ShieldCheck, AlertCircle, Info, Sparkles } from "lucide-react";

export function ModelPerformanceDashboard() {
  const [data, setData] = useState<ModelPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("v1.0.0");

  const fetchPerformance = async (version: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.ml.getPerformance(version);
      setData(resp);
    } catch (err: any) {
      console.error("Failed to fetch model performance:", err);
      setError(
        err?.message ||
          `Requested model version '${version}' does not match deployed baseline 'v1.0.0'. No verified evaluation artifact found.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance(selectedVersion);
  }, [selectedVersion]);

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header & Version Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Model Performance & Evaluation Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified statistical performance on held-out benchmark datasets and live telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600">Model Version:</label>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            aria-label="Select Model Version"
          >
            <option value="v1.0.0">v1.0.0 (Frozen Serving Baseline)</option>
            <option value="v0.1.0-research">0.1.0-research (Constrained XGBoost - Unpromoted)</option>
            <option value="v2.0.0">v2.0.0 (Unregistered Version - Test Mismatch)</option>
          </select>

          <button
            onClick={() => fetchPerformance(selectedVersion)}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs disabled:opacity-50"
            title="Refresh Evaluation Metrics"
            aria-label="Refresh Evaluation Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error / Limitation State (Requirement 9) */}
      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-3 my-4">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Evaluation Data Unavailable</h4>
            <p className="text-xs mt-1 text-rose-700 leading-relaxed">{error}</p>
            <p className="text-xs text-rose-600 mt-2 italic">
              By institutional policy, missing evaluation data displays this limitation rather than inventing synthetic charts.
            </p>
            <button
              onClick={() => setSelectedVersion("v1.0.0")}
              className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
            >
              Reset to Deployed Baseline (v1.0.0)
            </button>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-xs font-medium">Loading verified evaluation metrics...</p>
        </div>
      )}

      {data && (
        <>
          {/* 1. Evaluation Provenance Card (Requirement 5 & 6) */}
          <ModelEvaluationProvenanceCard
            modelName={data.model_name}
            modelVersion={data.model_version}
            operationalThreshold={data.operational_threshold}
            datasetProvenance={data.dataset_provenance}
            liveTelemetry={data.live_telemetry}
          />

          {/* 2. Confusion Matrix & Decision Performance (Requirement 2 & 4) */}
          <ConfusionMatrixCard
            thresholdDependent={data.threshold_dependent_metrics}
            thresholdIndependent={data.threshold_independent_metrics}
          />

          {/* 3. Reliability / Calibration Plot & ROC-PR Curves (Requirement 3 & 7) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReliabilityCalibrationChart
              reliabilityBins={data.reliability_table}
              ece={data.threshold_independent_metrics.expected_calibration_error_ece}
              mce={data.threshold_independent_metrics.maximum_calibration_error_mce}
              brierScore={data.threshold_independent_metrics.brier_score}
            />

            <ROCPRCurveChart
              rocCurvePoints={data.roc_curve_points}
              prCurvePoints={data.pr_curve_points}
              rocAuc={data.threshold_independent_metrics.roc_auc}
              prAuc={data.threshold_independent_metrics.pr_auc}
              currentThreshold={data.operational_threshold}
            />
          </div>

          {/* 4. Subgroup Fairness & Demographic Parity Table (Requirement 8) */}
          <SubgroupFairnessTable
            subgroupMetrics={data.subgroup_metrics}
            fairnessDisclaimer={data.fairness_disclaimer}
          />

          {/* 5. Documented Limitations & Governance Mandates */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs text-slate-600">
            <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Institutional Model Limitations & Audit Trail</span>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
              {data.limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
