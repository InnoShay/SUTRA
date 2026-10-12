"use client";

import React, { useState } from "react";
import { Settings, Copy, ArrowUpRight, Check, Activity, Calendar } from "lucide-react";
import { SignalTimelineSummary } from "@/lib/analytics-selectors";

interface Point {
  month: string;
  value: number;
}

interface EngagementChartProps {
  timeline?: SignalTimelineSummary;
  points?: Point[];
  timeframe?: string;
  title?: string;
  className?: string;
}

export function EngagementChart({
  timeline,
  points,
  timeframe = "This Month",
  title = "Institutional Telemetry & Signal Generation Velocity",
  className = "",
}: EngagementChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // SVG dimensions
  const width = 500;
  const height = 220;
  const padLeft = 36;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Check if timeline is provided and has points
  const timelinePoints = timeline?.points;
  const hasTimelineData = timelinePoints && timelinePoints.length > 0;

  // If timeline data exists, map from real signal timeline points
  // Otherwise, if explicit points prop passed (e.g. from dashboard caller), use that
  let chartPoints: { label: string; value: number; sub?: string }[] = [];

  if (hasTimelineData) {
    chartPoints = timelinePoints.map((tp) => ({
      label: tp.label,
      value: tp.signalsCount,
      sub: `${tp.concernsCount} concerns`,
    }));
  } else if (points && points.length > 0) {
    chartPoints = points.map((p) => ({
      label: p.month,
      value: p.value,
    }));
  }

  const maxVal = Math.max(
    ...chartPoints.map((p) => p.value),
    hasTimelineData ? 4 : 4000
  );

  // Convert points to SVG coordinates
  const coords = chartPoints.map((p, i) => {
    const x =
      chartPoints.length > 1
        ? padLeft + (i / (chartPoints.length - 1)) * chartW
        : padLeft + chartW / 2;
    const y =
      maxVal > 0 ? padTop + chartH - (p.value / maxVal) * chartH : padTop + chartH;
    return { x, y, ...p };
  });

  // Generate smooth bezier curve path
  const createSmoothPath = (pts: typeof coords) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${padLeft} ${pts[0].y} L ${width - padRight} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 5;
      const cp1y = p1.y + (p2.y - p0.y) / 5;
      const cp2x = p2.x - (p3.x - p1.x) / 5;
      const cp2y = p2.y - (p3.y - p1.y) / 5;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = createSmoothPath(coords);
  const lastPt = coords[coords.length - 1];
  const firstPt = coords[0];
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${lastPt?.x || width} ${padTop + chartH} L ${firstPt?.x || padLeft} ${padTop + chartH} Z`
      : "";

  const activeIdx =
    hoveredIdx !== null ? hoveredIdx : coords.length > 0 ? coords.length - 1 : null;
  const activePt = activeIdx !== null ? coords[activeIdx] : null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `Signal Telemetry (${timeframe}): ${timeline?.totalSignals || chartPoints.reduce((acc, p) => acc + p.value, 0)} signals tracked.`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`skill-card p-5 sm:p-6 bg-white relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
            {title}
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {hasTimelineData
              ? `Real timestamp distribution (${timeline?.points.length} evaluation dates observed)`
              : `Operational signal trend for active scope (${timeframe})`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-neutral-400">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-700 transition-colors"
            title="Copy Report"
            aria-label="Copy Report"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Chart Body */}
      {chartPoints.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-neutral-50/50 rounded-2xl border border-neutral-100">
          <Activity className="w-8 h-8 text-neutral-300 mb-2 stroke-[1.5]" />
          <p className="text-xs font-semibold text-neutral-700">
            No Historical Trend Data Available
          </p>
          <p className="text-[11px] text-neutral-400 max-w-sm mt-1">
            Historical signal trends require multiple distinct evaluation runs with verified timestamps. Single-cycle snapshots do not interpolate artificial curves.
          </p>
        </div>
      ) : (
        <div className="relative w-full aspect-[2.1/1] select-none">
          {/* Active tooltip badge */}
          {activePt && (
            <div
              className="absolute z-20 pointer-events-none transition-all duration-200 ease-out flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-100 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-[11px] font-semibold text-neutral-800 whitespace-nowrap"
              style={{
                left: `${Math.min(Math.max((activePt.x / width) * 100, 25), 75)}%`,
                top: `${(activePt.y / height) * 100}%`,
                transform: "translate(-50%, -140%)",
              }}
            >
              <Activity className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
              <span>
                {activePt.label}: {activePt.value} {activePt.value === 1 ? "Signal" : "Signals"}
              </span>
            </div>
          )}

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="engagementFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#86EFAC" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#BBF7D0" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#DCFCE7" stopOpacity="0.0" />
              </linearGradient>

              <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  floodColor="#22C55E"
                  floodOpacity="0.6"
                />
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            {[maxVal, Math.round(maxVal / 2), 0].map((val, idx) => {
              const y = padTop + chartH - (maxVal > 0 ? (val / maxVal) * chartH : 0);
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
                    x={padLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] font-medium fill-neutral-400"
                  >
                    {val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val}
                  </text>
                </g>
              );
            })}

            {/* Area gradient under curve */}
            {areaPath && <path d={areaPath} fill="url(#engagementFillGrad)" />}

            {/* Smooth bezier line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Interactive hover targets */}
            {coords.map((pt, idx) => (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onTouchStart={() => setHoveredIdx(idx)}
              >
                <rect
                  x={pt.x - chartW / (coords.length * 2 || 1)}
                  y={padTop}
                  width={chartW / (coords.length || 1)}
                  height={chartH}
                  fill="transparent"
                />
              </g>
            ))}

            {/* Active Point Indicator */}
            {activePt && (
              <g>
                <circle
                  cx={activePt.x}
                  cy={activePt.y}
                  r="6"
                  fill="#22C55E"
                  filter="url(#greenGlow)"
                />
                <circle cx={activePt.x} cy={activePt.y} r="3" fill="#FFFFFF" />
              </g>
            )}

            {/* X Axis Date / Month Labels */}
            {coords.map((pt, idx) => (
              <text
                key={idx}
                x={pt.x}
                y={height - 8}
                textAnchor="middle"
                className="text-[10px] font-medium fill-neutral-400"
              >
                {pt.label}
              </text>
            ))}
          </svg>
        </div>
      )}

      {/* Accessible Note */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-[11px] text-neutral-400">
        <span>
          {hasTimelineData
            ? `Window: ${timeline?.oldestDate ? new Date(timeline.oldestDate).toLocaleDateString() : "Recent"} - ${timeline?.newestDate ? new Date(timeline.newestDate).toLocaleDateString() : "Present"}`
            : "Aggregated institutional evaluation telemetry"}
        </span>
        <span className="font-medium text-emerald-600">
          No alert without action
        </span>
      </div>
    </div>
  );
}
