"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RotateCcw,
  BookOpen,
  Target,
  Heart,
  Users,
  Compass,
  HelpCircle,
} from "lucide-react";
import { StudentGuidanceAssessmentModal } from "@/components/assessment/StudentGuidanceAssessmentModal";
import { GuidanceReportView } from "@/components/assessment/GuidanceReportView";
import { AssessmentReportResult } from "@/components/assessment/assessmentScoring";
import { ASSESSMENT_DIMENSIONS } from "@/components/assessment/assessmentData";
import { RequestCounselorCallModal } from "@/components/RequestCounselorCallModal";

const STORAGE_KEY = "sutra_guidance_assessment_report";

const DIMENSION_ICONS: Record<string, React.ReactNode> = {
  learning_approach: <BookOpen className="w-4 h-4 text-emerald-600" />,
  motivation_engagement: <Target className="w-4 h-4 text-blue-600" />,
  confidence_self_efficacy: <Sparkles className="w-4 h-4 text-purple-600" />,
  planning_time_management: <Clock className="w-4 h-4 text-amber-600" />,
  coping_support: <Heart className="w-4 h-4 text-rose-500" />,
  aspirations_career: <Compass className="w-4 h-4 text-teal-600" />,
};

export default function AssessmentPage() {
  const { user, currentPersona, cases } = useSkillHub();
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [assessmentReport, setAssessmentReport] = useState<AssessmentReportResult | null>(null);

  const studentId = currentPersona?.userId || "SYN-1007";
  const studentCases = cases.filter(
    (c) => c.student_id === studentId || c.external_student_ref === studentId
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray(parsed.dimensions) &&
          typeof parsed.answeredQuestionsCount === "number"
        ) {
          setAssessmentReport(parsed);
        } else {
          console.warn("Corrupted or incompatible assessment report in localStorage; clearing.");
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn("Could not read assessment report from localStorage:", e);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, []);

  const handleSaveReport = (report: AssessmentReportResult | null) => {
    setAssessmentReport(report);
    try {
      if (report) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Could not save assessment report to localStorage:", e);
    }
  };

  const handleRetake = () => {
    handleSaveReport(null);
    setIsAssessmentModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>

        {assessmentReport && (
          <button
            type="button"
            onClick={handleRetake}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Assessment</span>
          </button>
        )}
      </div>

      {assessmentReport ? (
        /* Completed Report View */
        <div className="skill-card bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-6">
          <GuidanceReportView
            report={assessmentReport}
            onRetake={handleRetake}
            onClose={() => {}}
            onRequestCounselorCall={() => setIsCallModalOpen(true)}
          />
        </div>
      ) : (
        /* Overview & Start Assessment Flow */
        <div className="space-y-6">
          <div className="skill-card bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-3 bg-neutral-900 text-white rounded-2xl shrink-0">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight font-heading">
                    Student Guidance Assessment
                  </h1>
                  <p className="text-xs text-neutral-500 mt-1">
                    18 questions · Approximately 3–4 minutes · Confidential self-reflection
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAssessmentModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Start Assessment</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Reflect on your learning habits, goals, and support needs to prepare for a counseling conversation.
              This assessment helps identify where you feel confident and where additional faculty mentorship or campus
              resources could be most beneficial.
            </p>

            {/* Assessment Dimensions Preview */}
            <div className="pt-2 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                What this assessment covers
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ASSESSMENT_DIMENSIONS.map((dim) => (
                  <div
                    key={dim.key}
                    className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-lg border border-neutral-200/60 shadow-2xs">
                        {DIMENSION_ICONS[dim.key] || <Target className="w-4 h-4 text-neutral-600" />}
                      </div>
                      <h3 className="text-xs font-semibold text-neutral-900">
                        {dim.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      {dim.shortDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidentiality & Ethics Notice */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-3 text-xs text-neutral-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-neutral-800">
                  Private &amp; Non-Evaluative
                </span>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Your responses are for reflective preparation with your mentor or counselor. No composite score,
                  clinical diagnosis, or automated academic ranking is generated.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Interactive Modal */}
      <StudentGuidanceAssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        savedReport={assessmentReport}
        onSaveReport={handleSaveReport}
        onRequestCounselorCall={() => {
          setIsAssessmentModalOpen(false);
          setIsCallModalOpen(true);
        }}
      />

      {/* Counselor Call Modal */}
      <RequestCounselorCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        studentId={studentId}
        studentName={user.fullName || user.name || "Asha"}
        caseId={studentCases[0]?.id || "CASE-SYN-1007"}
        signalId="SIG-SYN-1007"
        riskScore={0.68}
      />
    </div>
  );
}
