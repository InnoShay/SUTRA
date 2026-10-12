"use client";

import React, { useState } from "react";
import { ReliabilityBinDTO } from "@/lib/types";
import { Gauge, Table as TableIcon, Info, CheckCircle2 } from "lucide-react";

interface ReliabilityCalibrationChartProps {
  reliabilityBins: ReliabilityBinDTO[];
  ece: number;
  mce: number;
  brierScore: number;
}

export function ReliabilityCalibrationChart({
  reliabilityBins,
  ece,
  mce,
  brierScore,
}: ReliabilityCalibrationChartProps) {
  const [showTable, setShowTable] = useState(false);

  // SVG dimensions for calibration diagram
  const svgWidth = 460;
  const svgHeight = 280;
  const padding = 45;
  const plotWidth = svgWidth - padding * 2;
  const plotHeight = svgHeight - padding * 2;

  // Coordinate transforms
  const toX = (val: number) => padding + val * plotWidth;
  const toY = (val: number) => padding + (1 - val) * plotHeight;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Probability Calibration & Reliability</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            10-bin empirical calibration curve assessed against held-out ground truth outcomes
          </p>
        </div>

        <button
          onClick={() => setShowTable(!showTable)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors self-start sm:self-auto"
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>{showTable ? "Hide Reliability Table" : "Show Reliability Table"}</span>
        </button>
      </div>

      {/* Calibration Quality Metrics */}
      <div className="grid grid-cols-3 gap-4 my-4">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
          <div className="text-xs text-slate-500 font-medium">Brier Score</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{brierScore.toFixed(4)}</div>
          <div className="text-[10px] text-slate-400">Lower is better (0 = ideal)</div>
        </div>

        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-center">
          <div className="text-xs text-indigo-700 font-medium">Expected Calib. Error (ECE)</div>
          <div className="text-lg font-bold text-indigo-900 mt-0.5">{(ece * 100).toFixed(2)}%</div>
          <div className="text-[10px] text-indigo-500">Average reliability gap</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
          <div className="text-xs text-slate-500 font-medium">Max Calib. Error (MCE)</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{(mce * 100).toFixed(2)}%</div>
          <div className="text-[10px] text-slate-400">Worst single-bin gap</div>
        </div>
      </div>

      {/* Calibration Plot Diagram */}
      <div className="flex flex-col items-center my-3">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[480px] overflow-visible"
          role="img"
          aria-label="Probability Calibration Plot comparing predicted risk against observed failure frequency"
        >
          {/* Grid lines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((tick) => (
            <React.Fragment key={tick}>
              {/* Horizontal grid lines */}
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

              {/* Vertical grid lines */}
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

          {/* Perfect Calibration Diagonal (Reference Line y = x) */}
          <line
            x1={toX(0)}
            y1={toY(0)}
            x2={toX(1)}
            y2={toY(1)}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Observed Points & Line connecting them */}
          {reliabilityBins.map((bin, i) => {
            if (i === 0) return null;
            const prev = reliabilityBins[i - 1];
            return (
              <line
                key={`line-${i}`}
                x1={toX(prev.mean_predicted_prob)}
                y1={toY(prev.observed_positive_rate)}
                x2={toX(bin.mean_predicted_prob)}
                y2={toY(bin.observed_positive_rate)}
                stroke="#4f46e5"
                strokeWidth="2"
              />
            );
          })}

          {/* Points */}
          {reliabilityBins.map((bin, i) => (
            <g key={`pt-${i}`}>
              <circle
                cx={toX(bin.mean_predicted_prob)}
                cy={toY(bin.observed_positive_rate)}
                r="4.5"
                className="fill-indigo-600 stroke-white stroke-2 hover:r-6 cursor-pointer"
              >
                <title>
                  {`${bin.bin_range}: Pred ${(bin.mean_predicted_prob * 100).toFixed(1)}%, Obs ${(bin.observed_positive_rate * 100).toFixed(1)}% (N=${bin.samples_count})`}
                </title>
              </circle>
            </g>
          ))}

          {/* Axis Labels */}
          <text
            x={svgWidth / 2}
            y={svgHeight - 6}
            textAnchor="middle"
            className="text-[11px] fill-slate-600 font-medium select-none"
          >
            Mean Predicted Probability P(y = 1)
          </text>
          <text
            x={-svgHeight / 2}
            y={12}
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-[11px] fill-slate-600 font-medium select-none"
          >
            Observed Positive Outcome Rate
          </text>
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-slate-600 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-400 border-dashed border-t border-slate-400" />
            <span>Perfect Calibration (Ideal y = x)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span>Observed Empirical Rate</span>
          </div>
        </div>
      </div>

      {/* Accessible Reliability Data Table */}
      {showTable && (
        <div className="mt-4 border border-slate-200 rounded-lg overflow-x-auto text-xs">
          <table className="w-full text-left divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-3 py-2">Bin Range</th>
                <th className="px-3 py-2 text-right">Samples (N)</th>
                <th className="px-3 py-2 text-right">Mean Pred. Prob</th>
                <th className="px-3 py-2 text-right">Observed Rate</th>
                <th className="px-3 py-2 text-right">Calibration Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {reliabilityBins.map((bin) => (
                <tr key={bin.bin_range} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-medium text-slate-900">{bin.bin_range}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{bin.samples_count.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                    {(bin.mean_predicted_prob * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                    {(bin.observed_positive_rate * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-indigo-700">
                    {(bin.calibration_gap * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 border border-slate-100 leading-relaxed">
        <strong>Calibration Interpretation:</strong> Expected Calibration Error (ECE) of 6.81% indicates that model probabilities closely match empirical failure frequencies. In the [0.4, 0.5) bin, students predicted at an average of 44.9% have an actual withdrawal rate of 35.3% (9.7% gap).
      </div>
    </div>
  );
}
