"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { SkillHubLogo } from "@/components/SkillHubLogo";
import { UserAvatar } from "@/components/UserAvatar";
import { supabaseAuth } from "@/lib/supabase";
import { api } from "@/lib/api";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";

export type AccountLevel = "student" | "faculty" | "admin" | "counselor";

interface OnboardingFormData {
  // Step 1: Role
  accountLevel: AccountLevel;

  // Step 2: Personal Identity
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  avatar: string;

  // Step 3: Role-specific
  studentId: string;
  degreeProgram: string;
  academicYear: string;
  studentCampus: string;
  academicInterests: string;

  facultyId: string;
  department: string;
  academicTitle: string;
  assignedCohort: string;
  officeLocation: string;
  officeHours: string;
  advisorBio: string;

  adminDesignation: string;
  adminId: string;
  adminScope: string;
  escalationEmail: string;
  mfaAcknowledged: boolean;

  counselorId: string;
  counselorSpecialization: string;
  counselorOffice: string;
  counselorAvailableHours: string;
  counselorVirtualRoom: string;
  counselorBio: string;

  // Step 4: Preferences
  preferredLanguage: string;
  notifySla: boolean;
  notifyDailyDigest: boolean;
  notifyHighRiskSound: boolean;
}

// ==========================================
// BESPOKE CUSTOM SVGs (ZERO DEFAULT LUCIDE ICONS)
// ==========================================

function CustomCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CustomArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function CustomArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function CustomUserIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CustomDisplayNameIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
      <circle cx="12" cy="7" r="4" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CustomMailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function CustomPhoneIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function CustomStudentRoleIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function CustomFacultyRoleIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
      <path d="M6 14h6" />
    </svg>
  );
}

function CustomAdminRoleIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11H9V10z" />
    </svg>
  );
}

function CustomCounselorRoleIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5v6" />
      <path d="M9 8h6" />
    </svg>
  );
}

function CustomGlobeLanguageIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function CustomBellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function CustomSparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function CustomLoaderIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const {
    user,
    supabaseSession,
    updateUser,
    setActiveRole,
    setActiveCampusName,
    fetchIdentity,
  } = useSkillHub();
  const { languages, setLanguage } = useLanguage();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [googleAutofilled, setGoogleAutofilled] = useState(false);

  const [formData, setFormData] = useState<OnboardingFormData>({
    accountLevel: "faculty",
    fullName: "",
    displayName: "",
    email: "",
    phone: "",
    avatar: "",

    // Student
    studentId: "2026-BCSE-042",
    degreeProgram: "B.Tech Computer Science & Engineering",
    academicYear: "2nd Year (Semester 4)",
    studentCampus: "Apex University Main Campus",
    academicInterests: "Distributed Systems, Machine Learning & Academic Persistence",

    // Faculty
    facultyId: "FAC-9021",
    department: "School of Engineering & Computer Science",
    academicTitle: "Associate Professor & Faculty Advisor",
    assignedCohort: "Cohort CS-Y2 (Computer Science)",
    officeLocation: "Turing Hall, Room 304",
    officeHours: "Monday & Wednesday, 2:00 PM - 4:00 PM",
    advisorBio: "Dedicated to student persistence, early intervention orchestration, and empathetic academic guidance.",

    // Admin
    adminDesignation: "Dean of Academic Affairs & Student Success",
    adminId: "ADM-ROOT-01",
    adminScope: "All Institutional Campuses (Multi-Tenant)",
    escalationEmail: "dean.academics@apex.edu",
    mfaAcknowledged: true,

    // Counselor
    counselorId: "CNS-8041",
    counselorSpecialization: "Student Wellbeing & Stress Management",
    counselorOffice: "Student Wellness Center, Suite 204",
    counselorAvailableHours: "Mon-Fri • 9:00 AM - 5:00 PM",
    counselorVirtualRoom: "https://meet.google.com/sutra-wellness",
    counselorBio: "Dedicated to holistic student wellness, empathetic academic de-escalation, and timely intervention.",

    // Preferences
    preferredLanguage: "en-US",
    notifySla: true,
    notifyDailyDigest: true,
    notifyHighRiskSound: false,
  });

  // Automatically prefill from Google authentication session
  useEffect(() => {
    async function loadGoogleProfile() {
      try {
        const session = await supabaseAuth.getSession();
        const authUser = session?.user || supabaseSession?.user;
        const meta = authUser?.user_metadata || {};

        const gFullName =
          meta.full_name ||
          meta.name ||
          user.fullName ||
          (user.name !== "Prof. Ananya Sharma" ? user.name : "");
        const gEmail = authUser?.email || user.email || "";
        if (gFullName || gEmail) {
          setFormData((prev) => ({
            ...prev,
            fullName: gFullName || prev.fullName,
            displayName: gFullName ? gFullName.split(" ")[0] : prev.displayName,
            email: gEmail || prev.email,
          }));
          setGoogleAutofilled(true);
        }
      } catch {
        if (user.fullName || user.email) {
          setFormData((prev) => ({
            ...prev,
            fullName: user.fullName || user.name || prev.fullName,
            displayName: (user.fullName || user.name || "").split(" ")[0] || prev.displayName,
            email: user.email || prev.email,
          }));
        }
      }
    }

    loadGoogleProfile();
  }, [user, supabaseSession]);

  const updateField = (field: keyof OnboardingFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.fullName.trim()) {
        alert("Please enter your full name.");
        return;
      }
      if (!formData.email.trim()) {
        alert("Please enter your email address.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Provisioning is idempotent per authenticated user; minting returns that user's unique token.
      await api.identity.provisionIdentity();
      if (formData.avatar.startsWith("/avatars/")) {
        await api.identity.updateAvatar({
          avatar_url: formData.avatar,
        });
      }
      await api.identity.mintNFT({});
      // Do not claim a mint when Web3 is unavailable, but never prevent account
      // creation. The profile NFT card can complete a real mint after a wallet
      // is connected and the backend's Base Sepolia contract is ready.
      await fetchIdentity();

      updateUser({
        name: formData.displayName || formData.fullName.split(" ")[0] || "User",
        fullName: formData.fullName,
        email: formData.email,
        avatar: formData.avatar,
      });

      if (formData.accountLevel === "student") {
        setActiveRole("student");
      } else if (formData.accountLevel === "admin") {
        setActiveRole("admin");
      } else if (formData.accountLevel === "counselor") {
        setActiveRole("counselor");
      } else {
        setActiveRole("faculty");
      }

      const campus =
        formData.accountLevel === "student"
          ? formData.studentCampus
          : "Apex University Main Campus";
      setActiveCampusName(campus);

      const langMatch = languages.find((l) => l.code === formData.preferredLanguage);
      if (langMatch) {
        setLanguage(langMatch);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("sutra_onboarding_completed", "true");
        localStorage.setItem("sutra_user_onboarding", JSON.stringify(formData));
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/dashboard");
    } catch (err) {
      console.error("Could not finish signup with identity NFT:", err);
      setSubmitError(err instanceof Error ? err.message : "We couldn't mint your identity NFT. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ECEFF3] flex flex-col justify-between p-3 sm:p-6 md:p-8 selection:bg-neutral-900 selection:text-white">
      {/* TOP HEADER */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 sm:pb-8">
        <Link href="/" className="flex items-center gap-2 group">
          <SkillHubLogo />
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
            Already have an account?
          </span>
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-800 shadow-2xs transition-all"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* MAIN ONBOARDING CARD CONTAINER */}
      <main className="max-w-4xl w-full mx-auto bg-white rounded-3xl sm:rounded-[36px] shadow-[0_20px_60px_rgba(15,23,42,0.06)] border border-neutral-200/90 overflow-hidden flex flex-col">
        {/* STEP PROGRESS INDICATOR BAR: NUMBERS ONLY, NO TOPIC TEXT */}
        <div className="border-b border-neutral-100 bg-[#FAFAFA] px-6 sm:px-10 py-5">
          <div className="flex items-center justify-center max-w-sm mx-auto">
            {[1, 2, 3, 4].map((stepNum, idx) => {
              const isPassed = currentStep > stepNum;
              const isCurrent = currentStep === stepNum;

              return (
                <React.Fragment key={stepNum}>
                  <div className="flex items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? "bg-neutral-900 text-white shadow-xs"
                          : isCurrent
                          ? "bg-neutral-900 text-white ring-4 ring-neutral-900/10 shadow-xs"
                          : "bg-neutral-100 text-neutral-400 border border-neutral-200/80"
                      }`}
                    >
                      {isPassed ? (
                        <CustomCheckIcon className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <span>{stepNum}</span>
                      )}
                    </div>
                  </div>

                  {idx < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 sm:mx-5 rounded-full transition-colors ${
                        currentStep > stepNum ? "bg-neutral-900" : "bg-neutral-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* STEP CONTENT BODY */}
        <div className="p-6 sm:p-10 md:p-12 flex-1">
          {/* ========================================================
              STEP 1: SELECT ACCOUNT LEVEL (ONLY ROLE-BASED BOXES, PURE BLACK & WHITE)
              ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-bold tracking-wider uppercase font-mono">
                  <CustomSparklesIcon className="w-3.5 h-3.5 text-neutral-700" />
                  <span>STEP 1: ACCOUNT ROLE</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                  Choose your institutional role
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                  Select your account level to configure relevant workspaces and access.
                </p>
              </div>

              {/* 4 CLEAN ROLE-BASED BOXES: MONOCHROME MINIMALIST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-4xl mx-auto">
                {/* 1. STUDENT BOX */}
                <div
                  onClick={() => updateField("accountLevel", "student")}
                  className={`relative p-7 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center justify-center gap-3.5 group min-h-[190px] ${
                    formData.accountLevel === "student"
                      ? "border-neutral-900 bg-neutral-50/80 shadow-md ring-2 ring-neutral-900/10"
                      : "border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50"
                  }`}
                >
                  {formData.accountLevel === "student" && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                      <CustomCheckIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}

                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <CustomStudentRoleIcon className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Student</h3>
                    <p className="text-xs text-neutral-400 mt-1 font-medium">Enrolled Scholar</p>
                  </div>
                </div>

                {/* 2. FACULTY BOX */}
                <div
                  onClick={() => updateField("accountLevel", "faculty")}
                  className={`relative p-7 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center justify-center gap-3.5 group min-h-[190px] ${
                    formData.accountLevel === "faculty"
                      ? "border-neutral-900 bg-neutral-50/80 shadow-md ring-2 ring-neutral-900/10"
                      : "border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50"
                  }`}
                >
                  {formData.accountLevel === "faculty" && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                      <CustomCheckIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}

                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <CustomFacultyRoleIcon className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Faculty</h3>
                    <p className="text-xs text-neutral-400 mt-1 font-medium">Educator &amp; Mentor</p>
                  </div>
                </div>

                {/* 3. COUNSELOR BOX */}
                <div
                  onClick={() => updateField("accountLevel", "counselor")}
                  className={`relative p-7 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center justify-center gap-3.5 group min-h-[190px] ${
                    formData.accountLevel === "counselor"
                      ? "border-neutral-900 bg-neutral-50/80 shadow-md ring-2 ring-neutral-900/10"
                      : "border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50"
                  }`}
                >
                  {formData.accountLevel === "counselor" && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                      <CustomCheckIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}

                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <CustomCounselorRoleIcon className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Counselor</h3>
                    <p className="text-xs text-neutral-400 mt-1 font-medium">Wellbeing &amp; Guidance</p>
                  </div>
                </div>

                {/* 4. ADMINISTRATOR BOX */}
                <div
                  onClick={() => updateField("accountLevel", "admin")}
                  className={`relative p-7 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center justify-center gap-3.5 group min-h-[190px] ${
                    formData.accountLevel === "admin"
                      ? "border-neutral-900 bg-neutral-50/80 shadow-md ring-2 ring-neutral-900/10"
                      : "border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50"
                  }`}
                >
                  {formData.accountLevel === "admin" && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                      <CustomCheckIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}

                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <CustomAdminRoleIcon className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Administrator</h3>
                    <p className="text-xs text-neutral-400 mt-1 font-medium">Campus Governance</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: PERSONAL IDENTITY (PIXEL-PERFECT BALANCED 2x2 GRID)
              ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-bold tracking-wider uppercase font-mono">
                  <CustomUserIcon className="w-3.5 h-3.5 text-neutral-700" />
                  <span>STEP 2: PERSONAL IDENTITY</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                  Tell us about yourself
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                  This identity will be displayed across student success workflows and case audit histories.
                </p>
              </div>

              {/* Google Workspace Auto-Filled Notice */}
              {googleAutofilled && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-center gap-2.5 text-xs text-neutral-800">
                  <CustomCheckIcon className="w-4 h-4 text-neutral-900 shrink-0 stroke-[2.5]" />
                  <span className="font-medium">
                    Profile details automatically pre-filled from your institutional Google Workspace account.
                  </span>
                </div>
              )}

              <AvatarPicker value={formData.avatar} onChange={(avatar) => updateField("avatar", avatar)} />

              {/* FORM INPUTS: BALANCED 2x2 GRID WITH EQUAL HEIGHT LABELS & ICONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Full Legal Name */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-xs font-semibold text-neutral-800">Full Legal Name</label>
                    <span className="text-[10px] text-rose-500 font-medium font-mono">*Required</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                      <CustomUserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      placeholder="e.g. Prof. Ananya Sharma or Aryan Tailor"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                {/* 2. Preferred Display Name */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-xs font-semibold text-neutral-800">Preferred Display Name</label>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                      <CustomDisplayNameIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => updateField("displayName", e.target.value)}
                      placeholder="e.g. Ananya or Aryan"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white transition-all"
                    />
                  </div>
                </div>

                {/* 3. Institutional Email */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-xs font-semibold text-neutral-800">Institutional Email</label>
                    <span className="text-[10px] text-rose-500 font-medium font-mono">*Required</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                      <CustomMailIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="e.g. educator@sutra.edu or student@apex.edu"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                {/* 4. Contact / WhatsApp */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-xs font-semibold text-neutral-800">Contact / WhatsApp Number</label>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                      <CustomPhoneIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: ROLE-SPECIFIC INSTITUTIONAL PROFILE DETAILS
              ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-bold tracking-wider uppercase font-mono">
                  <CustomStudentRoleIcon className="w-3.5 h-3.5 text-neutral-700" />
                  <span>STEP 3: INSTITUTIONAL CONFIGURATION</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                  {formData.accountLevel === "student" && "Academic Program & Enrollment"}
                  {formData.accountLevel === "faculty" && "Department & Faculty Profile"}
                  {formData.accountLevel === "admin" && "Administrative Oversight & Scope"}
                  {formData.accountLevel === "counselor" && "Clinical Specialization & Student Care Hours"}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                  Tailored parameters for your {formData.accountLevel.toUpperCase()} account in Apex University.
                </p>
              </div>

              {/* 3A. STUDENT FORM */}
              {formData.accountLevel === "student" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Roll Number / Student PRN</label>
                      <input
                        type="text"
                        value={formData.studentId}
                        onChange={(e) => updateField("studentId", e.target.value)}
                        placeholder="e.g. 2026-BCSE-042"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Academic Year &amp; Semester</label>
                      <select
                        value={formData.academicYear}
                        onChange={(e) => updateField("academicYear", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white font-medium"
                      >
                        <option>1st Year (Semester 1 &amp; 2)</option>
                        <option>2nd Year (Semester 3 &amp; 4)</option>
                        <option>3rd Year (Semester 5 &amp; 6)</option>
                        <option>4th Year (Semester 7 &amp; 8)</option>
                        <option>Postgraduate (M.Tech / MBA / Ph.D)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Degree Program</label>
                      <select
                        value={formData.degreeProgram}
                        onChange={(e) => updateField("degreeProgram", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white font-medium"
                      >
                        <option>B.Tech Computer Science &amp; Engineering</option>
                        <option>B.Tech Electronics &amp; Communication</option>
                        <option>B.Tech Artificial Intelligence &amp; Data Science</option>
                        <option>B.Tech Mechanical Engineering</option>
                        <option>B.Sc Applied Mathematics &amp; Computing</option>
                        <option>MBA in Technology Management</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Primary Campus</label>
                      <input
                        type="text"
                        value={formData.studentCampus}
                        onChange={(e) => updateField("studentCampus", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Academic Interests &amp; Learning Goals</label>
                      <textarea
                        rows={3}
                        value={formData.academicInterests}
                        onChange={(e) => updateField("academicInterests", e.target.value)}
                        placeholder="e.g. Distributed algorithms, real-time operating systems, campus hackathons..."
                        className="w-full p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3B. FACULTY FORM */}
              {formData.accountLevel === "faculty" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Faculty ID / Employee Code</label>
                      <input
                        type="text"
                        value={formData.facultyId}
                        onChange={(e) => updateField("facultyId", e.target.value)}
                        placeholder="e.g. FAC-9021"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Assigned Advising Cohort</label>
                      <input
                        type="text"
                        value={formData.assignedCohort}
                        onChange={(e) => updateField("assignedCohort", e.target.value)}
                        placeholder="e.g. Cohort CS-Y2 (Computer Science)"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Academic Department</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => updateField("department", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Academic Title &amp; Designation</label>
                      <input
                        type="text"
                        value={formData.academicTitle}
                        onChange={(e) => updateField("academicTitle", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Office Location</label>
                      <input
                        type="text"
                        value={formData.officeLocation}
                        onChange={(e) => updateField("officeLocation", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Advising Office Hours</label>
                      <input
                        type="text"
                        value={formData.officeHours}
                        onChange={(e) => updateField("officeHours", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Advisor Bio &amp; Mentorship Statement</label>
                      <textarea
                        rows={3}
                        value={formData.advisorBio}
                        onChange={(e) => updateField("advisorBio", e.target.value)}
                        className="w-full p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3C. ADMIN FORM */}
              {formData.accountLevel === "admin" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Admin Access ID</label>
                      <input
                        type="text"
                        value={formData.adminId}
                        onChange={(e) => updateField("adminId", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Escalation Alert Email</label>
                      <input
                        type="email"
                        value={formData.escalationEmail}
                        onChange={(e) => updateField("escalationEmail", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Administrative Designation</label>
                      <select
                        value={formData.adminDesignation}
                        onChange={(e) => updateField("adminDesignation", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white font-medium"
                      >
                        <option>Dean of Academic Affairs &amp; Student Success</option>
                        <option>Head of Department (HOD) - Computing &amp; Informatics</option>
                        <option>Dean of Student Welfare &amp; Counseling</option>
                        <option>Academic Registrar &amp; Examination Controller</option>
                        <option>Provost &amp; Institutional Governance Lead</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Campus Governance Scope</label>
                      <select
                        value={formData.adminScope}
                        onChange={(e) => updateField("adminScope", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white font-medium"
                      >
                        <option>All Institutional Campuses (Multi-Tenant Sovereign Scope)</option>
                        <option>Apex University Main Campus Only</option>
                        <option>East Technology Wing &amp; Research Labs</option>
                      </select>
                    </div>

                    <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 sm:col-span-2 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="mfaAck"
                        checked={formData.mfaAcknowledged}
                        onChange={(e) => updateField("mfaAcknowledged", e.target.checked)}
                        className="mt-1 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="mfaAck" className="text-xs text-neutral-800 leading-relaxed cursor-pointer">
                        <span className="font-bold block">Institutional Security &amp; Audit Compliance</span>
                        I acknowledge that as an administrator, all triage escalations, policy overrides, and audit queries will be logged into immutable PostgreSQL audit ledgers with my actor ID.
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 3D. COUNSELOR FORM */}
              {formData.accountLevel === "counselor" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Counselor PRN / License ID</label>
                      <input
                        type="text"
                        value={formData.counselorId}
                        onChange={(e) => updateField("counselorId", e.target.value)}
                        placeholder="e.g. CNS-8041"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Available Consultation Hours</label>
                      <input
                        type="text"
                        value={formData.counselorAvailableHours}
                        onChange={(e) => updateField("counselorAvailableHours", e.target.value)}
                        placeholder="e.g. Mon-Fri • 9:00 AM - 5:00 PM"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Primary Specialization Domain</label>
                      <select
                        value={formData.counselorSpecialization}
                        onChange={(e) => updateField("counselorSpecialization", e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white font-medium"
                      >
                        <option>Student Wellbeing &amp; Stress Management</option>
                        <option>Academic De-escalation &amp; Retention Support</option>
                        <option>Career, Vocational &amp; Internship Counseling</option>
                        <option>Crisis Triage &amp; Emergency Escalation</option>
                        <option>Peer Mediation &amp; Campus Integration</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Physical Wellness Clinic / Office</label>
                      <input
                        type="text"
                        value={formData.counselorOffice}
                        onChange={(e) => updateField("counselorOffice", e.target.value)}
                        placeholder="e.g. Student Wellness Center, Suite 204"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-800">Secure Virtual Consultation Room</label>
                      <input
                        type="text"
                        value={formData.counselorVirtualRoom}
                        onChange={(e) => updateField("counselorVirtualRoom", e.target.value)}
                        placeholder="https://meet.google.com/sutra-wellness"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-neutral-800">Counseling Statement &amp; Approach</label>
                      <textarea
                        rows={3}
                        value={formData.counselorBio}
                        onChange={(e) => updateField("counselorBio", e.target.value)}
                        placeholder="Describe your student care methodology and confidential consultation approach..."
                        className="w-full p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              STEP 4: PREFERENCES, PREVIEW & FINISH
              ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-bold tracking-wider uppercase font-mono">
                  <CustomSparklesIcon className="w-3.5 h-3.5 text-neutral-700" />
                  <span>STEP 4: PREFERENCES &amp; CONFIRMATION</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                  Review and finalize setup
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                  Choose your regional language and notification policies before entering the workspace.
                </p>
              </div>

              {/* Language Selector */}
              <div className="p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CustomGlobeLanguageIcon className="w-4 h-4 text-neutral-800" />
                    <span className="text-xs font-bold text-neutral-900">
                      Indic Language Engine (Sarvam AI)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-700 bg-neutral-200/70 px-2.5 py-0.5 rounded-full font-mono">
                    SOVEREIGN AI
                  </span>
                </div>

                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => updateField("preferredLanguage", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white font-medium"
                >
                  <option value="en-US">English (English)</option>
                  <option value="hi-IN">हिन्दी (Hindi)</option>
                  <option value="ta-IN">தமிழ் (Tamil)</option>
                  <option value="te-IN">తెలుగు (Telugu)</option>
                  <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                  <option value="mr-IN">मराठी (Marathi)</option>
                  <option value="bn-IN">বাংলা (Bengali)</option>
                  <option value="gu-IN">ગુજરાતી (Gujarati)</option>
                  <option value="pa-IN">ਪੰਜਾਬੀ (Punjabi)</option>
                </select>
                <p className="text-[11px] text-neutral-400">
                  All alerts, triage cards, and case notes will be automatically translated into this language.
                </p>
              </div>

              {/* Notification Toggles */}
              <div className="p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 space-y-3">
                <div className="flex items-center gap-2">
                  <CustomBellIcon className="w-4 h-4 text-neutral-800" />
                  <span className="text-xs font-bold text-neutral-900">
                    Alert &amp; SLA Notifications
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between text-xs text-neutral-700 cursor-pointer p-2 rounded-xl hover:bg-neutral-100/60 transition-colors">
                    <span>SLA breach warnings (under 24h/48h remaining)</span>
                    <input
                      type="checkbox"
                      checked={formData.notifySla}
                      onChange={(e) => updateField("notifySla", e.target.checked)}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-neutral-700 cursor-pointer p-2 rounded-xl hover:bg-neutral-100/60 transition-colors">
                    <span>Daily retention digest email</span>
                    <input
                      type="checkbox"
                      checked={formData.notifyDailyDigest}
                      onChange={(e) => updateField("notifyDailyDigest", e.target.checked)}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Profile Card Preview */}
              <div className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-2xs flex items-center gap-4">
                <UserAvatar
                  src={formData.avatar}
                  name={formData.fullName || "User"}
                  size="lg"
                  className="w-14 h-14 ring-2 ring-neutral-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-neutral-900 truncate">
                      {formData.fullName || "Your Full Name"}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 uppercase font-mono">
                      {formData.accountLevel}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {formData.email || "user@institutional.edu"}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate mt-1">
                    {formData.accountLevel === "student" && `${formData.degreeProgram} • ${formData.studentId}`}
                    {formData.accountLevel === "faculty" && `${formData.academicTitle} • ${formData.department}`}
                    {formData.accountLevel === "admin" && `${formData.adminDesignation} • Apex Governance`}
                    {formData.accountLevel === "counselor" && `${formData.counselorSpecialization} • ${formData.counselorId}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BUTTONS: CLEAN PURE BLACK & WHITE AESTHETIC */}
        <div className="border-t border-neutral-100 bg-[#FAFAFA] px-6 py-5 sm:px-10">
          {submitError && (
            <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
              {submitError}
            </p>
          )}
          <div className="flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50 transition-all cursor-pointer"
            >
              <CustomArrowLeftIcon className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              Cancel
            </Link>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <span>Continue</span>
              <CustomArrowRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <CustomLoaderIcon className="w-4 h-4" />
                  <span>Configuring Account...</span>
                </>
              ) : (
                <>
                  <CustomSparklesIcon className="w-4 h-4 text-white" />
                  <span>Complete Onboarding &amp; Enter SUTRA</span>
                </>
              )}
            </button>
          )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="text-center pt-8 pb-2 text-[11px] text-neutral-400">
        <p>SUTRA Student Success &amp; Intervention Platform • Institutional SSO &amp; Sovereign AI</p>
      </footer>
    </div>
  );
}
