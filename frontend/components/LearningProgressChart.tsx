"use client";

import React, { useState } from "react";
import { Copy, Check, Info } from "lucide-react";
import { CaseLifecycleDistribution } from "@/lib/analytics-selectors";

interface LearningProgressChartProps {
  distribution?: CaseLifecycleDistribution;
  className?: string;
}

export function LearningProgressChart({
  distribution,
  className = "",
}: LearningProgressChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Fallback if distribution is undefined
  const states = distribution?.states || [];
  const totalCases = distribution?.totalCases || 0;
  const activeCount = distribution?.activeCount || 0;
  const resolvedCount = distribution?.resolvedCount || 0;

  const width = 540;
  const height = 230;
  const padLeft = 36;
  const padRight = 24;
  const padTop = 30;
  const padBottom = 42;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Max scale calculation
  const maxVal = Math.max(
    ...states.map((s) => s.count),
    4 // sensible minimal ceiling for readable axis
  );

  const barWidth = 26;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `SUTRA Case Lifecycle Distribution: Total ${totalCases} cases (${activeCount} active, ${resolvedCount} resolved).`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`skill-card p-5 sm:p-6 bg-white relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
            Case Lifecycle State Distribution
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Canonical 10-state progression across all active institutional cases
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-neutral-100 rounded-full text-[11px] font-medium text-neutral-600">
            {totalCases} {totalCases === 1 ? "Case" : "Cases"}
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-700 transition-colors"
            title="Copy Report"
            aria-label="Copy Case Lifecycle Report"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="relative w-full aspect-[2.3/1] select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Active Case Gradient */}
            <linearGradient id="activeBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.3" />
            </linearGradient>

            {/* Resolved Case Gradient */}
            <linearGradient id="resolvedBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.3" />
            </linearGradient>

            {/* Zero Count Striped Gradient */}
            <linearGradient id="zeroBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[maxVal, Math.round(maxVal / 2), 0].map((val, idx) => {
            const y = padTop + chartH - (val / maxVal) * chartH;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-medium fill-neutral-400"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Render 10 State Bars */}
          {states.map((item, idx) => {
            const step = chartW / states.length;
            const x = padLeft + idx * step + (step - barWidth) / 2;
            const barH = item.count > 0 ? (item.count / maxVal) * chartH : 4;
            const y = padTop + chartH - barH;
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={item.state}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onTouchStart={() => setHoveredIdx(idx)}
              >
                {/* Bar Body */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="4"
                  fill={
                    item.count === 0
                      ? "url(#zeroBarGrad)"
                      : item.isTerminal
                      ? "url(#resolvedBarGrad)"
                      : "url(#activeBarGrad)"
                  }
                  className="transition-all duration-200"
                />

                {/* Top indicator cap for counts > 0 */}
                {item.count > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={3}
                    rx="1.5"
                    fill={item.isTerminal ? "#059669" : "#2563EB"}
                  />
                )}

                {/* Value indicator above bar on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={x + barWidth / 2 - 20}
                      y={y - 24}
                      width="40"
                      height="18"
                      rx="4"
                      fill="#1E293B"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 12}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-white"
                    >
                      {item.count} {item.count === 1 ? "case" : "cases"}
                    </text>
                  </g>
                )}

                {/* X Axis State Abbreviation / Label */}
                <text
                  x={x + barWidth / 2}
                  y={height - 12}
                  textAnchor="middle"
                  className={`text-[8.5px] font-medium transition-colors ${
                    isHovered
                      ? "fill-neutral-900 font-bold"
                      : "fill-neutral-400"
                  }`}
                >
                  {item.state.slice(0, 3)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Accessible Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
            <span>Active Lifecycle ({activeCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span>Terminal / Resolved ({resolvedCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-neutral-200 inline-block" />
            <span>Zero Count</span>
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-neutral-400">
          <Info className="w-3 h-3" />
          <span>Real counts; zero states explicitly preserved</span>
        </div>
      </div>
    </div>
  );
}
