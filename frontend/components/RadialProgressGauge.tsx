"use client";

import React, { useState } from "react";
import { Check, Info, ShieldCheck } from "lucide-react";
import { InterventionDistribution } from "@/lib/analytics-selectors";

interface RadialProgressGaugeProps {
  distribution?: InterventionDistribution;
  className?: string;
}

export function RadialProgressGauge({
  distribution,
  className = "",
}: RadialProgressGaugeProps) {
  const items = distribution?.items || [];
  const totalAssigned = distribution?.totalAssigned || 0;
  const unassignedCount = distribution?.unassignedCount || 0;

  // Primary rate: percentage of cases that have an active assigned intervention protocol
  const totalCasesWithOrWithout = totalAssigned + unassignedCount;
  const coverageRate =
    totalCasesWithOrWithout > 0
      ? Math.round((totalAssigned / totalCasesWithOrWithout) * 100)
      : 100;

  // Semi-circle gauge arc calculations
  const radius = 64;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle arc length
  const strokeDashoffset = circumference - (coverageRate / 100) * circumference;

  return (
    <div className={`skill-card p-5 sm:p-6 bg-white relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
            Intervention Protocol Allocation
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Distribution of assigned support protocols across active cases
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-500 font-medium">
            ({totalAssigned} Assigned)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
        {/* Left: Semi-circular Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-44 h-28 flex items-end justify-center overflow-hidden">
            <svg
              viewBox="0 0 160 90"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4ADE80" />
                  <stop offset="60%" stopColor="#86EFAC" />
                  <stop offset="100%" stopColor="#BBF7D0" />
                </linearGradient>

                <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#22C55E" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Background Arc */}
              <path
                d="M 16 80 A 64 64 0 0 1 144 80"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Progress Arc */}
              <path
                d="M 16 80 A 64 64 0 0 1 144 80"
                fill="none"
                stroke="url(#gaugeGrad)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                filter="url(#gaugeShadow)"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Center Rate Text */}
            <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-neutral-900 tracking-tight leading-none">
                {coverageRate}%
              </span>
              <span className="text-[10px] font-medium text-neutral-400 mt-1 whitespace-nowrap">
                Protocol Assigned
              </span>
            </div>
          </div>
        </div>

        {/* Right: Breakdown of Canonical Intervention Types */}
        <div className="md:col-span-7 space-y-2.5">
          {items.map((cat) => (
            <div
              key={cat.key}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-neutral-700 truncate max-w-[180px]" title={cat.label}>
                  {cat.label}
                </span>
                <span className="text-neutral-900 font-semibold tabular-nums">
                  {cat.count} ({cat.percentage}%)
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}

          {unassignedCount > 0 && (
            <div className="flex items-center justify-between text-xs font-medium text-amber-600 pt-1">
              <span>Pending Protocol Selection</span>
              <span className="font-semibold">{unassignedCount} cases</span>
            </div>
          )}
        </div>
      </div>

      {/* Accessible Footer Notice */}
      <div className="flex items-center justify-between pt-3 mt-4 border-t border-neutral-100 text-[11px] text-neutral-400">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-neutral-400" />
          <span>Measures assigned intervention types; not post-hoc completion claims.</span>
        </span>
        <span className="font-medium text-neutral-600">
          Canonical Catalog
        </span>
      </div>
    </div>
  );
}
