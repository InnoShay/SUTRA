"use client";

import React from "react";
import { Activity, ShieldCheck, AlertCircle, Info, Database } from "lucide-react";
import { RiskAttributionCount } from "@/lib/analytics-selectors";

interface ActivityHeatmapProps {
  attributions?: RiskAttributionCount[];
  backendConnected?: boolean;
  className?: string;
}

export function ActivityHeatmap({
  attributions = [],
  backendConnected = false,
  className = "",
}: ActivityHeatmapProps) {
  return (
    <div className={`skill-card p-5 sm:p-6 bg-white relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
            Observation Ingestion &amp; Policy Triggers
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Operational ingestion status, temporal depth audit, and ML feature risk drivers
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
          <Database className="w-3.5 h-3.5 text-neutral-400" />
          <span>{backendConnected ? "Live Ingestion" : "Point-in-Time Snapshot"}</span>
        </div>
      </div>

      {/* Audit Limitation Notice */}
      <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60 mb-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
          <Info className="w-4 h-4 text-neutral-500 flex-shrink-0" />
          <span>Temporal Ingestion Integrity Notice</span>
        </div>
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          SUTRA backend ingests point-in-time observations per student evaluation cycle. Arbitrary multi-month hourly activity heatmaps have been eliminated to avoid fabricating historical calendar telemetry without continuous outbox streaming.
        </p>
      </div>

      {/* Feature Attribution Drivers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 border-b border-neutral-100 pb-2">
          <span>Primary ML Policy Risk Drivers</span>
          <span className="text-neutral-400 font-normal text-[11px]">Avg Weight Attribution</span>
        </div>

        {attributions.length === 0 ? (
          <div className="py-6 text-center text-neutral-400 text-xs">
            No active policy trigger attributions in scope.
          </div>
        ) : (
          attributions.map((attr) => (
            <div key={attr.feature} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-700">
                  {attr.label}
                </span>
                <span className="font-semibold text-neutral-900 tabular-nums">
                  {attr.avgAttribution > 0 ? `+${attr.avgAttribution}` : attr.avgAttribution} (x{attr.count})
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-neutral-800 h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(Math.round(attr.avgAttribution * 100), 100)}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 mt-4 border-t border-neutral-100 text-[11px] text-neutral-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Strict temporal cutoffs enforced</span>
        </span>
        <span className="font-medium text-neutral-600">
          ADR-003 / ADR-004 Compliant
        </span>
      </div>
    </div>
  );
}
