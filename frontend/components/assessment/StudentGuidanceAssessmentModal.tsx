"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  ASSESSMENT_DIMENSIONS,
  ASSESSMENT_QUESTIONS,
  LIKERT_SCALE_OPTIONS,
  CONSENT_TEXT,
  REFLECTION_Q19_OPTIONS,
  REFLECTION_Q20_OPTIONS,
  AssessmentDimensionKey,
} from "./assessmentData";
import {
  scoreAssessment,
  AssessmentReportResult,
  ReflectionAnswers,
} from "./assessmentScoring";
import { GuidanceReportView } from "./GuidanceReportView";

interface StudentGuidanceAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCounselorCall?: () => void;
  savedReport?: AssessmentReportResult | null;
  onSaveReport?: (report: AssessmentReportResult | null) => void;
}

export function StudentGuidanceAssessmentModal({
  isOpen,
  onClose,
  onRequestCounselorCall,
  savedReport = null,
  onSaveReport,
}: StudentGuidanceAssessmentModalProps) {
  // Step navigation:
  // 0: Consent & Intro
  // 1..6: Dimensions 1..6
  // 7: Optional Reflection (Q19, Q20)
  // 8: Review & Submit
  // 9: Completed Report View
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [hasConsented, setHasConsented] = useState<boolean>(false);

  // In-session answers state (Question ID -> 1..5 or null)
  const [answers, setAnswers] = useState<Record<string, number | null>>({});

  // Reflection state
  const [reflections, setReflections] = useState<ReflectionAnswers>({});

  // Final calculated report
  const [report, setReport] = useState<AssessmentReportResult | null>(savedReport);

  // Sync savedReport if passed in
  useEffect(() => {
    if (savedReport) {
      setReport(savedReport);
      setCurrentStep(9);
    }
  }, [savedReport]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: prev[questionId] === value ? null : value,
    }));
  };

  const handleSkipQuestion = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: null,
    }));
  };

  const handleReset = () => {
    setAnswers({});
    setReflections({});
    setReport(null);
    if (onSaveReport) onSaveReport(null);
    setCurrentStep(0);
    setHasConsented(false);
  };

  const handleSubmit = () => {
    const calculated = scoreAssessment(answers, reflections);
    setReport(calculated);
    if (onSaveReport) {
      onSaveReport(calculated);
    }
    setCurrentStep(9);
  };

  // Dimensions (indices 1 to 6)
  const currentDimensionIndex = currentStep >= 1 && currentStep <= 6 ? currentStep - 1 : 0;
  const currentDimension = ASSESSMENT_DIMENSIONS[currentDimensionIndex];
  const dimensionQuestions = currentDimension
    ? ASSESSMENT_QUESTIONS.filter((q) => q.dimensionKey === currentDimension.key)
    : [];

  // Summary counts
  const totalQuestions = ASSESSMENT_QUESTIONS.length; // 18
  const answeredCount = Object.values(answers).filter((v) => v !== null && v !== undefined).length;

  const isReportStep = currentStep === 9;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assessment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className={`bg-white rounded-3xl w-full my-auto shadow-2xl border border-neutral-200/80 flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300 ${
          isReportStep ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-100 rounded-xl text-neutral-800">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1
                id="assessment-modal-title"
                className="text-sm font-extrabold text-neutral-900 font-heading leading-tight"
              >
                Student Guidance Assessment
              </h1>
              <p className="text-[11px] font-medium text-neutral-500">
                {isReportStep
                  ? "Confidential Self-Reflection Summary • Ready for Counselor Discussion"
                  : "Self-reflection tool • 18 questions • Approx. 3–4 min"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP PROGRESS BAR (Steps 1 to 8) */}
        {currentStep >= 1 && currentStep <= 8 && (
          <div className="px-6 pt-3 pb-1 bg-neutral-50/60 border-b border-neutral-100">
            <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5 font-medium">
              <span>
                {currentStep <= 6
                  ? `Dimension ${currentStep} of 6: ${currentDimension.title}`
                  : currentStep === 7
                  ? "Optional Reflection Questions"
                  : "Final Review"}
              </span>
              <span>{answeredCount} of 18 answered</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-900 transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / 8) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 0: Consent & Introduction */}
          {currentStep === 0 && (
            <div className="space-y-5 text-neutral-900">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-neutral-900 font-heading">
                  {CONSENT_TEXT.title}
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {CONSENT_TEXT.description}
                </p>
              </div>

              {/* Informational Points */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/70 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Important Guidelines
                </span>
                <ul className="space-y-2 text-xs text-neutral-700">
                  {CONSENT_TEXT.points.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Consent Acknowledgement */}
              <label className="flex items-start gap-3 p-3.5 bg-neutral-50/80 hover:bg-neutral-100/70 rounded-2xl border border-neutral-200/80 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={hasConsented}
                  onChange={(e) => setHasConsented(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 border-neutral-300 shrink-0"
                />
                <span className="text-xs text-neutral-800 leading-relaxed font-medium">
                  {CONSENT_TEXT.consentPrompt}
                </span>
              </label>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!hasConsented}
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-full shadow-xs transition-all flex items-center gap-2"
                >
                  <span>Begin Assessment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEPS 1 to 6: Dimensions & 3 Questions */}
          {currentStep >= 1 && currentStep <= 6 && (
            <div className="space-y-6">
              {/* Dimension Heading */}
              <div className="space-y-1 pb-3 border-b border-neutral-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Dimension {currentStep} of 6
                </span>
                <h2 className="text-base font-bold text-neutral-900 font-heading">
                  {currentDimension.title}
                </h2>
                <p className="text-xs text-neutral-500">
                  {currentDimension.shortDescription}
                </p>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {dimensionQuestions.map((q) => {
                  const selectedVal = answers[q.id];
                  const isAnswered = selectedVal !== null && selectedVal !== undefined;

                  return (
                    <div
                      key={q.id}
                      className="p-4.5 bg-neutral-50/60 rounded-2xl border border-neutral-200/70 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-neutral-200/70 text-neutral-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {q.number}
                          </span>
                          <p className="text-xs font-semibold text-neutral-900 leading-relaxed">
                            {q.prompt}
                          </p>
                        </div>

                        {isAnswered ? (
                          <button
                            type="button"
                            onClick={() => handleSkipQuestion(q.id)}
                            className="text-[10px] text-neutral-400 hover:text-neutral-700 hover:underline shrink-0"
                          >
                            Skip
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-medium shrink-0 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            Unanswered
                          </span>
                        )}
                      </div>

                      {/* Likert Scale 1 to 5 Buttons */}
                      <div
                        role="radiogroup"
                        aria-label={`Response for question ${q.number}`}
                        className="grid grid-cols-5 gap-1.5 pt-1"
                      >
                        {LIKERT_SCALE_OPTIONS.map((opt) => {
                          const isSelected = selectedVal === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => handleSelectAnswer(q.id, opt.value)}
                              className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1 border ${
                                isSelected
                                  ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                                  : "bg-white text-neutral-700 border-neutral-200/80 hover:bg-neutral-100 hover:border-neutral-300"
                              }`}
                            >
                              <span
                                className={`text-xs font-extrabold ${
                                  isSelected ? "text-white" : "text-neutral-900"
                                }`}
                              >
                                {opt.value}
                              </span>
                              <span
                                className={`text-[9px] leading-tight line-clamp-2 ${
                                  isSelected ? "text-neutral-200" : "text-neutral-500"
                                }`}
                              >
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-full shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>{currentStep === 6 ? "Continue to Reflections" : "Next Dimension"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: Optional Reflection Questions */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="space-y-1 pb-3 border-b border-neutral-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Optional &amp; Unscored
                </span>
                <h2 className="text-base font-bold text-neutral-900 font-heading">
                  Personal Reflections for Counseling
                </h2>
                <p className="text-xs text-neutral-500">
                  These responses are not scored. They help guide your conversation with a counselor.
                </p>
              </div>

              {/* Q19 */}
              <div className="p-4.5 bg-neutral-50/60 rounded-2xl border border-neutral-200/70 space-y-3">
                <label className="text-xs font-semibold text-neutral-900 block leading-relaxed">
                  Q19. What is the biggest challenge you would like help with right now? (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REFLECTION_Q19_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setReflections((prev) => ({
                          ...prev,
                          q19Challenge: prev.q19Challenge === opt ? undefined : opt,
                        }))
                      }
                      className={`px-3 py-2 rounded-xl text-left text-xs font-medium border transition-colors ${
                        reflections.q19Challenge === opt
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-200/80 hover:bg-neutral-100"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q20 */}
              <div className="p-4.5 bg-neutral-50/60 rounded-2xl border border-neutral-200/70 space-y-3">
                <label className="text-xs font-semibold text-neutral-900 block leading-relaxed">
                  Q20. What would you most like to gain from a counseling session? (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REFLECTION_Q20_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setReflections((prev) => ({
                          ...prev,
                          q20SessionGoal: prev.q20SessionGoal === opt ? undefined : opt,
                        }))
                      }
                      className={`px-3 py-2 rounded-xl text-left text-xs font-medium border transition-colors ${
                        reflections.q20SessionGoal === opt
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-200/80 hover:bg-neutral-100"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(8)}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-full shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>Review &amp; Submit</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: Final Review Screen */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div className="space-y-1 pb-3 border-b border-neutral-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Ready to Submit
                </span>
                <h2 className="text-base font-bold text-neutral-900 font-heading">
                  Review Your Self-Reflection
                </h2>
                <p className="text-xs text-neutral-500">
                  Check your answers before generating your guidance summary.
                </p>
              </div>

              {/* Status summary */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700">Questions Answered:</span>
                  <span className="font-bold text-neutral-900">
                    {answeredCount} of {totalQuestions}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700">Questions Skipped:</span>
                  <span className="font-bold text-neutral-500">
                    {totalQuestions - answeredCount}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-200/60">
                  Note: A dimension score requires all 3 questions answered. Dimensions with skipped
                  questions will display &ldquo;Insufficient responses&rdquo; and remain available for
                  verbal discussion with your counselor.
                </p>
              </div>

              {/* Dimension completion list */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block px-1">
                  Dimension Breakdown
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ASSESSMENT_DIMENSIONS.map((dim, idx) => {
                    const qList = ASSESSMENT_QUESTIONS.filter((q) => q.dimensionKey === dim.key);
                    const answered = qList.filter(
                      (q) => answers[q.id] !== null && answers[q.id] !== undefined
                    ).length;
                    const isFull = answered === 3;

                    return (
                      <div
                        key={dim.key}
                        className="p-3 bg-white rounded-xl border border-neutral-200/70 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate">{dim.title}</p>
                          <p className="text-[10px] text-neutral-500">{answered}/3 questions answered</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(idx + 1)}
                          className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 hover:underline shrink-0 ml-2"
                        >
                          {isFull ? "Edit" : "Complete"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(7)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Reflections</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white font-semibold text-xs rounded-full shadow-xs transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Generate Guidance Summary</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 9: Completed Report View */}
          {currentStep === 9 && report && (
            <GuidanceReportView
              report={report}
              onRetake={handleReset}
              onClose={onClose}
              onRequestCounselorCall={onRequestCounselorCall}
            />
          )}
        </div>
      </div>
    </div>
  );
}
