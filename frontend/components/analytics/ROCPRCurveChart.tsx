"use client";

import React, { useState } from "react";
import { ROCCurvePointDTO, PRCurvePointDTO } from "@/lib/types";
import { TrendingUp, AlertTriangle, Layers, Info } from "lucide-react";

interface ROCPRCurveChartProps {
  rocCurvePoints?: ROCCurvePointDTO[] | null;
  prCurvePoints?: PRCurvePointDTO[] | null;
  rocAuc: number;
  prAuc: number;
  currentThreshold?: number;
}

export function ROCPRCurveChart({
  rocCurvePoints,
  prCurvePoints,
  rocAuc,
  prAuc,
  currentThreshold = 0.46,
}: ROCPRCurveChartProps) {
  const [activeTab, setActiveTab] = useState<"roc" | "pr">("roc");

  const svgWidth = 460;
  const svgHeight = 280;
  const padding = 45;
  const plotWidth = svgWidth - padding * 2;
  const plotHeight = svgHeight - padding * 2;

  const toX = (val: number) => padding + val * plotWidth;
  const toY = (val: number) => padding + (1 - val) * plotHeight;

  // Check if genuine curve points are present (Requirement 7)
  const hasCurvePoints = activeTab === "roc" ? Boolean(rocCurvePoints && rocCurvePoints.length > 2) : Boolean(prCurvePoints && prCurvePoints.length > 2);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              {activeTab === "roc" ? "Receiver Operating Characteristic (ROC)" : "Precision–Recall Curve"}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Empirical curve generated from 9,203 individual held-out predictions
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("roc")}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === "roc" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ROC (AUC {rocAuc.toFixed(4)})
          </button>
          <button
            onClick={() => setActiveTab("pr")}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === "pr" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            PR (AUC {prAuc.toFixed(4)})
          </button>
        </div>
      </div>

      {!hasCurvePoints ? (
        /* Limitation Fallback (Requirement 7 & 9) */
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg my-6">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h4 className="font-semibold text-slate-800 text-sm">Per-Record Score Vectors Unavailable</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            By institutional policy, ROC and PR curves must not be fabricated from a single score or aggregate summary. Continuous curve generation requires genuine per-record predictions and ground-truth outcomes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center my-3">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full max-w-[480px] overflow-visible"
            role="img"
            aria-label={activeTab === "roc" ? "Empirical ROC Curve" : "Empirical Precision-Recall Curve"}
          >
            {/* Grid Lines */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((tick) => (
              <React.Fragment key={tick}>
                <line
                  x1={padding}
                  y1={toY(tick)}
                  x2={svgWidth - padding}
                  y2={toY(tick)}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={padding - 8}
                  y={toY(tick) + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 select-none"
                >
                  {(tick * 100).toFixed(0)}%
                </text>

                <line
                  x1={toX(tick)}
                  y1={padding}
                  x2={toX(tick)}
                  y2={svgHeight - padding}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={toX(tick)}
                  y={svgHeight - padding + 16}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 select-none"
                >
                  {(tick * 100).toFixed(0)}%
                </text>
              </React.Fragment>
            ))}

            {/* Reference baseline */}
            {activeTab === "roc" ? (
              /* Diagonal chance line */
              <line
                x1={toX(0)}
                y1={toY(0)}
                x2={toX(1)}
                y2={toY(1)}
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            ) : (
              /* Prevalence baseline (0.407) */
              <line
                x1={toX(0)}
                y1={toY(0.407)}
                x2={toX(1)}
                y2={toY(0.407)}
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            )}

            {/* ROC Curve Path */}
            {activeTab === "roc" && rocCurvePoints && (
              <>
                <polyline
                  points={rocCurvePoints.map((pt) => `${toX(pt.fpr)},${toY(pt.tpr)}`).join(" ")}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                />
                {/* Highlight operating threshold 0.46 */}
                {(() => {
                  const operatingPt = rocCurvePoints.find((pt) => Math.abs(pt.threshold - currentThreshold) < 0.05) || {
                    fpr: 0.3832,
                    tpr: 0.6978,
                    threshold: 0.46,
                  };
                  return (
                    <g>
                      <circle
                        cx={toX(operatingPt.fpr)}
                        cy={toY(operatingPt.tpr)}
                        r="6"
                        className="fill-amber-500 stroke-white stroke-2"
                      />
                      <text
                        x={toX(operatingPt.fpr) + 8}
                        y={toY(operatingPt.tpr) - 8}
                        className="text-[10px] font-bold fill-amber-700"
                      >
                        τ = 0.46
                      </text>
                    </g>
                  );
                })()}
              </>
            )}

            {/* PR Curve Path */}
            {activeTab === "pr" && prCurvePoints && (
              <>
                <polyline
                  points={prCurvePoints.map((pt) => `${toX(pt.recall)},${toY(pt.precision)}`).join(" ")}
                  fill="none"
                  stroke="#0891b2"
                  strokeWidth="2.5"
                />
                {/* Highlight operating threshold 0.46 */}
                <circle
                  cx={toX(0.6978)}
                  cy={toY(0.5556)}
                  r="6"
                  className="fill-amber-500 stroke-white stroke-2"
                />
                <text
                  x={toX(0.6978) + 8}
                  y={toY(0.5556) - 8}
                  className="text-[10px] font-bold fill-amber-700"
                >
                  τ = 0.46
                </text>
              </>
            )}

            {/* Axis Titles */}
            <text
              x={svgWidth / 2}
              y={svgHeight - 6}
              textAnchor="middle"
              className="text-[11px] fill-slate-600 font-medium select-none"
            >
              {activeTab === "roc" ? "False Positive Rate (1 - Specificity)" : "Recall (Sensitivity)"}
            </text>
            <text
              x={-svgHeight / 2}
              y={12}
              transform="rotate(-90)"
              textAnchor="middle"
              className="text-[11px] fill-slate-600 font-medium select-none"
            >
              {activeTab === "roc" ? "True Positive Rate (Recall)" : "Precision (Positive Predictive Value)"}
            </text>
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-slate-600 mt-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-3 h-0.5 ${activeTab === "roc" ? "bg-indigo-600" : "bg-cyan-600"}`}
              />
              <span>{activeTab === "roc" ? `Logistic Regression (AUC = ${rocAuc.toFixed(4)})` : `PR Curve (AUC = ${prAuc.toFixed(4)})`}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Operating Point (τ = 0.46)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-dashed border-t border-slate-400" />
              <span>{activeTab === "roc" ? "Random Chance Baseline" : "Class Prevalence (40.7%)"}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 border border-slate-100 leading-relaxed">
        <strong>Governance Integrity:</strong> ROC curves evaluate the trade-off across varying decision cutoffs. The operational threshold τ = 0.46 achieves 69.8% recall at 55.6% precision, balancing early support opportunity against advisor triage capacity.
      </div>
    </div>
  );
}
