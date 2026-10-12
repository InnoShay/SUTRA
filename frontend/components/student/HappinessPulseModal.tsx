"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import {
  HAPPINESS_QUESTIONS,
  HAPPINESS_DIMENSIONS,
  HAPPINESS_LIKERT_OPTIONS,
  HAPPINESS_PRIVACY_DISCLOSURE,
  HAPPINESS_QUESTIONNAIRE_VERSION,
} from "@/lib/happinessData";
import { HappinessPulseSubmissionRequest } from "@/lib/types";
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  X,
  Sparkles,
  Lock,
} from "lucide-react";

interface HappinessPulseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HappinessPulseModal({ isOpen, onClose }: HappinessPulseModalProps) {
  const {
    submitStudentHappinessPulse,
    studentPulseSubmitted,
    isSubmittingPulse,
    pulseSubmitError,
  } = useSkillHub();

  // Current step: 0 to 5 are the 6 questions; 6 is the optional reflection & review step; 7 is success
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [reflection, setReflection] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(studentPulseSubmitted);

  if (!isOpen) return null;

  const totalQuestions = HAPPINESS_QUESTIONS.length;
  const isQuestionStep = currentStep < totalQuestions;
  const isReflectionStep = currentStep === totalQuestions;
  const activeQuestion = isQuestionStep ? HAPPINESS_QUESTIONS[currentStep] : null;
  const activeDimension = activeQuestion
    ? HAPPINESS_DIMENSIONS.find((d) => d.key === activeQuestion.dimensionKey)
    : null;

  const currentAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;

  const handleSelectOption = (value: number) => {
    if (!activeQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: value,
    }));
    setLocalError(null);
  };

  const handleNext = () => {
    if (isQuestionStep) {
      if (!currentAnswer) {
        setLocalError("Please select an option to continue, or skip if you prefer not to answer.");
        return;
      }
      setLocalError(null);
      setCurrentStep((prev) => prev + 1);
    } else if (isReflectionStep) {
      handleFinalSubmit();
    }
  };

  const handleSkipQuestion = () => {
    setLocalError(null);
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setLocalError(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinalSubmit = async () => {
    setLocalError(null);
    try {
      const payload: HappinessPulseSubmissionRequest = {
        questionnaire_version: HAPPINESS_QUESTIONNAIRE_VERSION,
        responses: answers,
        reflection: reflection.trim() || undefined,
        submitted_at: new Date().toISOString(),
      };

      await submitStudentHappinessPulse(payload);
      setIsSuccess(true);
      setCurrentStep(totalQuestions + 1);
    } catch (err: any) {
      setLocalError(
        err?.message ||
          pulseSubmitError ||
          "Could not submit your responses. Your entered answers are preserved. Please click Try Again."
      );
    }
  };

  const handleResetAndClose = () => {
    onClose();
  };

  // Progress percentage
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round(((currentStep + 1) / (totalQuestions + 1)) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="happiness-pulse-title"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-neutral-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="happiness-pulse-title"
                  className="text-base font-bold text-neutral-900 font-heading"
                >
                  Weekly Happiness Pulse
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full border border-rose-200">
                  1–2 min
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Anonymous aggregate pulse to improve your campus experience
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar (Visible during questions & reflection) */}
        {!isSuccess && (
          <div className="w-full bg-neutral-100 h-1.5 overflow-hidden">
            <div
              className="bg-rose-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Error Banner */}
          {(localError || pulseSubmitError) && (
            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Notice</p>
                <p className="mt-0.5 text-rose-700">{localError || pulseSubmitError}</p>
              </div>
            </div>
          )}

          {/* STATE 1: QUESTION STEPS (0 to 5) */}
          {isQuestionStep && activeQuestion && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Question metadata badge */}
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                  {activeDimension?.title || "Dimension"}
                </span>
                <span className="font-medium text-neutral-600">
                  Question {currentStep + 1} of {totalQuestions}
                </span>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900 leading-snug font-heading">
                  &ldquo;{activeQuestion.prompt}&rdquo;
                </h3>
                <p className="text-xs text-neutral-500">
                  {activeDimension?.focusArea}
                </p>
              </div>

              {/* Likert 5-point options */}
              <div
                className="space-y-2.5"
                role="radiogroup"
                aria-label={activeQuestion.prompt}
              >
                {HAPPINESS_LIKERT_OPTIONS.map((opt) => {
                  const isSelected = currentAnswer === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectOption(opt.value)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-rose-50/70 border-rose-400 text-rose-950 font-semibold ring-2 ring-rose-300/60 shadow-2xs"
                          : "bg-white hover:bg-neutral-50/80 border-neutral-200/90 text-neutral-800 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "border-rose-600 bg-rose-600"
                              : "border-neutral-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs font-mono text-neutral-400 font-normal">
                        Scale {opt.value}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STATE 2: OPTIONAL REFLECTION STEP (Step 6) */}
          {isReflectionStep && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    Step 2 of 2
                  </span>
                  <span className="text-xs text-neutral-400">• Optional</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 font-heading">
                  Suggestions or Reflections
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Is there anything specific affecting your wellbeing or campus experience that you would like leadership or student advisors to know?
                </p>
              </div>

              {/* Text Area */}
              <div className="space-y-2">
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Share any thoughts, workload suggestions, or community feedback here (optional)..."
                  rows={4}
                  maxLength={1000}
                  className="w-full p-4 text-xs sm:text-sm bg-neutral-50 rounded-2xl border border-neutral-200 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-200/60 outline-none transition-all placeholder:text-neutral-400"
                />
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Strictly optional. You may leave this blank.</span>
                  <span>{reflection.length} / 1000</span>
                </div>
              </div>

              {/* Privacy Transparency Box */}
              <div className="p-4 rounded-2xl bg-neutral-50/90 border border-neutral-200/80 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-neutral-800">
                  <Lock className="w-3.5 h-3.5 text-neutral-600" />
                  <span>How Your Feedback is Handled</span>
                </div>
                <ul className="space-y-1.5 text-neutral-600 text-[11px] list-disc list-inside">
                  <li>
                    {HAPPINESS_PRIVACY_DISCLOSURE.points[0]}
                  </li>
                  <li>
                    {HAPPINESS_PRIVACY_DISCLOSURE.points[1]}
                  </li>
                  <li>
                    {HAPPINESS_PRIVACY_DISCLOSURE.points[2]}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* STATE 3: SUCCESS STATE */}
          {isSuccess && (
            <div className="py-8 px-2 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-neutral-900 font-heading">
                  Thank you for checking in!
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                  Your feedback helps us understand and improve the student experience across Apex University.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-left max-w-sm mx-auto space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Questions Completed:</span>
                  <span className="font-semibold text-neutral-900">
                    {answeredCount} of {totalQuestions}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Reporting Period:</span>
                  <span className="font-semibold text-neutral-900">Active Week</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Privacy Protection:</span>
                  <span className="font-semibold text-emerald-700">Combined in Aggregate</span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                Next weekly pulse check-in will be open in 7 days.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between gap-3">
          {!isSuccess ? (
            <>
              <div>
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmittingPulse}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {isQuestionStep && !currentAnswer && (
                  <button
                    type="button"
                    onClick={handleSkipQuestion}
                    disabled={isSubmittingPulse}
                    className="px-3.5 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                  >
                    Skip Question
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmittingPulse}
                  className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPulse ? (
                    <span>Submitting...</span>
                  ) : isReflectionStep ? (
                    <>
                      <span>Submit Check-in</span>
                      <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                    </>
                  ) : (
                    <>
                      <span>{currentAnswer ? "Next" : "Next"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
