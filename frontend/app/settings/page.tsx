"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { UserAvatar } from "@/components/UserAvatar";
import { CounselorStatusBadge } from "@/components/counselor/CounselorStatusBadge";
import { CounselorOnboardingModal } from "@/components/counselor/CounselorOnboardingModal";
import {
  Palette,
  KeyRound,
  User,
  SlidersHorizontal,
  Bell,
  Languages,
  CircleHelp,
  Lock,
  LogOut,
  Sun,
  Moon,
  Check,
  ShieldCheck,
  HeartHandshake,
  Loader2,
  ExternalLink,
  Sparkles,
  Building,
  CheckCircle2,
} from "lucide-react";

export type SettingsPageTabId =
  | "theme"
  | "credentials"
  | "profile"
  | "preferences"
  | "notifications"
  | "language"
  | "help";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsPageTabId>("theme");
  const {
    user,
    updateUser,
    activeRole,
    activeCampusName,
    supabaseSession,
    logout,
    counselorProfile,
  } = useSkillHub();

  const {
    currentLanguage,
    setLanguage,
    languages,
    translateText,
  } = useLanguage();

  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  // Theme states
  const [selectedTheme, setSelectedTheme] = useState<
    "stark-light" | "github-dark" | "discord-blue" | "sage-forest"
  >("stark-light");
  const [useMonospace, setUseMonospace] = useState(true);
  const [compactDensity, setCompactDensity] = useState(false);

  // Profile states
  const [fullName, setFullName] = useState(user.fullName || user.name || "");
  const [email, setEmail] = useState(user.email || "faculty@sutra.edu");
  const [department, setDepartment] = useState(
    "School of Engineering & Computer Science"
  );
  const [title, setTitle] = useState("Associate Professor & Faculty Advisor");
  const [bio, setBio] = useState(
    "Dedicated to student persistence, early intervention orchestration, and empathetic academic guidance."
  );
  const [profileSaved, setProfileSaved] = useState(false);

  // Workspace Preferences
  const [slaDeadlineHours, setSlaDeadlineHours] = useState("48");
  const [autoDedup, setAutoDedup] = useState(true);
  const [maskStudentPii, setMaskStudentPii] = useState(true);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Notifications
  const [notifSlaAlerts, setNotifSlaAlerts] = useState(true);
  const [notifDailyDigest, setNotifDailyDigest] = useState(true);
  const [notifHighRiskSound, setNotifHighRiskSound] = useState(false);
  const [notifsSaved, setNotifsSaved] = useState(false);

  // Sarvam AI Live Translation Sandbox
  const [testInput, setTestInput] = useState(
    "Student attendance dropped below 75% threshold in Digital Electronics course. Immediate counselor outreach requested."
  );
  const [testOutput, setTestOutput] = useState("");
  const [testTranslating, setTestTranslating] = useState(false);
  const [testLatency, setTestLatency] = useState<number | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ fullName, email });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2200);
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2200);
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifsSaved(true);
    setTimeout(() => setNotifsSaved(false), 2200);
  };

  const handleTestTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testInput.trim()) return;

    setTestTranslating(true);
    const start = performance.now();
    try {
      const res = await translateText(testInput, currentLanguage.code);
      setTestOutput(res);
      setTestLatency(Math.round(performance.now() - start));
    } catch {
      setTestOutput(testInput);
    } finally {
      setTestTranslating(false);
    }
  };

  const navMenuItems: {
    id: SettingsPageTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: "theme", label: "Appearance & Theme", icon: Palette },
    { id: "credentials", label: "AI Credentials", icon: KeyRound, badge: 2 },
    { id: "profile", label: "Profile & Account", icon: User },
    {
      id: "preferences",
      label: "Workspace Preferences",
      icon: SlidersHorizontal,
    },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "language", label: "Indic Languages", icon: Languages, badge: 12 },
    { id: "help", label: "Help & Support", icon: CircleHelp },
  ];

  return (
    <div className="w-full h-full min-h-[640px] bg-white rounded-3xl border border-neutral-200/90 shadow-sm flex flex-col md:flex-row overflow-hidden">
      {/* INTERNAL SIDEBAR NAVBAR */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#FBFBFC] border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Top Internal Header: "SETTINGS MENU" */}
          <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-neutral-100">
            <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase block">
              SETTINGS MENU
            </span>
          </div>

          {/* Menu Items matching user's image styling */}
          <div className="p-2 sm:p-3 overflow-x-auto md:overflow-x-visible no-scrollbar">
            <nav className="flex md:flex-col gap-1">
              {navMenuItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 md:w-full text-left cursor-pointer group ${
                      isSelected
                        ? "bg-black text-white shadow-xs font-bold"
                        : "text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isSelected
                            ? "text-white"
                            : "text-neutral-500 group-hover:text-neutral-900"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ml-2 ${
                          isSelected
                            ? "bg-neutral-800 text-neutral-300"
                            : "bg-neutral-200/70 text-neutral-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Internal Sidebar Card */}
        <div className="p-3 sm:p-4 border-t border-neutral-100 space-y-3">
          <div className="p-3 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-neutral-900 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-neutral-700" />
              <span>AES-256 GCM</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
              Credentials encrypted at rest.
            </p>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* INTERNAL RIGHT CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto p-5 sm:p-7 lg:p-9 space-y-8">
        {/* 1. APPEARANCE & THEME TAB */}
        {activeTab === "theme" && (
          <div className="space-y-8 max-w-3xl">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                Appearance &amp; Interface Theme
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 leading-relaxed">
                Customize your workspace visual aesthetic while adhering to
                strict minimalist high-contrast design principles.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase">
                  SELECT VISUAL THEME
                </span>
                <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Demo Sandbox: All Pro Themes Unlocked
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stark Light */}
                <div
                  onClick={() => setSelectedTheme("stark-light")}
                  className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl cursor-pointer transition-all border ${
                    selectedTheme === "stark-light"
                      ? "border-2 border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/10"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-neutral-700" />
                      <span className="text-xs font-bold text-neutral-900">
                        Stark Light
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                        FREE DEFAULT
                      </span>
                    </div>
                    {selectedTheme === "stark-light" && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="h-16 rounded-xl bg-neutral-50 border border-neutral-150 p-2.5 space-y-2 mb-3">
                    <div className="w-10 h-2 bg-neutral-900 rounded" />
                    <div className="w-16 h-1.5 bg-neutral-400 rounded" />
                    <div className="w-full h-2 bg-neutral-200/70 rounded" />
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Clean white background, sharp black contrasts, and crisp
                    subtle borders.
                  </p>
                </div>

                {/* GitHub Dark */}
                <div
                  onClick={() => setSelectedTheme("github-dark")}
                  className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl cursor-pointer transition-all border ${
                    selectedTheme === "github-dark"
                      ? "border-2 border-emerald-500 bg-[#161b22] text-white shadow-md"
                      : "border-neutral-800 bg-[#161b22] text-white hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        GitHub Dark
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-emerald-400">
                        PRO TIER
                      </span>
                    </div>
                    {selectedTheme === "github-dark" && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="h-16 rounded-xl bg-[#0d1117] border border-neutral-800 p-2.5 space-y-2 mb-3">
                    <div className="w-10 h-2 bg-emerald-500 rounded" />
                    <div className="w-16 h-1.5 bg-neutral-500 rounded" />
                    <div className="w-full h-2 bg-neutral-800 rounded" />
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">
                    Official GitHub dark colorway with dim charcoal canvas and
                    green status accents.
                  </p>
                </div>

                {/* Discord Blue */}
                <div
                  onClick={() => setSelectedTheme("discord-blue")}
                  className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl cursor-pointer transition-all border ${
                    selectedTheme === "discord-blue"
                      ? "border-2 border-emerald-500 bg-[#313338] text-white shadow-md"
                      : "border-neutral-700 bg-[#313338] text-white hover:border-neutral-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">
                        Discord Blue
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-700 text-indigo-300">
                        PRO TIER
                      </span>
                    </div>
                    {selectedTheme === "discord-blue" && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="h-16 rounded-xl bg-[#2b2d31] border border-neutral-700 p-2.5 space-y-2 mb-3">
                    <div className="w-10 h-2 bg-indigo-500 rounded" />
                    <div className="w-16 h-1.5 bg-neutral-400 rounded" />
                    <div className="w-full h-2 bg-neutral-700 rounded" />
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">
                    Bluish-gray palette inspired by Discord desktop for
                    high-density team room chats.
                  </p>
                </div>

                {/* Sage & Forest */}
                <div
                  onClick={() => setSelectedTheme("sage-forest")}
                  className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl cursor-pointer transition-all border ${
                    selectedTheme === "sage-forest"
                      ? "border-2 border-emerald-500 bg-[#1c2826] text-white shadow-md"
                      : "border-emerald-900 bg-[#1c2826] text-white hover:border-emerald-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        Sage &amp; Forest
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">
                        PRO TIER
                      </span>
                    </div>
                    {selectedTheme === "sage-forest" && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="h-16 rounded-xl bg-[#141f1d] border border-emerald-900/60 p-2.5 space-y-2 mb-3">
                    <div className="w-10 h-2 bg-emerald-400 rounded" />
                    <div className="w-16 h-1.5 bg-neutral-400 rounded" />
                    <div className="w-full h-2 bg-emerald-950 rounded" />
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-snug">
                    Calm, earthy dark green aesthetic designed for low
                    eye-strain research.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-mono font-bold tracking-widest text-neutral-500 uppercase block">
                TYPOGRAPHY &amp; CODE DISPLAY
              </span>
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/90 space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">
                      Use Monospace for AI Code Blocks
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-0.5">
                      Render code responses using high-precision font stacks.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useMonospace}
                    onChange={(e) => setUseMonospace(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
                <div className="h-px bg-neutral-100" />
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">
                      Compact Chat Density
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-0.5">
                      Decrease padding between messages to show more
                      conversation context.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={compactDensity}
                    onChange={(e) => setCompactDensity(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 2. AI CREDENTIALS TAB */}
        {activeTab === "credentials" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                AI Credentials &amp; Model Serving
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                Manage bounded machine learning checkpoints, Platt calibration
                parameters, and Sarvam AI credentials.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-neutral-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-neutral-900">
                      OULAD Day-30 Logistic Regression (v1.0.0)
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Platt-calibrated threshold:{" "}
                    <strong className="text-neutral-800 font-mono">0.46</strong>{" "}
                    • 25-feature Day-30 vector
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  sha256:78a0...f41f
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-neutral-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-neutral-900">
                      Sarvam AI Translation API Gateway
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                      CONNECTED
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    12 Scheduled Indic Languages • Low latency (~12ms)
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  srvm_live_•••••••921c
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-neutral-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-neutral-900">
                      Supabase Cloud Authentication &amp; Storage
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {supabaseSession ? "JWT ACTIVE" : "LOCAL DEMO"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Row-Level Security (RLS) and ADR-004 Privacy Boundary
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  sutra-app-prod
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. PROFILE TAB */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                Profile &amp; Institutional Identity
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                Manage your public educator identity, departmental
                affiliations, and contact details.
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
              <UserAvatar
                src={user.avatar}
                name={fullName || "Educator"}
                size="lg"
                className="w-14 h-14 ring-4 ring-white shadow-xs shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-neutral-900">
                  {fullName || "Educator"}
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">{email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 uppercase">
                    Role: {user.role || activeRole}
                  </span>
                  {activeCampusName && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200 flex items-center gap-1">
                      <Building className="w-2.5 h-2.5" />
                      <span>{activeCampusName}</span>
                    </span>
                  )}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>SSO Verified</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Counselor & Mentorship Onboarding Status */}
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-neutral-700" />
                  <span className="text-xs font-bold text-neutral-900">
                    Counselor &amp; Mentor Certification
                  </span>
                </div>
                <CounselorStatusBadge
                  status={counselorProfile?.onboarding_status || "NOT_STARTED"}
                />
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Certified counselors receive authority to triage Tier-2 risk
                signals and execute scheduled wellness check-ins.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsOnboardingModalOpen(true)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {counselorProfile?.onboarding_status === "APPROVED"
                      ? "Update Counselor Profile"
                      : "Launch Onboarding Wizard"}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-neutral-700">
                  Academic Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-neutral-700">
                  Academic Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-neutral-700">
                  Advisor Notes &amp; Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {profileSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Profile Saved</span>
                  </>
                ) : (
                  <span>Save Profile Changes</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 4. WORKSPACE PREFERENCES TAB */}
        {activeTab === "preferences" && (
          <form
            onSubmit={handleSavePreferences}
            className="space-y-6 max-w-2xl"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                Workspace &amp; Triage Preferences
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                Set up resolution standards, SLA escalation clocks, and student
                privacy boundaries.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200 space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block">
                  Default Initial Triage SLA Window
                </label>
                <p className="text-[11px] text-neutral-500 mb-2">
                  Hours allotted to an assigned mentor before transactional
                  outbox raises an escalation flag.
                </p>
                <select
                  value={slaDeadlineHours}
                  onChange={(e) => setSlaDeadlineHours(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 text-xs font-bold bg-white text-neutral-900 focus:outline-none"
                >
                  <option value="24">24 Hours (Accelerated Urgent SLA)</option>
                  <option value="48">48 Hours (Standard SUTRA PS6 SLA)</option>
                  <option value="72">72 Hours (Extended Pilot SLA)</option>
                </select>
              </div>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    Strict Duplicate Signal Deduplication
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Prevent repetitive warnings from spamming mentor queues
                    within a 7-day period.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoDedup}
                  onChange={(e) => setAutoDedup(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    Student Identity Pseudonymization
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Mask student identifiers with cryptographic tokens until
                    case ownership is formally accepted.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={maskStudentPii}
                  onChange={(e) => setMaskStudentPii(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
                />
              </label>
            </div>

            {/* Admin User & Role Governance */}
            {(activeRole === "admin" || activeRole === "superadmin") && (
              <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-neutral-800" />
                    <span className="text-xs font-bold text-neutral-900">
                      User &amp; Access Governance (3-Role Security Model)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ACTIVE
                  </span>
                </div>
                <div className="text-xs text-neutral-600 leading-relaxed space-y-1.5">
                  <p>
                    <strong className="text-neutral-900">Student:</strong>{" "}
                    Self-service portal, personal cases (`/cases`), and support
                    requests (`/request-support`). Isolated to personal records.
                  </p>
                  <p>
                    <strong className="text-neutral-900">Staff / Faculty:</strong>{" "}
                    Course instructors, triage queues, case management, and
                    student check-ins.
                  </p>
                  <p>
                    <strong className="text-neutral-900">Admin:</strong> User
                    provisioning, audit queue, case assignment oversight, and
                    institutional analytics.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {prefsSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Preferences Saved</span>
                  </>
                ) : (
                  <span>Save Workspace Defaults</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 5. NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <form
            onSubmit={handleSaveNotifications}
            className="space-y-6 max-w-2xl"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                Notification Preferences
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                Control SLA breach alarms, morning digest deliveries, and
                critical signals.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    48-Hour SLA Breach Escalations
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Instant notifications when unacknowledged cases approach
                    deadline.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifSlaAlerts}
                  onChange={(e) => setNotifSlaAlerts(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    Morning Cohort Triage Digest
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Daily 8:00 AM summary of newly ingested risk observations.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifDailyDigest}
                  onChange={(e) => setNotifDailyDigest(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">
                    Audio Cue on Critical Signal
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    Play chime when urgent high-risk observation (Score &gt;
                    0.65) is routed.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifHighRiskSound}
                  onChange={(e) => setNotifHighRiskSound(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {notifsSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save Notifications</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 6. INDIC LANGUAGES TAB */}
        {activeTab === "language" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                Indic Regional Languages (Sarvam AI)
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                SUTRA translates the institutional console into 12 scheduled
                Indian languages for empathetic student communications.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {languages.map((lang) => {
                const isSelected = currentLanguage.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-black text-white border-black shadow-sm font-bold"
                        : "bg-[#F8F9FA] hover:bg-white text-neutral-800 border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{lang.name}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#d2f831]" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] block mt-1 ${
                        isSelected ? "text-neutral-300" : "text-neutral-500"
                      }`}
                    >
                      {lang.nativeName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Translation Sandbox */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FA] border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900">
                  Live Sarvam AI Sandbox ({currentLanguage.name})
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {testLatency ? `${testLatency}ms` : "Real-time"}
                </span>
              </div>

              <textarea
                rows={2}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="w-full p-3 rounded-xl border border-neutral-200 text-xs bg-white text-neutral-900 focus:outline-none"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleTestTranslate()}
                  disabled={testTranslating}
                  className="px-4 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {testTranslating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Translating...</span>
                    </>
                  ) : (
                    <span>Test Translation</span>
                  )}
                </button>
              </div>

              {testOutput && (
                <div className="p-3 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900 font-medium">
                  {testOutput}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. HELP & SUPPORT TAB */}
        {activeTab === "help" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
                Help &amp; Institutional Knowledge
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
                Official handbooks, keyboard shortcuts, and direct support lines.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/help"
                className="p-4 rounded-2xl bg-neutral-900 text-white hover:bg-neutral-800 transition-all flex items-center justify-between group"
              >
                <div>
                  <h5 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Official Student &amp; Faculty Help Center
                  </h5>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Interactive FAQs, instant support tickets, and escalation
                    contacts.
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-emerald-300 transition-colors" />
              </Link>

              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-[#F8F9FA] hover:bg-white border border-neutral-200 transition-all flex items-center justify-between group"
              >
                <div>
                  <h5 className="text-xs font-bold text-neutral-900 group-hover:text-sky-600 transition-colors">
                    SUTRA 10-State Case Machine Manual
                  </h5>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Detailed guide to transitions and closure proof
                    verification.
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-sky-600 transition-colors" />
              </a>

              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-[#F8F9FA] hover:bg-white border border-neutral-200 transition-all flex items-center justify-between group"
              >
                <div>
                  <h5 className="text-xs font-bold text-neutral-900 group-hover:text-sky-600 transition-colors">
                    FERPA &amp; Institutional Compliance Guide
                  </h5>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Cryptographic evidence cards and Zero-Trust boundary rules.
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-sky-600 transition-colors" />
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 text-white flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-white">
                  Campus IT Helpdesk
                </h5>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Contact: support@sutra.edu
                </p>
              </div>
              <a
                href="mailto:support@sutra.edu"
                className="px-4 py-2 rounded-xl bg-white text-neutral-950 text-xs font-bold hover:bg-[#d2f831] transition-colors"
              >
                Email Support
              </a>
            </div>
          </div>
        )}
      </main>

      <CounselorOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
      />
    </div>
  );
}
