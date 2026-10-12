'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  Clock,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import {
  MLPredictResponse,
  SupportedScenarioFeature,
  WhatIfScenarioResponse,
} from '@/lib/types';
import { api } from '@/lib/api';

export interface GovernedScenarioPanelProps {
  studentId: string;
  externalStudentRef?: string;
  initialPrediction?: MLPredictResponse | null;
  initialFeatures?: Record<string, any>;
  verifiedThreshold?: number;
  onPlanSupport?: () => void;
}

const DEFAULT_SUPPORTED_FEATURES: SupportedScenarioFeature[] = [
  {
    feature_name: 'vle_active_days_d30',
    min_value: 0,
    max_value: 30,
    feature_type: 'int',
    label: 'VLE Active Days (Day 0–30)',
    unit: 'days',
    default_value: 8,
    description: 'Number of distinct calendar days the student accessed the learning environment within the first 30 days.',
  },
  {
    feature_name: 'vle_days_since_last_click',
    min_value: 0,
    max_value: 30,
    feature_type: 'float',
    label: 'Days Since Last Interaction',
    unit: 'days',
    default_value: 6,
    description: "Elapsed days between the student's most recent interaction and Day 30 (0 = active on Day 30, 30 = inactive).",
  },
  {
    feature_name: 'vle_clicks_last_7d',
    min_value: 0,
    max_value: 1000,
    feature_type: 'float',
    label: 'Recent Weekly Activity (Days 24–30)',
    unit: 'clicks',
    default_value: 12,
    description: 'Interaction count within the final 7 days leading to the Day 30 evaluation boundary.',
  },
  {
    feature_name: 'vle_total_clicks_d30',
    min_value: 0,
    max_value: 3000,
    feature_type: 'float',
    label: 'Total VLE Interactions (Day 0–30)',
    unit: 'clicks',
    default_value: 142,
    description: 'Cumulative count of interactions across all online course components by Day 30.',
  },
  {
    feature_name: 'assessments_submitted_d30',
    min_value: 0,
    max_value: 10,
    feature_type: 'int',
    label: 'Assessments Submitted by Day 30',
    unit: 'submissions',
    default_value: 1,
    description: 'Number of formal course assessment items submitted prior to Day 30.',
  },
  {
    feature_name: 'has_early_assessment_submission_d30',
    min_value: 0,
    max_value: 1,
    feature_type: 'int',
    label: 'Early Assessment Submission',
    unit: 'binary',
    default_value: 1,
    description: 'Binary indicator of whether an early diagnostic assessment was submitted by Day 30 (1 = Yes, 0 = No).',
  },
];

