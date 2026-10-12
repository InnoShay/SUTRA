"use client";

import React, { useState } from "react";
import { Activity, Layers, Sparkles, CheckCircle2, Info, Table } from "lucide-react";
import { MultiTierTrendPoint } from "@/lib/types";

interface MultiTierTrendChartProps {
  timeline?: MultiTierTrendPoint[];
  timeframe?: string;
  className?: string;
}

export function MultiTierTrendChart({
  timeline = [],
  timeframe = "This Month",
  className = "",
}: MultiTierTrendChartProps) {
  const [showTable, setShowTable] = useState(false);

  // SVG Chart Dimensions
  const width = 560;
  const height = 220;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 30;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(
    ...timeline.map((p) => Math.max(p.prediction_runs, p.signals_detected, p.cases_opened, p.confirmed_outcomes)),
    4
  );

  const pointsCount = timeline.length;
  const stepX = pointsCount > 1 ? chartW / (pointsCount - 1) : chartW / 2;

  // Build SVG path strings
  const getCoordinates = (accessor: (p: MultiTierTrendPoint) => number) => {
    return timeline.map((p, idx) => {
      const x = padLeft + (pointsCount > 1 ? idx * stepX : chartW / 2);
      const y = padTop + chartH - (accessor(p) / maxVal) * chartH;
      return { x, y, val: accessor(p) };
    });
  };

  const toPath = (coords: { x: number; y: number }[]) => {
    if (coords.length === 0) return "";
    return coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, "");
  };

  const predCoords = getCoordinates((p) => p.prediction_runs);
  const sigCoords = getCoordinates((p) => p.signals_detected);
  const caseCoords = getCoordinates((p) => p.cases_opened);
  const outcomeCoords = getCoordinates((p) => p.confirmed_outcomes);

  return (
    <div className={`skill-card p-5 sm:p-6 bg-white relative rounded-3xl border border-neutral-200/80 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div>
          <h3 className="text-base font-bold text-neutral-900 tracking-tight font-heading">
            Multi-Tier Operational Velocity &amp; Outcome Trends
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Temporal distribution strictly distinguishing predictions, policy signals, support cases, and confirmed resolutions
          </p>
        </div>

        <button
          onClick={() => setShowTable(!showTable)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200/80 text-xs text-neutral-600 hover:bg-neutral-50 self-start sm:self-auto font-medium shadow-2xs"
        >
          <Table className="w-3.5 h-3.5 text-neutral-500" />
          <span>{showTable ? "Hide Data Table" : "Show Data Table"}</span>
        </button>
      </div>

      {/* Series Legend */}
      <div className="flex flex-wrap items-center gap-4 py-3 text-xs">
        <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
          <span className="w-3 h-1 bg-blue-600 rounded-full inline-block" />
          Tier 3: Predictions Evaluated
        </span>
        <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
          <span className="w-3 h-1 bg-amber-500 rounded-full inline-block" />
          Tier 2: Policy Signals
        </span>
        <span className="flex items-center gap-1.5 text-purple-700 font-semibold">
          <span className="w-3 h-1 bg-purple-600 rounded-full inline-block" />
          Tier 5: Cases Opened
        </span>
        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
          <span className="w-3 h-1 bg-emerald-600 rounded-full inline-block" />
          Confirmed Resolutions
        </span>
      </div>

      {/* SVG Chart or Accessible Data Table */}
      {showTable ? (
        <div className="overflow-x-auto py-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase">
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2 text-blue-700">Predictions (Tier 3)</th>
                <th className="py-2 px-2 text-amber-700">Signals (Tier 2)</th>
                <th className="py-2 px-2 text-purple-700">Cases Opened (Tier 5)</th>
                <th className="py-2 px-2 text-emerald-700">Confirmed Outcomes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {timeline.map((point) => (
                <tr key={point.date_key} className="hover:bg-neutral-50">
                  <td className="py-2 px-2 font-mono">{point.label}</td>
                  <td className="py-2 px-2 font-semibold text-blue-700">{point.prediction_runs}</td>
                  <td className="py-2 px-2 font-semibold text-amber-700">{point.signals_detected}</td>
                  <td className="py-2 px-2 font-semibold text-purple-700">{point.cases_opened}</td>
                  <td className="py-2 px-2 font-semibold text-emerald-700">{point.confirmed_outcomes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Grid Lines */}
            {[0, 0.33, 0.66, 1].map((pct, i) => {
              const y = padTop + chartH - pct * chartH;
              const val = Math.round(pct * maxVal);
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#f3f4f6"
                    strokeWidth="1"
                    strokeDasharray={pct > 0 ? "2,2" : undefined}
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-neutral-400 font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {timeline.map((p, idx) => {
              const x = padLeft + (pointsCount > 1 ? idx * stepX : chartW / 2);
              return (
                <text
                  key={idx}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-[10px] fill-neutral-400 font-mono"
                >
                  {p.label}
                </text>
              );
            })}

            {/* Lines */}
            <path d={toPath(predCoords)} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
            <path d={toPath(sigCoords)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d={toPath(caseCoords)} fill="none" stroke="#9333ea" strokeWidth="2" strokeDasharray="4,3" />
            <path d={toPath(outcomeCoords)} fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" />

            {/* Point Markers */}
            {predCoords.map((c, i) => (
              <circle key={`p-${i}`} cx={c.x} cy={c.y} r="3" fill="#2563eb" />
            ))}
            {sigCoords.map((c, i) => (
              <circle key={`s-${i}`} cx={c.x} cy={c.y} r="3" fill="#f59e0b" />
            ))}
            {caseCoords.map((c, i) => (
              <circle key={`c-${i}`} cx={c.x} cy={c.y} r="2.5" fill="#9333ea" />
            ))}
            {outcomeCoords.map((c, i) => (
              <circle key={`o-${i}`} cx={c.x} cy={c.y} r="2.5" fill="#059669" />
            ))}
          </svg>
        </div>
      )}

      {/* Non-Causal Governance Notice */}
      <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60 mt-3 flex items-start gap-2 text-xs text-neutral-600">
        <Info className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong>Non-Causal Governance Notice:</strong> Case counts reflect proactive educator outreach volume and must not be claimed as proof of model accuracy. Intervention assignments reflect initiated support protocols and do not prove causal outcome efficacy without formal control trials.
        </p>
      </div>
    </div>
  );
}
