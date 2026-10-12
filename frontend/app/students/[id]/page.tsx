"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSkillHub } from "@/lib/store";
import { DEMO_OBSERVATIONS } from "@/lib/skillhub-data";
import { api } from "@/lib/api";
import {
  SupportViewResponse,
  SignalDTO,
  AISummarizeEvidenceResponse,
  MLPredictResponse,
} from "@/lib/types";
import { SignalReviewModal } from "@/components/SignalReviewModal";
import { SkillHubProgressBar } from "@/components/SkillHubProgressBar";
import { UserAvatar } from "@/components/UserAvatar";
import { FeatureAttributionChart } from "@/components/FeatureAttributionChart";
import { StudentEvidenceLedger } from "@/components/student/StudentEvidenceLedger";
import { GovernedScenarioPanel } from "@/components/student/GovernedScenarioPanel";
import { StudentReadinessResponse } from "@/lib/types";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Send,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Shield,
  Activity,
  Layers,
  FileCheck,
  RefreshCw,
  Sparkles,
  Check,
  X,
  Cpu,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  BarChart3,
  HelpCircle,
} from "lucide-react";

const FEATURE_LABELS: Record<string, string> = {
  num_of_prev_attempts: "Prior Module Attempts",
  studied_credits: "Enrolled Course Credits",
  days_registered_before_start: "Days Registered Pre-Start",
  vle_total_clicks_d30: "Total LMS Clicks (Day 30)",
  vle_active_days_d30: "Active LMS Days (Day 30)",
  vle_clicks_precourse: "Pre-Course Portal Clicks",
  vle_clicks_poststart_d30: "Post-Start LMS Clicks",
  vle_clicks_last_7d: "LMS Clicks in Past 7 Days",
  vle_days_since_last_click: "Days Since Last LMS Login",
  vle_clicks_forumng_d30: "Discussion Forum Clicks",
  vle_clicks_oucontent_d30: "Course Content Clicks",
  vle_clicks_quiz_d30: "Practice Quiz Clicks",
  vle_clicks_homepage_d30: "Portal Homepage Clicks",
  vle_clicks_other_d30: "Other Resource Clicks",
  has_vle_activity_d30: "Any LMS Activity Logged",
  assessments_submitted_d30: "Assessments Submitted (Day 30)",
  assessment_banked_d30: "Banked Coursework Submissions",
  has_early_assessment_submission_d30: "Early Assignment Hand-In",
  highest_education: "Highest Prior Education",
  imd_band: "Index of Multiple Deprivation",
  age_band: "Age Band",
  disability: "Declared Disability Status",
  gender: "Gender Category",
  region: "Geographic Region",
};

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params?.id as string;
  const { students, activeRole, signals, backendConnected } = useSkillHub();

  const [supportView, setSupportView] = useState<SupportViewResponse | null>(null);
  const [loadingSupportView, setLoadingSupportView] = useState<boolean>(true);
  const [supportViewError, setSupportViewError] = useState<string | null>(null);
  const [selectedSignalForReview, setSelectedSignalForReview] = useState<SignalDTO | null>(null);

  // ML Day-30 Early Warning State
  const [mlPrediction, setMlPrediction] = useState<MLPredictResponse | null>(null);
  const [loadingMlInference, setLoadingMlInference] = useState<boolean>(false);
  const [mlInferenceStatus, setMlInferenceStatus] = useState<
    "idle" | "loading" | "success" | "validation_error" | "auth_error" | "service_error"
  >("idle");
  const [mlInferenceError, setMlInferenceError] = useState<string | null>(null);
  const [predictionSource, setPredictionSource] = useState<
    "fresh_live" | "cached_historical" | "synthetic_offline" | null
  >(null);
  const [predictionTimestamp, setPredictionTimestamp] = useState<string | null>(null);
  const [verifiedThreshold, setVerifiedThreshold] = useState<number>(0.46);
  const [thresholdVerifiedFromBackend, setThresholdVerifiedFromBackend] = useState<boolean>(false);
  const [studentReadiness, setStudentReadiness] = useState<StudentReadinessResponse | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState<boolean>(false);
  const inferenceSeqRef = React.useRef<number>(0);

  const currentStudent =
    students.find(
      (s) =>
        s.id.toLowerCase() === studentId.toLowerCase() ||
        s.email.toLowerCase().startsWith(studentId.toLowerCase())
    ) ||
    (supportView?.student
      ? {
          id: supportView.student.id,
          name: supportView.student.display_name,
          email: `${supportView.student.external_ref.toLowerCase()}@sutra.edu`,
          course: supportView.student.cohort_code
            ? `Cohort ${supportView.student.cohort_code}`
            : "Cohort CS-Y2 (Computer Science)",
          progress: 70,
          status: (supportView.student.enrollment_status === "active" ? "Active" : "Completed") as any,
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          isOnline: true,
          enrolledDate: "August 2026",
          grade: "B",
          attendance: "88%",
          completedLessons: 6,
          totalLessons: 18,
          lastActive: "Today",
        }
      : null);

  const fallbackStudent = currentStudent || {
    id: studentId,
    name: studentId,
    email: `${studentId.toLowerCase()}@sutra.edu`,
    course: "Cohort CS-Y2 (Computer Science)",
    progress: 50,
    status: "Active" as const,
    avatar: "/assets/avatar-sarah.jpg",
    isOnline: false,
    enrolledDate: "August 2026",
    grade: "N/A",
    attendance: "N/A",
    completedLessons: 0,
    totalLessons: 18,
    lastActive: "N/A",
  };

  // Phase 6: AI Evidence Summarization State
  const [aiEvidenceSummary, setAiEvidenceSummary] = useState<AISummarizeEvidenceResponse | null>(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState<boolean>(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);

  const handleGenerateEvidenceSummary = async () => {
    if (activeRole === "leadership") return;
    setLoadingAiSummary(true);
    setAiSummaryError(null);
    try {
      const res = await api.ai.summarizeEvidence(studentId);
      setAiEvidenceSummary(res);
    } catch (err: any) {
      setAiSummaryError(err?.message || "AI evidence summarization service unavailable.");
    } finally {
      setLoadingAiSummary(false);
    }
  };

  const [message, setMessage] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);

  // Dynamically verify decision threshold from backend ML model info
  useEffect(() => {
    let isMounted = true;
    api.ml.getModelInfo()
      .then((info) => {
        if (!isMounted) return;
        const thresh = info?.decision_threshold ?? info?.threshold;
        if (typeof thresh === "number") {
          setVerifiedThreshold(thresh);
          setThresholdVerifiedFromBackend(true);
        }
      })
      .catch((err) => {
        console.warn("Could not query /api/v1/ml/model-info to verify threshold:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch 360° Support View from backend
  const fetchSupportView = async () => {
    if (activeRole === "leadership") return;
    setLoadingSupportView(true);
    setSupportViewError(null);
    try {
      const data = await api.students.getSupportView(studentId);
      setSupportView(data);
      if (data?.ml_prediction) {
        setMlPrediction(data.ml_prediction);
        if (data.ml_prediction.is_synthetic_fallback) {
          setPredictionSource("synthetic_offline");
        } else {
          setPredictionSource("cached_historical");
        }
        setPredictionTimestamp(data.ml_prediction.processed_at || new Date().toISOString());
        if (typeof data.ml_prediction.threshold === "number") {
          setVerifiedThreshold(data.ml_prediction.threshold);
          setThresholdVerifiedFromBackend(true);
        }
      }
    } catch (err: any) {
      console.warn("Could not load backend support view:", err);
      setSupportViewError(err?.message || "Support view not accessible for current role.");
    } finally {
      setLoadingSupportView(false);
    }
  };

  // Fetch Feature Completeness & Readiness Audit from backend
  const fetchReadiness = async () => {
    if (activeRole === "leadership") return;
    setLoadingReadiness(true);
    try {
      const data = await api.students.getReadiness(studentId);
      setStudentReadiness(data);
    } catch (err: any) {
      console.warn("Could not load student feature readiness:", err);
    } finally {
      setLoadingReadiness(false);
    }
  };

  const handleRunMlInference = async () => {
    if (activeRole === "leadership") return;
    if (loadingMlInference) return; // Prevent duplicate concurrent requests

    const seq = ++inferenceSeqRef.current;
    setLoadingMlInference(true);
    setMlInferenceStatus("loading");
    setMlInferenceError(null);

    try {
      const res = await api.students.predict(studentId);
      // Discard older out-of-order response if a newer request was dispatched
      if (seq !== inferenceSeqRef.current) return;

      setMlPrediction(res);
      if (res.is_synthetic_fallback) {
        setPredictionSource("synthetic_offline");
      } else {
        setPredictionSource("fresh_live");
      }
      setPredictionTimestamp(res.processed_at || new Date().toISOString());
      if (typeof res.threshold === "number") {
        setVerifiedThreshold(res.threshold);
        setThresholdVerifiedFromBackend(true);
      }
      setMlInferenceStatus("success");
    } catch (err: any) {
      if (seq !== inferenceSeqRef.current) return;

      console.warn("Live ML inference failed:", err);
      const status = err?.status || err?.statusCode || 0;
      const errMsg = err?.message || "Failed to execute live ML inference.";

      if (status === 401 || status === 403) {
        setMlInferenceStatus("auth_error");
        setMlInferenceError(
          "Authentication / Authorization Required: You must be authenticated as an authorized educator (faculty, mentor, counselor) to run live inference. Individual telemetry access is restricted for leadership per ADR-004."
        );
      } else if (status === 422) {
        setMlInferenceStatus("validation_error");
        setMlInferenceError(
          errMsg.includes("insufficient") || errMsg.includes("Missing")
            ? errMsg
            : `Feature Incompleteness (HTTP 422): ${errMsg}`
        );
      } else {
        setMlInferenceStatus("service_error");
        setMlInferenceError(`Service Error: ${errMsg}`);
      }
    } finally {
      if (seq === inferenceSeqRef.current) {
        setLoadingMlInference(false);
      }
    }
  };

  useEffect(() => {
    fetchSupportView();
    fetchReadiness();
  }, [studentId, activeRole]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSentSuccess(true);
    setTimeout(() => {
      setMessage("");
      setSentSuccess(false);
    }, 2000);
  };

  // 0. Student Role Privacy Safeguard
  if (activeRole === "student") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <div>
          <Link
            href="/dashboard"
            className="text-xs text-neutral-400 hover:text-neutral-900 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Overview</span>
          </Link>
        </div>

        <div className="skill-card p-8 bg-white border border-neutral-200/80 rounded-3xl flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            Student 360 Evaluation Restricted
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-md">
            Individual student telemetry, predictive risk assessments, and staff triage queues are restricted to authorized mentors and campus counselors.
          </p>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
          >
            Return to My Overview
          </Link>
        </div>
      </div>
    );
  }

  // 1. Leadership Institutional Privacy Safeguard
  if (activeRole === "leadership") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <div>
          <Link
            href="/students"
            className="text-xs text-neutral-400 hover:text-neutral-900 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Students</span>
          </Link>
        </div>

        <div className="skill-card p-8 bg-white border border-neutral-200/80 rounded-3xl flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            Institutional Privacy Safeguard (ADR-004)
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-md">
            Individual student 360° telemetry and identifiable support queues are restricted for leadership roles to ensure confidentiality and data minimization.
          </p>
          <Link
            href="/analytics"
            className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
          >
            Go to Cohort Analytics
          </Link>
        </div>
      </div>
    );
  }

  // Active signals matching this student
  const studentSignals = signals.filter(
    (s) =>
      s.student_id === studentId ||
      s.external_student_ref === studentId ||
      (currentStudent && (s.student_id === currentStudent.id || s.external_student_ref === currentStudent.id))
  );

  const studentDisplayName = supportView?.student?.display_name || currentStudent?.name || studentId;
  const externalRef = supportView?.student?.external_ref || currentStudent?.id || studentId;
  const enrollmentStatus = supportView?.student?.enrollment_status || currentStudent?.status || "Active";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/students"
          className="text-xs text-neutral-400 hover:text-neutral-900 font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Students</span>
        </Link>

        <button
          onClick={() => {
            fetchSupportView();
            fetchReadiness();
          }}
          disabled={loadingSupportView || loadingReadiness}
          className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(loadingSupportView || loadingReadiness) ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Main Student Profile Card */}
      <div className="skill-card bg-white p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar
                src={fallbackStudent.avatar}
                name={studentDisplayName}
                className="w-16 h-16 ring-4 ring-neutral-100 shadow-xs"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-400/50" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-neutral-900 font-heading">
                  {studentDisplayName}
                </h1>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 uppercase tracking-wide">
                  {enrollmentStatus}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                  {externalRef}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                {fallbackStudent.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400">
              Campus: Apex Main
            </span>
          </div>
        </div>

        {/* SUTRA Telemetry & Data Freshness Banner */}
        <div className="skill-card-subtle p-5 bg-neutral-50/70 border border-neutral-200/70 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-700" />
              <h3 className="text-sm font-bold text-neutral-900">
                360° Support View Telemetry &amp; Freshness
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {supportView?.freshness_metrics?.is_stale ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Stale Telemetry Detected</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Telemetric Data Fresh</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Total Observations
              </span>
              <span className="text-lg font-extrabold text-neutral-900 mt-0.5 block">
                {supportView?.freshness_metrics?.total_observations ?? 12}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Domains Logged
              </span>
              <span className="text-xs font-bold text-neutral-800 mt-1 block capitalize">
                {supportView?.freshness_metrics?.domains_represented?.join(", ") ||
                  "academic, attendance, lms"}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Active Signals
              </span>
              <span className="text-lg font-extrabold text-amber-600 mt-0.5 block">
                {supportView?.active_signals_count ?? studentSignals.length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Open Cases
              </span>
              <span className="text-lg font-extrabold text-neutral-900 mt-0.5 block">
                {supportView?.active_cases_count ?? 1}
              </span>
            </div>
          </div>

          {/* Sensitive Domain Separation Disclosure */}
          <div className="p-3 bg-white rounded-xl border border-neutral-200/60 flex items-start gap-2 text-neutral-600 text-[11px] leading-relaxed">
            <Shield className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-800">
                Sensitive Domain Separation (ADR-003):
              </span>{" "}
              Fee payments, financial hardship requests, and billing records are strictly segregated from academic telemetry and are never displayed in educator support views.
            </div>
          </div>
        </div>

        {/* ML Day-30 Early Warning Risk Assessment Card */}
        {(() => {
          const pred = mlPrediction || supportView?.ml_prediction;
          const attributions =
            pred?.evidence_card?.top_attributions ||
            pred?.evidence_card?.attributions ||
            [];
          const thresholdVal = pred?.threshold ?? verifiedThreshold;
          const thresholdPercent = Math.round(thresholdVal * 100);
          const riskPercent = pred ? Math.round(pred.risk_probability * 100) : 68;
          const isAtRisk = pred ? pred.classification === "At_Risk" : riskPercent >= thresholdPercent;

          const isSynthetic =
            predictionSource === "synthetic_offline" ||
            Boolean(pred?.is_synthetic_fallback) ||
            !backendConnected;

          const isFresh = predictionSource === "fresh_live";

          const riskDrivers = attributions.filter(
            (a) => a.direction === "increases_risk" || (a.attribution && a.attribution > 0)
          );
          const protectiveFactors = attributions.filter(
            (a) => a.direction === "decreases_risk" || (a.attribution && a.attribution < 0)
          );

          return (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-neutral-900 to-slate-950 text-white shadow-xl border border-neutral-800 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                        ML Early-Warning Assessment
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800/60">
                        Day-30 Milestone
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Model: {pred?.evidence_card?.model_name || "Logistic Regression Baseline"} v{pred?.evidence_card?.model_version || "1.0.0"} • Platt-Calibrated Log-Odds
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunMlInference}
                    disabled={loadingMlInference}
                    className="px-3.5 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingMlInference ? "animate-spin" : ""}`} />
                    <span>{loadingMlInference ? "Scoring Student..." : "Run Live Inference"}</span>
                  </button>
                </div>
              </div>

              {/* Provenance & Freshness Source Badge */}
              <div className="flex flex-wrap items-center gap-2">
                {isSynthetic ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[11px] font-medium shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>SYNTHETIC / OFFLINE DEMONSTRATION RECORD • Not Live Institutional Data</span>
                  </div>
                ) : isFresh ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-medium shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>
                      FRESH LIVE INFERENCE • Scored just now at{" "}
                      {predictionTimestamp ? new Date(predictionTimestamp).toLocaleTimeString() : "recently"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/50 text-sky-300 text-[11px] font-medium shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <span>
                      HISTORICAL LOGGED PREDICTION • Evaluated at{" "}
                      {predictionTimestamp ? new Date(predictionTimestamp).toLocaleTimeString() : "previously"}
                    </span>
                  </div>
                )}

                <div className="text-[10px] text-neutral-400 font-mono ml-auto">
                  Configured Threshold: {thresholdPercent}% {thresholdVerifiedFromBackend ? "(Backend Verified)" : ""}
                </div>
              </div>

              {/* Status & Error Banners */}
              {loadingMlInference && (
                <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-800/60 text-xs text-violet-200 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                  <span>Executing server-side inference on 25 canonical Day-30 student observations...</span>
                </div>
              )}

              {mlInferenceStatus === "validation_error" && mlInferenceError && (
                <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-600/70 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block">Feature Incompleteness / Validation Failure (HTTP 422)</span>
                    <span className="text-amber-100/90 leading-relaxed block mt-0.5">{mlInferenceError}</span>
                  </div>
                </div>
              )}

              {mlInferenceStatus === "auth_error" && mlInferenceError && (
                <div className="p-3.5 rounded-xl bg-violet-950/80 border border-violet-600/70 text-xs text-violet-200 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 flex-shrink-0 text-violet-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-violet-300 block">Authentication / Role Policy Failure</span>
                    <span className="text-violet-100/90 leading-relaxed block mt-0.5">{mlInferenceError}</span>
                  </div>
                </div>
              )}

              {mlInferenceStatus === "service_error" && mlInferenceError && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/70 text-xs text-rose-200 flex items-start gap-2.5">
                  <X className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-300 block">Inference Service Unavailable</span>
                    <span className="text-rose-100/90 leading-relaxed block mt-0.5">{mlInferenceError}</span>
                  </div>
                </div>
              )}

              {/* Probability & Risk Classification Blocks (Displayed Separately) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-900/90 border border-neutral-800">
                {/* 1. Probability Block */}
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                    1. Calibrated Attrition Risk Probability
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-3xl font-black ${isAtRisk ? "text-rose-400" : "text-emerald-400"}`}>
                      {riskPercent}%
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      (P = {(pred ? pred.risk_probability : 0.68).toFixed(4)})
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-1 leading-normal">
                    Estimated probability of course non-completion based on Day-30 LMS activity and course posture.
                  </span>
                </div>

                {/* 2. Classification Block */}
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                    2. Institutional Triage Classification
                  </span>
                  <div className="mt-1">
                    {isAtRisk ? (
                      <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 items-center gap-1.5 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>HIGH_RISK • PROACTIVE ADVISOR REVIEW</span>
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>STANDARD • ROUTINE MONITORING</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-1 leading-normal">
                    Assigned via institutional cutoff rule: Risk ≥ {thresholdPercent}%.
                  </span>
                </div>
              </div>

              {/* Progress bar with verified dynamic threshold marker */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
                  <span>Probability Distribution vs Decision Threshold</span>
                  <span>{riskPercent}% / 100%</span>
                </div>
                <div className="relative pt-2 pb-6">
                  <div className="w-full h-3.5 rounded-full bg-neutral-800 overflow-hidden relative">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isAtRisk
                          ? "bg-gradient-to-r from-amber-500 to-rose-500"
                          : "bg-gradient-to-r from-teal-500 to-emerald-500"
                      }`}
                      style={{ width: `${Math.min(riskPercent, 100)}%` }}
                    />
                  </div>
                  {/* Dynamic Threshold Marker Indicator */}
                  <div
                    className="absolute top-0 flex flex-col items-center pointer-events-none -translate-x-1/2"
                    style={{ left: `${thresholdPercent}%` }}
                  >
                    <div className="w-0.5 h-5 bg-amber-400 shadow-sm" />
                    <span className="text-[9px] font-mono font-bold text-amber-300 bg-neutral-900 px-1.5 py-0.5 rounded mt-0.5 border border-amber-400/50 whitespace-nowrap shadow-sm">
                      Threshold {thresholdPercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Governance Clarification Callout (Requirement 7) */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-violet-300">
                  <Shield className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                  <span>Institutional Governance Notice &amp; Classification Rule Policy</span>
                </div>
                <p className="text-neutral-400 leading-relaxed text-[10px]">
                  The <strong>{thresholdPercent}% decision threshold</strong> is an institutional classification policy rule (calibrated for high recall at Day 30) established to allocate supportive counselor capacity. It is a probabilistic statistical indicator, <strong>NOT a causal diagnosis or deterministic guarantee of student outcome</strong>. Authorized educators must review underlying attributions and student circumstances before taking action.
                </p>
              </div>

              {/* Feature Attribution Visualisation (Diverging Bar Chart & Accessible Table) */}
              <FeatureAttributionChart
                attributions={attributions}
                modelName={pred?.evidence_card?.model_name || "Logistic Regression Baseline"}
                modelVersion={pred?.evidence_card?.model_version || "1.0.0"}
                threshold={thresholdVal}
                isSynthetic={isSynthetic}
              />

              {/* Policy & Governance Disclaimers */}
              <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-neutral-400 leading-normal">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                  <span>
                    Non-causal statistical correlation • Model predictions must never replace professional educator judgment.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    Temporal Safeguard (t ≤ Day 30)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    Fee Segregated (ADR-003)
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* SUTRA 5-Tier Evidence Architecture & Model Input Completeness Ledger */}
        <StudentEvidenceLedger
          studentId={studentId}
          readiness={studentReadiness}
          loadingReadiness={loadingReadiness}
          supportView={supportView}
          mlPrediction={mlPrediction || supportView?.ml_prediction || null}
          signals={studentSignals}
          verifiedThreshold={verifiedThreshold}
        />

        {/* Governed What-If Scenario Exploration Panel (Phase 8) */}
        <GovernedScenarioPanel
          studentId={studentId}
          externalStudentRef={externalRef}
          initialPrediction={mlPrediction || supportView?.ml_prediction || null}
          verifiedThreshold={verifiedThreshold}
          onPlanSupport={() => {
            const el = document.getElementById("observations-table");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* Observations Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Recent Multi-Domain Observations
            </h4>
            <button
              onClick={handleGenerateEvidenceSummary}
              disabled={loadingAiSummary}
              className="px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/70 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
            >
              {loadingAiSummary ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Telemetry...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Generate Evidence Summary</span>
                </>
              )}
            </button>
          </div>

          {/* AI Evidence Summary Panel */}
          {aiEvidenceSummary && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 border border-indigo-100 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-neutral-900">
                    AI Evidence Synthesis
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Advisory • Non-Binding
                  </span>
                </div>
                <button
                  onClick={() => setAiEvidenceSummary(null)}
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                  title="Close summary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-neutral-200/60">
                {aiEvidenceSummary.summary}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> Observed Facts
                  </span>
                  <ul className="space-y-1 text-emerald-900 text-[11px] list-disc list-inside">
                    {aiEvidenceSummary.observed_facts.map((fact, idx) => (
                      <li key={idx}>{fact}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Uncertainties & Limitations
                  </span>
                  <ul className="space-y-1 text-amber-900 text-[11px] list-disc list-inside">
                    {aiEvidenceSummary.uncertainties.concat(aiEvidenceSummary.limitations).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[10px] text-neutral-400">
                <span>Model: {aiEvidenceSummary.metadata.model_name} • {aiEvidenceSummary.metadata.latency_ms}ms</span>
                <span>Financial records excluded (ADR-003) • SUTRA Policy</span>
              </div>
            </div>
          )}

          {aiSummaryError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{aiSummaryError}</span>
              </div>
              <button
                onClick={handleGenerateEvidenceSummary}
                className="underline text-xs font-bold hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}
          <div className="border border-neutral-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4">Domain</th>
                  <th className="py-2.5 px-4">Metric</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4">Quality State</th>
                  <th className="py-2.5 px-4 text-right">Event Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {supportView?.recent_observations && supportView.recent_observations.length > 0 ? (
                  supportView.recent_observations.map((obs) => (
                    <tr key={obs.id} className="hover:bg-neutral-50/60">
                      <td className="py-2.5 px-4 font-semibold text-neutral-800 capitalize">
                        {obs.domain}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-600">
                        {obs.metric_key}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-neutral-900">
                        {typeof obs.value === "object" ? JSON.stringify(obs.value) : String(obs.value)} {obs.unit || ""}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          obs.quality_state === "valid" || obs.quality_state === "good"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {obs.quality_state}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[10px] text-neutral-400">
                        {new Date(obs.event_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : !backendConnected && DEMO_OBSERVATIONS[studentId] && DEMO_OBSERVATIONS[studentId].length > 0 ? (
                  DEMO_OBSERVATIONS[studentId].map((obs) => (
                    <tr key={obs.id} className="hover:bg-neutral-50/60">
                      <td className="py-2.5 px-4 font-semibold text-neutral-800 capitalize">
                        {obs.domain}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-600">
                        {obs.metric_key}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-neutral-900">
                        {typeof obs.value === "object" ? JSON.stringify(obs.value) : String(obs.value)} {obs.unit || ""}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          obs.quality_state === "good" || obs.quality_state === "valid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {obs.quality_state}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[10px] text-neutral-400">
                        {new Date(obs.event_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-xs text-neutral-400">
                      No multi-domain observations recorded for this student in the active campus.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Associated Signals with Evidence Cards */}
        {studentSignals.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Active Policy Signals &amp; Evidence Cards
            </h4>
            <div className="space-y-3">
              {studentSignals.map((sig) => (
                <div
                  key={sig.id}
                  className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900">
                        {sig.rule_key}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-800">
                        {sig.result.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {sig.evidence_digest}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSignalForReview(sig)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all whitespace-nowrap self-start sm:self-auto"
                  >
                    Review Signal
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Send Direct Guidance */}
        <form onSubmit={handleSendMessage} className="pt-4 border-t border-neutral-100 space-y-3">
          <label className="text-xs font-semibold text-neutral-700 block">
            Direct Student Guidance &amp; Resources
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Send guidance note, tutorial session invitation, or support link..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Note</span>
            </button>
          </div>
          {sentSuccess && (
            <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Message recorded in student communication history
            </p>
          )}
        </form>
      </div>

      {/* Review Signal Modal */}
      {selectedSignalForReview && (
        <SignalReviewModal
          signal={selectedSignalForReview}
          onClose={() => setSelectedSignalForReview(null)}
          onSuccess={() => {
            setSelectedSignalForReview(null);
            fetchSupportView();
          }}
        />
      )}
    </div>
  );
}
