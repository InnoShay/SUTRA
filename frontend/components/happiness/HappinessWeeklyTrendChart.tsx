"use client";

import React, { useState } from "react";
import { HappinessTrendResponse, HappinessTrendPointDTO } from "@/lib/types";
import { LineChart, Table, Info } from "lucide-react";

interface HappinessWeeklyTrendChartProps {
  trendData: HappinessTrendResponse | null;
  isLoading?: boolean;
}

export function HappinessWeeklyTrendChart({
  trendData,
  isLoading,
}: HappinessWeeklyTrendChartProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [hoveredPoint, setHoveredPoint] = useState<HappinessTrendPointDTO | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 space-y-4 shadow-2xs animate-pulse">
        <div className="h-4 bg-neutral-100 rounded-md w-1/4" />
        <div className="h-48 bg-neutral-100 rounded-xl w-full" />
      </div>
    );
  }

  const periods = trendData?.periods || [];

  if (periods.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-2xs text-center space-y-3">
        <LineChart className="w-8 h-8 text-neutral-300 mx-auto" />
        <h3 className="text-sm font-semibold text-neutral-800">
          No Historical Trends Yet
        </h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          Historical trend points will appear after successive weekly reporting periods have collected valid responses.
        </p>
      </div>
    );
  }

  // Chart Dimensions & Scales
  const width = 640;
  const height = 240;
  const paddingX = 50;
  const paddingTop = 25;
  const paddingBottom = 40;

  // Filter valid points (non-null)
  const validPoints = periods.filter(
    (p): p is HappinessTrendPointDTO & { happiness_index: number } =>
      p.happiness_index !== null && !isNaN(p.happiness_index)
  );

  // Y-Scale: Range 50 to 100 for clear visualization of realistic campus indices
  const yMin = 50;
  const yMax = 100;

  const getX = (index: number) => {
    if (periods.length <= 1) return paddingX + (width - paddingX * 2) / 2;
    return paddingX + (index / (periods.length - 1)) * (width - paddingX * 2);
  };

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    const ratio = (clamped - yMin) / (yMax - yMin);
    return height - paddingBottom - ratio * (height - paddingTop - paddingBottom);
  };

  // Build SVG path
  const linePoints = periods.map((p, i) => {
    if (p.happiness_index === null) return null;
    return {
      x: getX(i),
      y: getY(p.happiness_index),
      raw: p,
      index: i,
    };
  });

  const validSvgPoints = linePoints.filter((pt): pt is NonNullable<typeof pt> => pt !== null);

  const pathD = validSvgPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  // Area under line
  const areaD =
    validSvgPoints.length > 1
      ? `${pathD} L ${validSvgPoints[validSvgPoints.length - 1].x} ${
          height - paddingBottom
        } L ${validSvgPoints[0].x} ${height - paddingBottom} Z`
      : "";

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-neutral-900 font-heading">
              Weekly Happiness Index Trend
            </h3>
            {trendData?.is_demo_data && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Demo
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Longitudinal trend across successive weekly reporting periods
          </p>
        </div>

        {/* View Switcher: Chart vs Accessible Table */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("chart")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "chart"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Data Table</span>
          </button>
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="space-y-3">
          {/* SVG Trend Chart */}
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto max-h-64 overflow-visible"
              role="img"
              aria-label="Line chart showing Happiness Index trend over weekly periods"
            >
              {/* Horizontal Reference Grid Lines */}
              {[60, 70, 80, 90, 100].map((val) => {
                const y = getY(val);
                return (
                  <g key={val}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 3}
                      textAnchor="end"
                      fontSize={10}
                      fill="#94a3b8"
                      className="font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient Fill */}
              <defs>
                <linearGradient id="happinessAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {areaD && <path d={areaD} fill="url(#happinessAreaGrad)" />}

              {/* Main Line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {validSvgPoints.map((pt) => {
                const isHovered = hoveredPoint?.period_id === pt.raw.period_id;
                return (
                  <g
                    key={pt.raw.period_id}
                    onMouseEnter={() => setHoveredPoint(pt.raw)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#e11d48"
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all duration-150"
                    />
                    {/* Period X-axis Label */}
                    <text
                      x={pt.x}
                      y={height - paddingBottom + 18}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#64748b"
                      fontWeight={isHovered ? 600 : 400}
                    >
                      {pt.raw.period_label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Box */}
            {hoveredPoint && (
              <div className="absolute top-2 right-2 p-3 bg-neutral-900 text-white rounded-2xl shadow-lg text-xs space-y-1 animate-in fade-in duration-150 pointer-events-none">
                <p className="font-bold">{hoveredPoint.period_label}</p>
                <div className="flex items-center gap-2 text-rose-300 font-semibold">
                  <span>Happiness Index:</span>
                  <span>{hoveredPoint.happiness_index?.toFixed(1) ?? "—"} / 100</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {hoveredPoint.response_count} respondents
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Accessible Tabular Alternative */
        <div className="overflow-x-auto border border-neutral-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-4">REPORTING PERIOD</th>
                <th className="py-2.5 px-4">HAPPINESS INDEX</th>
                <th className="py-2.5 px-4">VALID RESPONSES</th>
                <th className="py-2.5 px-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {periods.map((p) => (
                <tr key={p.period_id} className="hover:bg-neutral-50/50">
                  <td className="py-3 px-4 font-semibold text-neutral-900">
                    {p.period_label}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-neutral-800">
                    {p.happiness_index !== null ? `${p.happiness_index.toFixed(1)} / 100` : "Insufficient Data"}
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    {p.response_count} students
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Recorded
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Non-causal Governance Notice */}
      <div className="flex items-start gap-2 pt-2 text-[11px] text-neutral-400 border-t border-neutral-100">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          Historical point movements reflect aggregate self-reported student sentiment. They do not claim definitive causality or isolate individual policy interventions.
        </p>
      </div>
    </div>
  );
}