export function GovernedScenarioPanel({
  studentId,
  externalStudentRef = 'STUDENT',
  initialPrediction,
  initialFeatures = {},
  verifiedThreshold = 0.46,
  onPlanSupport,
}: GovernedScenarioPanelProps) {
  const [supportedFeatures, setSupportedFeatures] = useState<SupportedScenarioFeature[]>(DEFAULT_SUPPORTED_FEATURES);
  const [baselineValues, setBaselineValues] = useState<Record<string, number>>({});
  const [hypotheticalValues, setHypotheticalValues] = useState<Record<string, number>>({});
  const [scenarioResult, setScenarioResult] = useState<WhatIfScenarioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSupportGuidance, setShowSupportGuidance] = useState(false);

  // Initialize baseline values from props or feature defaults
  useEffect(() => {
    const initial: Record<string, number> = {};
    supportedFeatures.forEach((feat) => {
      if (initialFeatures[feat.feature_name] !== undefined) {
        initial[feat.feature_name] = Number(initialFeatures[feat.feature_name]);
      } else {
        initial[feat.feature_name] = feat.default_value;
      }
    });
    setBaselineValues(initial);
    setHypotheticalValues(initial);
  }, [supportedFeatures, initialFeatures]);

  // Load supported features metadata from backend
  useEffect(() => {
    let mounted = true;
    api.ml
      .getSupportedScenarioFeatures()
      .then((data: SupportedScenarioFeature[]) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setSupportedFeatures(data);
        }
      })
      .catch(() => {
        // Fallback to default canonical features
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSliderChange = (featName: string, value: number) => {
    setHypotheticalValues((prev) => ({
      ...prev,
      [featName]: value,
    }));
  };

  const handleResetToBaseline = () => {
    setHypotheticalValues(baselineValues);
    setScenarioResult(null);
    setErrorMessage(null);
  };

  const handleSimulate = async () => {
    setLoading(true);
    setErrorMessage(null);

    // Compute diff: which features actually changed
    const modifications: Record<string, number> = {};
    supportedFeatures.forEach((f) => {
      const current = hypotheticalValues[f.feature_name];
      const base = baselineValues[f.feature_name];
      if (current !== undefined && current !== base) {
        modifications[f.feature_name] = current;
      }
    });

    if (Object.keys(modifications).length === 0) {
      setErrorMessage('Adjust at least one slider to simulate a hypothetical scenario.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.students.simulateScenario(studentId, {
        external_student_ref: externalStudentRef,
        base_features: baselineValues,
        hypothetical_modifications: modifications,
      });
      setScenarioResult(response);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Scenario calculation failed. Verify input values against Day-30 bounds.'
      );
    } finally {
      setLoading(false);
    }
  };

  const changedFeatureCount = Object.keys(hypotheticalValues).filter(
    (k) => hypotheticalValues[k] !== baselineValues[k]
  ).length;

  const baselineProbability =
    scenarioResult?.baseline_risk_probability ??
    (initialPrediction ? initialPrediction.risk_probability : 0.52);

  const baselineClassification =
    scenarioResult?.baseline_classification ??
    (initialPrediction ? initialPrediction.classification : baselineProbability >= verifiedThreshold ? 'At_Risk' : 'On_Track');

  return (
    <div
      id="governed-scenario-panel"
      className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-6"
    >
      {/* Header and Governance Badges */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-neutral-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                Governed What-If Scenario Exploration
                <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  Phase 8
                </span>
              </h3>
              <p className="text-xs text-neutral-500">
                Simulate hypothetical Day-30 engagement adjustments without altering the official student record.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            Model: <strong className="text-neutral-900 font-mono">v1.0.0</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            Cutoff: <strong className="text-neutral-900">Day 30</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            Threshold: <strong className="text-neutral-900 font-mono">{(verifiedThreshold * 100).toFixed(0)}%</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Ephemeral Only
          </span>
        </div>
      </div>

      {/* Mandatory Non-Causal & Temporal Cutoff Governance Alert */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white border border-purple-200/70 space-y-2">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-purple-950">
            <p className="font-semibold text-purple-900">
              Non-Causal Model Calculation Notice (Statistical Projection Only)
            </p>
            <p className="text-neutral-600 leading-relaxed">
              This simulation evaluates the mathematical response of the frozen Day-30 logistic regression equation
              (<span className="font-mono text-neutral-800">z = β₀ + ∑ βᵢxᵢ</span>). It does{' '}
              <strong>NOT</strong> estimate the causal effect of an intervention. For example, artificially increasing
              clicks does not guarantee improved learning, and prospective tutoring cannot be simulated as past Day-30
              evidence. <em>Statistical correlation does not imply treatment effect.</em>
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Controls & Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Controls (Supported Day-30 Features Only) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              Supported Day-30 Engagement Inputs
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToBaseline}
                className="px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Baseline
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/70 space-y-4">
            {supportedFeatures.map((feat) => {
              const currentVal = hypotheticalValues[feat.feature_name] ?? feat.default_value;
              const baseVal = baselineValues[feat.feature_name] ?? feat.default_value;
              const isModified = currentVal !== baseVal;
              const delta = currentVal - baseVal;

              return (
                <div
                  key={feat.feature_name}
                  className={`p-3 rounded-lg border transition-all ${
                    isModified
                      ? 'bg-purple-50/40 border-purple-200/80 shadow-2xs'
                      : 'bg-white border-neutral-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor={`input-${feat.feature_name}`}
                      className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5"
                    >
                      {feat.label}
                      {isModified && (
                        <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-purple-200/70 text-purple-900">
                          Δ {delta > 0 ? `+${delta}` : delta} {feat.unit}
                        </span>
                      )}
                    </label>
                    <span className="text-xs font-mono font-bold text-neutral-700">
                      {currentVal} <span className="text-neutral-400 text-2xs font-normal">{feat.unit}</span>
                    </span>
                  </div>

                  <p className="text-2xs text-neutral-500 mb-2 leading-relaxed">
                    {feat.description}
                  </p>

                  <div className="flex items-center gap-3">
                    <input
                      id={`input-${feat.feature_name}`}
                      type="range"
                      min={feat.min_value}
                      max={feat.max_value}
                      step={feat.feature_type === 'int' ? 1 : 0.5}
                      value={currentVal}
                      onChange={(e) => handleSliderChange(feat.feature_name, parseFloat(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={feat.min_value}
                      max={feat.max_value}
                      step={feat.feature_type === 'int' ? 1 : 0.5}
                      value={currentVal}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        if (!isNaN(parsed)) handleSliderChange(feat.feature_name, parsed);
                      }}
                      className="w-16 px-2 py-1 text-xs font-mono text-center rounded border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-neutral-500">
              {changedFeatureCount > 0 ? (
                <strong className="text-purple-700">{changedFeatureCount} input(s) modified</strong>
              ) : (
                'Modify inputs above to calculate hypothetical trajectory'
              )}
            </span>
            <button
              type="button"
              onClick={handleSimulate}
              disabled={loading || changedFeatureCount === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  Calculating Projection...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Calculate Scenario
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Side-by-Side Comparison */}
        <div className="lg:col-span-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
            Side-by-Side Model Comparison
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {/* Baseline Card */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-3">
              <span className="text-2xs font-bold uppercase tracking-wider text-neutral-500 block">
                Observed Baseline (Day 30)
              </span>
              <div>
                <span className="text-2xl font-black font-mono text-neutral-900 block">
                  {(baselineProbability * 100).toFixed(1)}%
                </span>
                <span className="text-2xs text-neutral-400">Risk Probability</span>
              </div>
              <span
                className={`inline-block px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wider ${
                  baselineClassification === 'At_Risk'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {baselineClassification === 'At_Risk' ? 'At Risk' : 'On Track'}
              </span>
            </div>

            {/* Hypothetical Card */}
            <div
              className={`p-4 rounded-xl border space-y-3 transition-all ${
                scenarioResult
                  ? scenarioResult.hypothetical_classification === 'On_Track'
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-amber-50/60 border-amber-200'
                  : 'bg-neutral-50/40 border-dashed border-neutral-300'
              }`}
            >
              <span className="text-2xs font-bold uppercase tracking-wider text-purple-700 block">
                Hypothetical Scenario
              </span>
              {scenarioResult ? (
                <>
                  <div>
                    <span className="text-2xl font-black font-mono text-neutral-900 block">
                      {(scenarioResult.hypothetical_risk_probability * 100).toFixed(1)}%
                    </span>
                    <span className="text-2xs text-neutral-500">Calculated Projection</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wider ${
                        scenarioResult.hypothetical_classification === 'At_Risk'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {scenarioResult.hypothetical_classification === 'At_Risk' ? 'At Risk' : 'On Track'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-2xs font-bold font-mono flex items-center gap-0.5 ${
                        scenarioResult.delta_probability < 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {scenarioResult.delta_probability < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <TrendingUp className="w-3 h-3" />
                      )}
                      {scenarioResult.delta_percentage_points > 0 ? '+' : ''}
                      {scenarioResult.delta_percentage_points.toFixed(1)}%
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-5 text-center text-xs text-neutral-400">
                  Click &ldquo;Calculate Scenario&rdquo; to view projected risk
                </div>
              )}
            </div>
          </div>

          {/* Changed Inputs Summary Table */}
          {scenarioResult && scenarioResult.modified_features.length > 0 && (
            <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 space-y-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-neutral-500 block">
                Modified Parameters Summary
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-2xs">
                  <thead>
                    <tr className="border-b border-neutral-100 text-neutral-400">
                      <th className="pb-1 font-semibold">Parameter</th>
                      <th className="pb-1 font-semibold text-right">Baseline</th>
                      <th className="pb-1 font-semibold text-right">Hypothetical</th>
                      <th className="pb-1 font-semibold text-right">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50 font-mono">
                    {scenarioResult.modified_features.map((mod) => (
                      <tr key={mod.feature} className="text-neutral-700">
                        <td className="py-1 font-sans text-neutral-900 font-medium">{mod.label}</td>
                        <td className="py-1 text-right text-neutral-500">{mod.original_value}</td>
                        <td className="py-1 text-right text-purple-700 font-bold">{mod.hypothetical_value}</td>
                        <td className="py-1 text-right text-neutral-700">
                          {mod.delta > 0 ? `+${mod.delta}` : mod.delta} {mod.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ephemeral Guarantee Badge */}
          <div className="p-3 rounded-lg bg-neutral-100/70 border border-neutral-200/60 text-2xs text-neutral-600 flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Database Mutation:</strong> Hypothetical scenarios are computed entirely in memory.
              No rows are written to <code className="font-mono text-neutral-800">ml_inference_logs</code>, and no cases or
              signals are created.
            </span>
          </div>

          {/* Qualitative Support Planning Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowSupportGuidance(!showSupportGuidance)}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-neutral-500" />
                Support Planning & Causal Efficacy Guidance
              </span>
              <span className="text-2xs text-neutral-500">
                {showSupportGuidance ? 'Hide Guidance' : 'View Guidance'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Explanatory Non-Predictive Support Planning Section (Requirement 9 & 7) */}
      {showSupportGuidance && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50/50 via-white to-purple-50/30 border border-amber-200/80 space-y-4 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h5 className="font-bold text-neutral-900">
                Why Real Support Interventions Cannot Be Directly Scored by the Day-30 Model
              </h5>
              <p className="text-neutral-600 leading-relaxed">
                The Day-30 early warning model is a correlational statistical classifier trained on retrospective
                observational data. It cannot predict the treatment effect of prospective interventions like tutoring or
                coaching. Attendance at tutoring is subject to unobserved confounding (motivation, course difficulty,
                personal schedule) that cannot be modeled by simple linear click features.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-100/60 border border-amber-200 text-xs text-amber-950 font-medium">
            <strong>Prohibition on Causal Claims:</strong> Do not claim to students or staff that attending a specific
            number of tutoring sessions will reduce failure risk by a guaranteed percentage. Such claims are scientifically
            unsupported by this model.
          </div>

          <div className="space-y-2 text-xs text-neutral-700">
            <span className="font-bold text-neutral-900 block">Recommended Educator Support Protocol:</span>
            <ul className="list-disc list-inside space-y-1 text-neutral-600 text-2xs">
              <li>Conduct an empathetic 1-on-1 check-in to uncover personal or scheduling obstacles.</li>
              <li>Offer optional academic coaching or peer tutoring without attributing false statistical guarantees.</li>
              <li>Coordinate with course faculty to clarify early assessment expectations.</li>
              <li>Document supportive decisions qualitatively in Case Management rather than attempting to alter model inputs.</li>
            </ul>
          </div>

          {onPlanSupport && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onPlanSupport}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-900 bg-amber-200 hover:bg-amber-300 transition-colors"
              >
                Open Case Management Support Plan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
