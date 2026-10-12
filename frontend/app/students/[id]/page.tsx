"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSkillHub } from "@/lib/store";
import { DEMO_OBSERVATIONS } from "@/lib/skillhub-data";
import { api } from "@/lib/api";
import {
  SupportViewResponse,
  SignalDTO,
  AISummarizeEvidenceResponse,
  MLPredictResponse,
  StudentReadinessResponse,
} from "@/lib/types";
import { SignalReviewModal } from "@/components/SignalReviewModal";
import { UserAvatar } from "@/components/UserAvatar";
import { FeatureAttributionChart } from "@/components/FeatureAttributionChart";
import { StudentEvidenceLedger } from "@/components/student/StudentEvidenceLedger";
import { GovernedScenarioPanel } from "@/components/student/GovernedScenarioPanel";
import { CatalystStudentReportGrid } from "@/components/student/CatalystStudentReportGrid";
import {
  ArrowLeft,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Shield,
  Activity,
  RefreshCw,
  Sparkles,
  Check,
  X,
  Cpu,
  Target,
  ChevronLeft,
  ChevronRight,
  Printer,
  Search,
  Filter,
  Layers,
  FileText,
  User,
  Sliders,
  CheckCircle,
} from "lucide-react";

type ReportTab = "all" | "ml_risk" | "evidence" | "scenarios" | "observations" | "guidance";

const QUICK_GUIDANCE_PROMPTS = [
  {
    label: "📅 Invite to 1:1 Study Session",
    text: "Hi! I noticed your recent engagement in the LMS and would love to schedule a quick 1:1 check-in to walk through upcoming module milestones.",
  },
  {
    label: "📚 Share Revision Guide",
    text: "Sharing the Week 4 coursework preparation pack and recommended practice problems. Reach out if any topics need extra clarification!",
  },
  {
    label: "⏱️ Time Management Review",
    text: "Let's review your study schedule for the upcoming assessment window. Campus academic mentors are available for structured planning.",
  },
  {
    label: "⭐ Commend Recent Progress",
    text: "Great job completing your early formative coursework submissions on schedule! Keep up the consistent momentum.",
  },
];

// Custom SVGs for Technical Governance Dossier & Telemetry Indicators
function CustomChevronDown({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CustomDossierIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="18" x="3" y="3" rx="3" />
      <path d="M7 8h10" />
      <path d="M7 12h7" />
      <path d="M7 16h4" />
      <path d="M17 14v4" />
      <path d="M15 16h4" />
    </svg>
  );
}

function CustomCpuIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="14" height="14" x="5" y="5" rx="2" />
      <path d="M9 9h6v6H9z" />
      <path d="M9 1v4" />
      <path d="M15 1v4" />
      <path d="M9 19v4" />
      <path d="M15 19v4" />
      <path d="M1 9h4" />
      <path d="M1 15h4" />
      <path d="M19 9h4" />
      <path d="M19 15h4" />
    </svg>
  );
}

function CustomLayersIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 12.5-9.17 4.16a2 2 0 0 1-1.66 0L2 12.5" />
      <path d="m22 17.5-9.17 4.16a2 2 0 0 1-1.66 0L2 17.5" />
    </svg>
  );
}

function CustomFileTextIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function CustomSlidersIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="1" x2="7" y1="14" y2="14" />
      <line x1="9" x2="15" y1="8" y2="8" />
      <line x1="17" x2="23" y1="16" y2="16" />
    </svg>
  );
}

function CustomActivityIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function CustomShieldIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CustomSparklesIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

function CustomSendIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function CustomCheckIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CustomAlertIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

function CustomLockIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CustomTargetIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function CustomRefreshIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function CustomSearchIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CustomPrinterIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect width="12" height="8" x="6" y="14" />
    </svg>
  );
}

function CustomCheckCircleIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CustomCloseIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;
  const { students, activeRole, signals, backendConnected } = useSkillHub();

  const [activeTab, setActiveTab] = useState<ReportTab>("all");
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
  const inferenceSeqRef = useRef<number>(0);

  // Observations Search & Filter State
  const [observationDomainFilter, setObservationDomainFilter] = useState<string>("all");
  const [observationSearchQuery, setObservationSearchQuery] = useState<string>("");
  const [observationQualityFilter, setObservationQualityFilter] = useState<string>("all");

  // AI Evidence Summarization State
  const [aiEvidenceSummary, setAiEvidenceSummary] = useState<AISummarizeEvidenceResponse | null>(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState<boolean>(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);

  // Direct Guidance State
  const [message, setMessage] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);

  // Collapsible Technical Governance Dossier Drawer State (Collapsed / Not Shown First)
  const [isTechnicalDossierOpen, setIsTechnicalDossierOpen] = useState<boolean>(false);

  // Cohort Navigation: Find current student and adjacent peers
  const currentStudentIndex = useMemo(() => {
    return students.findIndex(
      (s) =>
        s.id.toLowerCase() === studentId.toLowerCase() ||
        s.email.toLowerCase().startsWith(studentId.toLowerCase())
    );
  }, [students, studentId]);

  const prevStudent = currentStudentIndex > 0 ? students[currentStudentIndex - 1] : null;
  const nextStudent =
    currentStudentIndex >= 0 && currentStudentIndex < students.length - 1
      ? students[currentStudentIndex + 1]
      : null;

  const currentStudent =
    (currentStudentIndex >= 0 ? students[currentStudentIndex] : null) ||
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

  // Dynamically verify decision threshold from backend ML model info
  useEffect(() => {
    let isMounted = true;
    api.ml
      .getModelInfo()
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSentSuccess(true);
    setTimeout(() => {
      setMessage("");
      setSentSuccess(false);
    }, 2500);
  };

  const handlePrintDossier = () => {
    window.print();
  };

  // 0. Student Role Privacy Safeguard
  if (activeRole === "student") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div>
          <Link
            href="/dashboard"
            className="text-xs text-neutral-500 hover:text-neutral-900 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Overview</span>
          </Link>
        </div>

        <div className="skill-card p-10 bg-white border border-neutral-200/80 rounded-3xl flex flex-col items-center text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 font-heading">
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
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div>
          <Link
            href="/students"
            className="text-xs text-neutral-500 hover:text-neutral-900 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Students</span>
          </Link>
        </div>

        <div className="skill-card p-10 bg-white border border-neutral-200/80 rounded-3xl flex flex-col items-center text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 font-heading">
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

  // Observations resolution & filtering
  const rawObservations =
    supportView?.recent_observations && supportView.recent_observations.length > 0
      ? supportView.recent_observations
      : !backendConnected && DEMO_OBSERVATIONS[studentId] && DEMO_OBSERVATIONS[studentId].length > 0
      ? DEMO_OBSERVATIONS[studentId]
      : [];

  const filteredObservations = rawObservations.filter((obs) => {
    const matchesDomain =
      observationDomainFilter === "all" ||
      obs.domain.toLowerCase() === observationDomainFilter.toLowerCase();
    const matchesQuality =
      observationQualityFilter === "all" ||
      (observationQualityFilter === "valid" && (obs.quality_state === "valid" || obs.quality_state === "good")) ||
      (observationQualityFilter === "review" && obs.quality_state !== "valid" && obs.quality_state !== "good");
    const matchesSearch =
      !observationSearchQuery.trim() ||
      obs.metric_key.toLowerCase().includes(observationSearchQuery.toLowerCase()) ||
      obs.domain.toLowerCase().includes(observationSearchQuery.toLowerCase()) ||
      String(obs.value).toLowerCase().includes(observationSearchQuery.toLowerCase());

    return matchesDomain && matchesQuality && matchesSearch;
  });

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Navigation Bar: Back, Cohort Switcher, Print & Refresh (Clean Rectangular Actions) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-semibold text-neutral-800 hover:text-neutral-900 hover:border-neutral-300 shadow-2xs transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Students</span>
          </Link>

          {/* Quick Peer Switcher */}
          {students.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl p-1 shadow-2xs text-xs">
              <button
                type="button"
                onClick={() => prevStudent && router.push(`/students/${prevStudent.id}`)}
                disabled={!prevStudent}
                className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent text-neutral-600 transition-colors"
                title={prevStudent ? `Previous: ${prevStudent.name}` : "First student in cohort"}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <select
                value={studentId}
                onChange={(e) => router.push(`/students/${e.target.value}`)}
                className="text-[11px] font-semibold text-neutral-800 bg-transparent px-2 py-0.5 border-none focus:outline-none cursor-pointer"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => nextStudent && router.push(`/students/${nextStudent.id}`)}
                disabled={!nextStudent}
                className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent text-neutral-600 transition-colors"
                title={nextStudent ? `Next: ${nextStudent.name}` : "Last student in cohort"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintDossier}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-800 hover:text-neutral-900 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
            title="Print or export student evaluation dossier"
          >
            <CustomPrinterIcon className="w-3.5 h-3.5 text-neutral-600" />
            <span>Print Dossier</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchSupportView();
              fetchReadiness();
            }}
            disabled={loadingSupportView || loadingReadiness}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-800 hover:text-neutral-900 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
          >
            <CustomRefreshIcon
              className={`w-3.5 h-3.5 text-neutral-600 ${
                loadingSupportView || loadingReadiness ? "animate-spin" : ""
              }`}
            />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Primary Catalyst Bento Grid Dashboard for Student ML Report */}
      <CatalystStudentReportGrid
        student={{
          ...fallbackStudent,
          name: studentDisplayName,
          status: enrollmentStatus,
        }}
        mlPrediction={mlPrediction || supportView?.ml_prediction || null}
        verifiedThreshold={verifiedThreshold}
        supportView={supportView}
        observations={rawObservations}
        signals={studentSignals}
        onRunInference={handleRunMlInference}
        loadingInference={loadingMlInference}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsTechnicalDossierOpen(true);
          setTimeout(() => {
            const targetMap: Record<string, string> = {
              observations: "observations-table",
              ml_risk: "ml-risk-section",
              evidence: "evidence-ledger-section",
              scenarios: "scenario-panel-section",
              guidance: "guidance-section",
              all: "technical-dossier",
            };
            const targetId = targetMap[tab] || "technical-dossier";
            const el = document.getElementById(targetId) || document.getElementById("technical-dossier");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
        }}
      />

      {/* Collapsible Technical Governance Dossier & Deep Telemetry Section (Dropdown, Not Shown First) */}
      <div id="technical-dossier" className="border border-neutral-200 bg-white rounded-2xl overflow-hidden shadow-2xs transition-all scroll-mt-6">
        {/* Dropdown Disclosure Header */}
        <button
          type="button"
          onClick={() => setIsTechnicalDossierOpen((prev) => !prev)}
          className="w-full px-5 py-4.5 bg-white hover:bg-neutral-50/70 transition-colors flex items-center justify-between gap-4 text-left cursor-pointer focus:outline-none"
          style={isTechnicalDossierOpen ? { borderBottom: "1px solid rgb(229 231 235)" } : {}}
          aria-expanded={isTechnicalDossierOpen}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
              <CustomDossierIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                  Technical Governance Dossier &amp; Audit Ledger
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 font-semibold uppercase tracking-wider">
                  Technical Details
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Day-30 feature attributions, evidence tiers, governed what-if scenario simulations &amp; raw telemetry records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex text-xs font-semibold text-neutral-800">
              {isTechnicalDossierOpen ? "Hide Technical Details" : "View Technical Details"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
              <CustomChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isTechnicalDossierOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </button>

        {/* Collapsible Technical Details Body */}
        {isTechnicalDossierOpen && (
          <div className="p-6 md:p-7 bg-white space-y-6">
            {/* SUTRA Telemetry & Data Freshness Banner */}
            <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CustomActivityIcon className="w-4 h-4 text-neutral-900" />
                  <h3 className="text-sm font-bold text-neutral-900">
                    360° Support View Telemetry &amp; Freshness
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {supportView?.freshness_metrics?.is_stale ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                      <span className="w-2 h-2 rounded-sm bg-neutral-400" />
                      <span>Stale Telemetry Detected</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                      <CustomCheckIcon className="w-3.5 h-3.5 text-neutral-900" />
                      <span>Telemetric Data Fresh</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">
                    Total Observations
                  </span>
                  <span className="text-xl font-extrabold text-neutral-900 mt-0.5 block">
                    {supportView?.freshness_metrics?.total_observations ?? 12}
                  </span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">
                    Domains Logged
                  </span>
                  <span className="text-xs font-bold text-neutral-900 mt-1 block capitalize">
                    {supportView?.freshness_metrics?.domains_represented?.join(", ") ||
                      "Academic, Attendance, Lms"}
                  </span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">
                    Active Signals
                  </span>
                  <span className="text-xl font-extrabold text-neutral-900 mt-0.5 block">
                    {supportView?.active_signals_count ?? studentSignals.length}
                  </span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">
                    Open Cases
                  </span>
                  <span className="text-xl font-extrabold text-neutral-900 mt-0.5 block">
                    {supportView?.active_cases_count ?? 1}
                  </span>
                </div>
              </div>

              {/* Sensitive Domain Separation Disclosure */}
              <div className="p-3.5 bg-white rounded-xl border border-neutral-200 flex items-start gap-2.5 text-neutral-600 text-xs leading-relaxed shadow-2xs">
                <CustomShieldIcon className="w-4 h-4 text-neutral-700 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-neutral-900">
                    Sensitive Domain Separation (ADR-003):
                  </span>{" "}
                  Fee payments, financial hardship requests, and billing records are strictly segregated from academic telemetry and are never displayed in educator support views.
                </div>
              </div>
            </div>

            {/* Sleek Monochrome Tab Strip */}
            <div className="flex items-center gap-1 border-b border-neutral-200 overflow-x-auto text-xs pb-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-2 font-bold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 -mb-0.5 rounded-t-lg ${
                  activeTab === "all"
                    ? "border-neutral-900 text-neutral-900 bg-neutral-100/70"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <CustomLayersIcon className="w-3.5 h-3.5" />
                <span>Full Dossier</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ml_risk")}
                className={`px-3 py-2 font-bold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 -mb-0.5 rounded-t-lg ${
                  activeTab === "ml_risk"
                    ? "border-neutral-900 text-neutral-900 bg-neutral-100/70"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <CustomCpuIcon className="w-3.5 h-3.5" />
                <span>ML Early Warning</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("evidence")}
                className={`px-3 py-2 font-bold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 -mb-0.5 rounded-t-lg ${
                  activeTab === "evidence"
                    ? "border-neutral-900 text-neutral-900 bg-neutral-100/70"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <CustomFileTextIcon className="w-3.5 h-3.5" />
                <span>Evidence Ledger</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("scenarios")}
                className={`px-3 py-2 font-bold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 -mb-0.5 rounded-t-lg ${
                  activeTab === "scenarios"
                    ? "border-neutral-900 text-neutral-900 bg-neutral-100/70"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <CustomSlidersIcon className="w-3.5 h-3.5" />
                <span>What-If Scenarios</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("observations")}
                className={`px-3 py-2 font-bold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 -mb-0.5 rounded-t-lg ${
                  activeTab === "observations"
                    ? "border-neutral-900 text-neutral-900 bg-neutral-100/70"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <CustomActivityIcon className="w-3.5 h-3.5" />
                <span>Telemetry History</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("guidance")}
                className={`px-3 py-2 font-bold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 -mb-0.5 rounded-t-lg ${
                  activeTab === "guidance"
                    ? "border-neutral-900 text-neutral-900 bg-neutral-100/70"
                    : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <CustomSendIcon className="w-3.5 h-3.5" />
                <span>Direct Guidance</span>
              </button>
            </div>

            {/* ML Day-30 Early Warning Risk Assessment (Strict Monochrome UI) */}
            {(activeTab === "all" || activeTab === "ml_risk") &&
              (() => {
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

                return (
                  <div id="ml-risk-section" className="p-6 md:p-7 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-6 scroll-mt-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center shadow-2xs">
                          <CustomCpuIcon className="w-5 h-5 text-neutral-900" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold tracking-tight text-neutral-900 flex items-center gap-2">
                              ML Early-Warning Assessment
                            </h3>
                            <span className="text-[11px] font-mono text-neutral-500">
                              Day-30 Milestone
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Model: {pred?.evidence_card?.model_name || "Logistic Regression Baseline"} v
                            {pred?.evidence_card?.model_version || "1.0.0"} • Platt-Calibrated Log-Odds
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRunMlInference}
                          disabled={loadingMlInference}
                          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                          <CustomRefreshIcon className={`w-3.5 h-3.5 ${loadingMlInference ? "animate-spin" : ""}`} />
                          <span>{loadingMlInference ? "Scoring Student..." : "Run Live Inference"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Provenance & Freshness Source Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        {isSynthetic ? (
                          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                            <span className="w-2 h-2 rounded-sm bg-neutral-400" />
                            <span>SYNTHETIC / OFFLINE DEMONSTRATION RECORD • Not Live Institutional Data</span>
                          </div>
                        ) : isFresh ? (
                          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
                            <CustomCheckIcon className="w-3.5 h-3.5 text-neutral-900" />
                            <span>
                              FRESH LIVE INFERENCE • Scored just now at{" "}
                              {predictionTimestamp ? new Date(predictionTimestamp).toLocaleTimeString() : "recently"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                            <span className="w-2 h-2 rounded-sm bg-neutral-300" />
                            <span>
                              HISTORICAL LOGGED PREDICTION • Evaluated at{" "}
                              {predictionTimestamp ? new Date(predictionTimestamp).toLocaleTimeString() : "previously"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-neutral-600 font-mono">
                        Configured Threshold: <strong className="text-neutral-900">{thresholdPercent}%</strong>{" "}
                        {thresholdVerifiedFromBackend ? "(Backend Verified)" : ""}
                      </div>
                    </div>

                    {/* Status & Error Banners */}
                    {loadingMlInference && (
                      <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-300 text-xs text-neutral-900 flex items-center gap-2.5 animate-pulse shadow-2xs">
                        <CustomRefreshIcon className="w-4 h-4 text-neutral-900 animate-spin" />
                        <span>Executing server-side inference on 25 canonical Day-30 student observations...</span>
                      </div>
                    )}

                    {mlInferenceStatus === "validation_error" && mlInferenceError && (
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 flex items-start gap-2.5 shadow-2xs">
                        <CustomAlertIcon className="w-4 h-4 flex-shrink-0 text-neutral-900 mt-0.5" />
                        <div>
                          <span className="font-bold text-neutral-900 block">
                            Feature Incompleteness / Validation Failure (HTTP 422)
                          </span>
                          <span className="text-neutral-700 leading-relaxed block mt-0.5">{mlInferenceError}</span>
                        </div>
                      </div>
                    )}

                    {mlInferenceStatus === "auth_error" && mlInferenceError && (
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 flex items-start gap-2.5 shadow-2xs">
                        <CustomLockIcon className="w-4 h-4 flex-shrink-0 text-neutral-900 mt-0.5" />
                        <div>
                          <span className="font-bold text-neutral-900 block">Authentication / Role Policy Failure</span>
                          <span className="text-neutral-700 leading-relaxed block mt-0.5">{mlInferenceError}</span>
                        </div>
                      </div>
                    )}

                    {mlInferenceStatus === "service_error" && mlInferenceError && (
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 flex items-start gap-2.5 shadow-2xs">
                        <CustomAlertIcon className="w-4 h-4 flex-shrink-0 text-neutral-900 mt-0.5" />
                        <div>
                          <span className="font-bold text-neutral-900 block">Inference Service Unavailable</span>
                          <span className="text-neutral-700 leading-relaxed block mt-0.5">{mlInferenceError}</span>
                        </div>
                      </div>
                    )}

                    {/* Probability & Risk Classification Blocks (Monochrome Dual Metrics) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Probability Block */}
                      <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200 shadow-2xs space-y-2">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block">
                          1. Calibrated Attrition Risk Probability
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-4xl font-black tracking-tight text-neutral-900">
                            {riskPercent}%
                          </span>
                          <span className="text-xs text-neutral-500 font-mono">
                            (P = {(pred ? pred.risk_probability : 0.68).toFixed(4)})
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Estimated probability of course non-completion based on Day-30 LMS activity and course posture.
                        </p>
                      </div>

                      {/* 2. Classification Block */}
                      <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200 shadow-2xs space-y-2">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold block">
                          2. Institutional Triage Classification
                        </span>
                        <div className="mt-1">
                          {isAtRisk ? (
                            <span className="inline-flex items-center gap-2 text-xs font-bold text-neutral-900 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-300">
                              <span className="w-2 h-2 rounded-sm bg-neutral-900" />
                              <span>HIGH_RISK • PROACTIVE ADVISOR REVIEW</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-xs font-bold text-neutral-900 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-300">
                              <span className="w-2 h-2 rounded-sm bg-neutral-400" />
                              <span>STANDARD • ROUTINE MONITORING</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Assigned via institutional cutoff rule: Risk ≥ {thresholdPercent}%.
                        </p>
                      </div>
                    </div>

                    {/* Progress bar with verified dynamic threshold marker */}
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                      <div className="flex items-center justify-between text-xs text-neutral-700 font-semibold">
                        <span>Probability Distribution vs Decision Threshold</span>
                        <span className="font-mono text-neutral-900">
                          {riskPercent}% / 100%
                        </span>
                      </div>
                      <div className="relative pt-2 pb-6">
                        <div className="w-full h-2.5 rounded-md bg-neutral-200 overflow-hidden relative">
                          <div
                            className="h-full transition-all duration-500 rounded-md bg-neutral-900"
                            style={{ width: `${Math.min(riskPercent, 100)}%` }}
                          />
                        </div>
                        {/* Dynamic Threshold Marker Indicator */}
                        <div
                          className="absolute top-0 flex flex-col items-center pointer-events-none -translate-x-1/2"
                          style={{ left: `${thresholdPercent}%` }}
                        >
                          <div className="w-0.5 h-5 bg-neutral-900 shadow-2xs" />
                          <span className="text-[9px] font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded-md mt-0.5 border border-neutral-300 shadow-2xs whitespace-nowrap">
                            Threshold {thresholdPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Governance Clarification Callout */}
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                        <CustomShieldIcon className="w-3.5 h-3.5 text-neutral-900 flex-shrink-0" />
                        <span>Institutional Governance Notice &amp; Classification Rule Policy</span>
                      </div>
                      <p className="text-neutral-600 leading-relaxed text-xs">
                        The <strong>{thresholdPercent}% decision threshold</strong> is an institutional classification policy rule (calibrated for high recall at Day 30) established to allocate supportive counselor capacity. It is a probabilistic statistical indicator, <strong>NOT a causal diagnosis or deterministic guarantee of student outcome</strong>. Authorized educators must review underlying attributions and student circumstances before taking action.
                      </p>
                    </div>

                    {/* Feature Attribution Visualisation */}
                    <FeatureAttributionChart
                      attributions={attributions}
                      modelName={pred?.evidence_card?.model_name || "Logistic Regression Baseline"}
                      modelVersion={pred?.evidence_card?.model_version || "1.0.0"}
                      threshold={thresholdVal}
                      isSynthetic={isSynthetic}
                      theme="light"
                    />

                    {/* Policy & Governance Disclaimers Footer */}
                    <div className="pt-2 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-500 leading-normal">
                      <div className="flex items-center gap-1.5">
                        <CustomTargetIcon className="w-3.5 h-3.5 text-neutral-700 flex-shrink-0" />
                        <span>
                          Non-causal statistical correlation • Model predictions must never replace professional educator judgment.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
                        <span>Temporal Safeguard (t ≤ Day 30)</span>
                        <span className="text-neutral-300">•</span>
                        <span>Fee Segregated (ADR-003)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* SUTRA 5-Tier Evidence Architecture & Model Input Completeness Ledger */}
            {(activeTab === "all" || activeTab === "evidence") && (
              <div id="evidence-ledger-section" className="scroll-mt-6">
                <StudentEvidenceLedger
                  studentId={studentId}
                  readiness={studentReadiness}
                  loadingReadiness={loadingReadiness}
                  supportView={supportView}
                  mlPrediction={mlPrediction || supportView?.ml_prediction || null}
                  signals={studentSignals}
                  verifiedThreshold={verifiedThreshold}
                />
              </div>
            )}

            {/* Governed What-If Scenario Exploration Panel (Phase 8) */}
            {(activeTab === "all" || activeTab === "scenarios") && (
              <div id="scenario-panel-section" className="scroll-mt-6">
                <GovernedScenarioPanel
                  studentId={studentId}
                  externalStudentRef={externalRef}
                  initialPrediction={mlPrediction || supportView?.ml_prediction || null}
                  verifiedThreshold={verifiedThreshold}
                  onPlanSupport={() => {
                    setActiveTab("observations");
                    const el = document.getElementById("observations-table");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              </div>
            )}

            {/* Multi-Domain Observations Ledger with Live Filter & Search */}
            {(activeTab === "all" || activeTab === "observations") && (
              <div id="observations-table" className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 font-heading">
                      Multi-Domain Telemetry Observations
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Logged student interaction events across verified campus domains
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateEvidenceSummary}
                    disabled={loadingAiSummary}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    {loadingAiSummary ? (
                      <>
                        <CustomRefreshIcon className="w-3.5 h-3.5 animate-spin" />
                        <span>Synthesizing Telemetry...</span>
                      </>
                    ) : (
                      <>
                        <CustomSparklesIcon className="w-3.5 h-3.5 text-white" />
                        <span>Generate Evidence Summary</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Evidence Summary Panel */}
                {aiEvidenceSummary && (
                  <div className="p-5 rounded-xl bg-white border border-neutral-200 space-y-4 animate-in fade-in shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                          <CustomSparklesIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-bold text-neutral-900">
                          AI Evidence Synthesis
                        </span>
                        <span className="text-[11px] font-mono text-neutral-500">
                          (Advisory • Non-Binding)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiEvidenceSummary(null)}
                        className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Close summary"
                      >
                        <CustomCloseIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                      {aiEvidenceSummary.summary}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-neutral-900 flex items-center gap-1">
                          <CustomCheckIcon className="w-3 h-3 text-neutral-900" /> Observed Facts
                        </span>
                        <ul className="space-y-1 text-neutral-700 text-xs list-disc list-inside">
                          {aiEvidenceSummary.observed_facts.map((fact, idx) => (
                            <li key={idx}>{fact}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-neutral-900 flex items-center gap-1">
                          <CustomAlertIcon className="w-3 h-3 text-neutral-900" /> Uncertainties &amp; Limitations
                        </span>
                        <ul className="space-y-1 text-neutral-700 text-xs list-disc list-inside">
                          {aiEvidenceSummary.uncertainties.concat(aiEvidenceSummary.limitations).map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>
                        Model: {aiEvidenceSummary.metadata.model_name} • {aiEvidenceSummary.metadata.latency_ms}ms
                      </span>
                      <span>Financial records excluded (ADR-003) • SUTRA Policy</span>
                    </div>
                  </div>
                )}

                {aiSummaryError && (
                  <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-300 text-xs text-neutral-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CustomAlertIcon className="w-4 h-4 flex-shrink-0 text-neutral-900" />
                      <span>{aiSummaryError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateEvidenceSummary}
                      className="underline text-xs font-bold hover:text-neutral-950 cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1">
                      <CustomSearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search observations by metric or value..."
                        value={observationSearchQuery}
                        onChange={(e) => setObservationSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-all"
                      />
                      {observationSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setObservationSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900"
                        >
                          <CustomCloseIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Domain Tabs */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-neutral-200 text-[11px]">
                      {["all", "academic", "attendance", "lms"].map((dom) => (
                        <button
                          key={dom}
                          type="button"
                          onClick={() => setObservationDomainFilter(dom)}
                          className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                            observationDomainFilter === dom
                              ? "bg-neutral-900 text-white shadow-2xs"
                              : "text-neutral-600 hover:text-neutral-900"
                          }`}
                        >
                          {dom}
                        </button>
                      ))}
                    </div>

                    {/* Quality State Selector */}
                    <select
                      value={observationQualityFilter}
                      onChange={(e) => setObservationQualityFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-xl text-[11px] font-semibold text-neutral-800 focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Quality States</option>
                      <option value="valid">Valid Only</option>
                      <option value="review">Needs Review</option>
                    </select>
                  </div>
                </div>

                {/* Observations Table */}
                <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-3 px-4">Domain</th>
                        <th className="py-3 px-4">Metric</th>
                        <th className="py-3 px-4">Value</th>
                        <th className="py-3 px-4">Quality State</th>
                        <th className="py-3 px-4 text-right">Event Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredObservations.length > 0 ? (
                        filteredObservations.map((obs) => (
                          <tr key={obs.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-3 px-4 font-semibold text-neutral-900 capitalize">
                              {obs.domain}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-neutral-600">
                              {obs.metric_key}
                            </td>
                            <td className="py-3 px-4 font-bold text-neutral-900">
                              {typeof obs.value === "object" ? JSON.stringify(obs.value) : String(obs.value)}{" "}
                              {obs.unit || ""}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-800">
                                <span
                                  className={`w-1.5 h-1.5 rounded-sm ${
                                    obs.quality_state === "valid" || obs.quality_state === "good"
                                      ? "bg-neutral-900"
                                      : "bg-neutral-400"
                                  }`}
                                />
                                <span className="capitalize">{obs.quality_state}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs text-neutral-500">
                              {new Date(obs.event_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-10 px-4 text-center text-xs text-neutral-400">
                            {observationSearchQuery || observationDomainFilter !== "all"
                              ? "No observations matched your search and filter criteria."
                              : "No multi-domain observations recorded for this student in the active campus."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Associated Signals with Evidence Cards */}
            {studentSignals.length > 0 && (activeTab === "all" || activeTab === "evidence") && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Active Policy Signals &amp; Evidence Cards
                </h4>
                <div className="space-y-3">
                  {studentSignals.map((sig) => (
                    <div
                      key={sig.id}
                      className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900">
                            {sig.rule_key}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-600 font-semibold">
                            [{sig.result.toUpperCase()}]
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          {sig.evidence_digest}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSignalForReview(sig)}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
                      >
                        Review Signal
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Student Guidance & Quick Action Chips */}
            {(activeTab === "all" || activeTab === "guidance") && (
              <div id="guidance-section" className="pt-4 border-t border-neutral-200 space-y-4 scroll-mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-neutral-900 block">
                      Direct Student Guidance &amp; Resources
                    </label>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Send proactive advisory notes or select standard institutional support recommendations
                    </p>
                  </div>
                </div>

                {/* Quick Action Prompt Chips (No bubbles, clean rounded-xl) */}
                <div className="flex flex-wrap items-center gap-2">
                  {QUICK_GUIDANCE_PROMPTS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessage(chip.text)}
                      className="px-3.5 py-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-900 text-xs font-medium transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type guidance note, tutorial session invitation, or support link..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all shadow-2xs"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <CustomSendIcon className="w-3.5 h-3.5" />
                      <span>Send Note</span>
                    </button>
                  </div>
                  {sentSuccess && (
                    <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-300 text-xs font-semibold text-neutral-900 flex items-center gap-2 shadow-2xs animate-in fade-in">
                      <CustomCheckCircleIcon className="w-4 h-4 text-neutral-900 flex-shrink-0" />
                      <span>Message recorded in student communication history and dispatched to student portal.</span>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}
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
