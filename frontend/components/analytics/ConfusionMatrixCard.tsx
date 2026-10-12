"use client";

import React from "react";
import { ThresholdDependentMetricsDTO, ThresholdIndependentMetricsDTO } from "@/lib/types";
import { CheckCircle2, AlertOctagon, HelpCircle, UserX, UserCheck, Bell, Shield } from "lucide-react";

interface ConfusionMatrixCardProps {
  thresholdDependent: ThresholdDependentMetricsDTO;
  thresholdIndependent: ThresholdIndependentMetricsDTO;
}

export function ConfusionMatrixCard({
  thresholdDependent,
  thresholdIndependent,
}: ConfusionMatrixCardProps) {
  const cm = thresholdDependent.confusion_matrix;
  const wl = thresholdDependent.operational_workload;
  const total = cm.tp + cm.fp + cm.tn + cm.fn;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">Confusion Matrix & Decision Performance</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluated on held-out test partition at invariant decision threshold{" "}
            <span className="font-semibold text-slate-700">τ = {thresholdDependent.threshold.toFixed(2)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-800">
            Total Evaluated: {total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Summary KPI Badges (Requirement 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 my-5">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
          <div className="text-xs text-slate-500 font-medium">ROC-AUC</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {thresholdIndependent.roc_auc.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-400">Discrimination Ability</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
          <div className="text-xs text-slate-500 font-medium">PR-AUC</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {thresholdIndependent.pr_auc.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-400">Precision-Recall Area</div>
        </div>

        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-center">
          <div className="text-xs text-indigo-700 font-medium">Precision</div>
          <div className="text-lg font-bold text-indigo-900 mt-0.5">
            {(thresholdDependent.precision * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-indigo-500">True Alert Rate</div>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-center">
          <div className="text-xs text-amber-700 font-medium">Recall (Sensitivity)</div>
          <div className="text-lg font-bold text-amber-900 mt-0.5">
            {(thresholdDependent.recall * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-amber-600">Catch Rate (2,614/3,746)</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
          <div className="text-xs text-slate-500 font-medium">Specificity</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {(thresholdDependent.specificity * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400">On-Track Identification</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
          <div className="text-xs text-slate-500 font-medium">False Alarm Rate</div>
          <div className="text-lg font-bold text-rose-700 mt-0.5">
            {(thresholdDependent.false_positive_rate * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-rose-500">FPR (FP / Negatives)</div>
        </div>
      </div>

      {/* 2x2 Matrix Grid (Requirement 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
        {/* Visual Matrix */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-4">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 text-center">
            2×2 Decision Contingency Table (τ = 0.46)
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* True Positive */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">True Positive (TP)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-950 mt-2">
                {cm.tp.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                Caught early: correctly flagged actual at-risk students ({((cm.tp / total) * 100).toFixed(1)}% of total)
              </div>
            </div>

            {/* False Positive */}
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800">False Positive (FP)</span>
                <AlertOctagon className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-extrabold text-rose-950 mt-2">
                {cm.fp.toLocaleString()}
              </div>
              <div className="text-[11px] text-rose-700 mt-1">
                Advisor burden: on-track students flagged as at-risk ({((cm.fp / total) * 100).toFixed(1)}% of total)
              </div>
            </div>

            {/* False Negative */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">False Negative (FN)</span>
                <UserX className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-amber-950 mt-2">
                {cm.fn.toLocaleString()}
              </div>
              <div className="text-[11px] text-amber-700 mt-1">
                Missed risk: at-risk students classified as on-track ({((cm.fn / total) * 100).toFixed(1)}% of total)
              </div>
            </div>

            {/* True Negative */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800">True Negative (TN)</span>
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-blue-950 mt-2">
                {cm.tn.toLocaleString()}
              </div>
              <div className="text-[11px] text-blue-700 mt-1">
                Quiet accuracy: on-track students correctly left unflagged ({((cm.tn / total) * 100).toFixed(1)}% of total)
              </div>
            </div>
          </div>
        </div>

        {/* Operational Workload & Advisor Capacity */}
        <div className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Operational Staff Capacity Impact
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              At decision threshold <span className="font-semibold text-slate-900">0.46</span>, the model generates{" "}
              <strong className="text-slate-900">{wl.total_alerts_fired.toLocaleString()} total alerts</strong> across{" "}
              {total.toLocaleString()} student registrations, producing an alert rate of{" "}
              <strong className="text-slate-900">{wl.alert_rate_pct.toFixed(1)}%</strong>.
            </p>

            <div className="space-y-3 mt-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Proactive Catches (TP):</span>
                <span className="font-semibold text-emerald-700">{wl.successful_proactive_catches.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">False Alarms (Advisor Review Burden):</span>
                <span className="font-semibold text-rose-700">{wl.false_alarms_advisor_burden.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Missed Risk Students (Safety Net Need):</span>
                <span className="font-semibold text-amber-700">{wl.missed_at_risk_students.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600">Overall Accuracy / Balanced Acc:</span>
                <span className="font-semibold text-slate-900">
                  {(thresholdDependent.accuracy * 100).toFixed(1)}% / {(thresholdDependent.balanced_accuracy * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 leading-normal border border-slate-100">
            <strong>Capacity Note:</strong> 44.4% of alerts are false alarms (1 in 2.25 alerts is on-track). Workflows must design rapid triage steps to avoid advisor fatigue.
          </div>
        </div>
      </div>
    </div>
  );
}
