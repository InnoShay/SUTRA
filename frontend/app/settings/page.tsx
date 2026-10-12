"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { DEMO_PERSONAS, DEMO_CAMPUS_ID } from "@/lib/demo-auth";
import { UserRole } from "@/lib/types";
import { UserAvatar } from "@/components/UserAvatar";
import {
  User,
  Bell,
  Shield,
  Key,
  Check,
  Copy,
  Activity,
  Layers,
  Lock,
  Server,
  LogOut,
  Languages,
  Sparkles,
  Globe2,
  Send,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function SettingsPage() {
  const {
    currentLanguage,
    setLanguage,
    languages,
    translateText,
    isTranslating,
  } = useLanguage();

  const {
    user,
    updateUser,
    activeRole,
    setActiveRole,
    activeCampusName,
    currentPersona,
    backendConnected,
    backendError,
    supabaseSession,
    logout,
  } = useSkillHub();

  const [name, setName] = useState(user.fullName || user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email || "faculty@sutra.edu");
  const [saved, setSaved] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Sarvam AI Live Translation Sandbox states
  const [testInput, setTestInput] = useState(
    "Student attendance dropped below 75% threshold in Digital Electronics course. Immediate counselor outreach requested."
  );
  const [testOutput, setTestOutput] = useState("");
  const [testTranslating, setTestTranslating] = useState(false);
  const [testLatency, setTestLatency] = useState<number | null>(null);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ fullName: name, role });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyToken = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentPersona.token);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const rolesList: { id: UserRole; name: string; desc: string }[] = [
    { id: "faculty", name: "Faculty Lead", desc: "Triage signals, assign academic tutoring" },
    { id: "counselor", name: "Counselor", desc: "Wellbeing cases, confidential referrals" },
    { id: "dean", name: "Academic Dean", desc: "Oversee cases, policy versions, escalations" },
    { id: "leadership", name: "Executive Leadership", desc: "Cohort KPIs only (ADR-004 privacy enforced)" },
    { id: "superadmin", name: "Superadmin", desc: "Full multi-campus root access" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
          Settings &amp; Multi-Campus Security
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Manage educator profile, campus scoping context, and verified Supabase Auth credentials
        </p>
      </div>

      {/* SUTRA Multi-Campus & Auth Security Inspector */}
      <div className="skill-card bg-white p-5 sm:p-6 md:p-8 space-y-5 border border-neutral-200/80 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-neutral-900" />
            <h3 className="text-base font-bold text-neutral-900 font-heading">
              SUTRA Campus &amp; Authorization Context
            </h3>
          </div>
        </div>

        {/* Persona Switcher */}
        <div>
          <label className="text-xs font-bold text-neutral-800 block mb-2">
            Switch Demo Persona (Sets Cryptographically Signed JWT Token)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {rolesList.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => setActiveRole(r.id)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  activeRole === r.id
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                    : "bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200/60"
                }`}
              >
                <div className="text-xs font-bold">{r.name}</div>
                <div
                  className={`text-[10px] mt-0.5 line-clamp-1 ${
                    activeRole === r.id ? "text-neutral-300" : "text-neutral-400"
                  }`}
                >
                  {r.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Security Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
              Active Campus UUID (X-Campus-Id)
            </span>
            <span className="font-mono text-neutral-800 block text-[11px] truncate">
              {DEMO_CAMPUS_ID}
            </span>
            <span className="text-[10px] text-neutral-400 block">
              {activeCampusName}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">
              Institutional Privacy Safeguard
            </span>
            <span className="font-semibold text-neutral-800 block">
              {activeRole === "leadership"
                ? "ADR-004 Active (Individual Profiles Restricted)"
                : "Operational Role (Case & Signal Access Granted)"}
            </span>
            <span className="text-[10px] text-neutral-400 block">
              Enforced at FastAPI backend layer
            </span>
          </div>
        </div>

        {/* JWT Inspector */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-neutral-400" /> Active Supabase Bearer JWT
            </span>
            <button
              onClick={handleCopyToken}
              className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 font-semibold"
            >
              {tokenCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Token</span>
                </>
              )}
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-neutral-900 text-neutral-300 font-mono text-[10px] truncate select-all">
            {currentPersona.token}
          </div>
        </div>
      </div>

      {/* Indic Regional Languages & Sarvam AI Translation Engine */}
      <div className="skill-card bg-white p-5 sm:p-6 md:p-8 space-y-6 border border-neutral-200/80 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Languages className="w-5 h-5 text-neutral-900" />
            <div>
              <h3 className="text-base font-bold text-neutral-900 font-heading">
                Indic Regional Languages
              </h3>
              <p className="text-xs text-neutral-400">
                Institutional interface translated into 12 scheduled Indian languages using Sarvam AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200/60 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Powered by Sarvam AI
            </span>
          </div>
        </div>

        {/* Language Grid */}
        <div>
          <label className="text-xs font-bold text-neutral-800 block mb-2.5">
            Select Active Regional Language (Instant App-wide Translation)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {languages.map((lang) => {
              const isSelected = currentLanguage.code === lang.code;
              return (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => setLanguage(lang)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-900/10"
                      : "bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200/60"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold">{lang.nativeName}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <div
                    className={`text-xs font-medium mt-0.5 ${
                      isSelected ? "text-neutral-300" : "text-neutral-700"
                    }`}
                  >
                    {lang.name}
                  </div>
                  <div
                    className={`text-[10px] mt-1 truncate ${
                      isSelected ? "text-neutral-400" : "text-neutral-400"
                    }`}
                  >
                    {lang.region}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Translation Playground for Sarvam AI Manual Testing */}
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-neutral-700" />
              <span className="text-xs font-bold text-neutral-900">
                Live Sarvam AI Neural Translation Sandbox
              </span>
            </div>
            {testLatency !== null && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-200/60 text-neutral-700 font-semibold">
                Latency: {testLatency}ms
              </span>
            )}
          </div>

          <p className="text-xs text-neutral-500">
            Type any academic notice, intervention alert, or counseling message in English below to test real-time translation into <span className="font-semibold text-neutral-800">{currentLanguage.name} ({currentLanguage.nativeName})</span>.
          </p>

          <form onSubmit={handleTestTranslate} className="space-y-3">
            <div>
              <textarea
                rows={2}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter text in English to translate..."
                className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setTestInput(
                      "Student attendance dropped below 75% threshold in Digital Electronics course. Immediate counselor outreach requested."
                    )
                  }
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-neutral-200/50 hover:bg-neutral-200 text-neutral-700 transition-colors"
                >
                  Prompt 1: Attendance Alert
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTestInput(
                      "Midterm examination rescheduled to next Monday. Please confirm your lab evaluation timetable."
                    )
                  }
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-neutral-200/50 hover:bg-neutral-200 text-neutral-700 transition-colors"
                >
                  Prompt 2: Exam Timetable
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTestInput(
                      "No Alert Without Action: Every flagged signal must be resolved within the 48-hour institutional SLA."
                    )
                  }
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-neutral-200/50 hover:bg-neutral-200 text-neutral-700 transition-colors"
                >
                  Prompt 3: Sutra Principle
                </button>
              </div>

              <button
                type="submit"
                disabled={testTranslating || !testInput.trim()}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto"
              >
                {testTranslating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Translating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Translate with Sarvam AI</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Translation Result Output Box */}
          {testOutput && (
            <div className="p-3.5 rounded-xl bg-white border border-emerald-200/80 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> Translated to {currentLanguage.nativeName} ({currentLanguage.name})
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  sarvam-translate • {currentLanguage.code}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-900 font-medium leading-relaxed">
                {testOutput}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="skill-card bg-white p-5 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 pb-6 border-b border-neutral-100">
          <UserAvatar
            src={user.avatar}
            name={user.fullName || user.name}
            className="w-16 h-16 ring-4 ring-neutral-100 shadow-sm"
          />
          <div>
            <h3 className="text-lg font-bold text-neutral-900">{user.fullName || user.name}</h3>
            <p className="text-xs text-neutral-400">{user.role}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                Verified SUTRA Educator
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Persona: {activeRole.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all min-h-[44px]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
              Educator Bio
            </label>
            <textarea
              rows={3}
              defaultValue="Faculty educator & case reviewer participating in CODEX 3.0 SUTRA Student Success & Intervention Orchestration Engine."
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">
              Campus authorization credentials checked on every API call
            </span>
            <button
              type="submit"
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 min-h-[44px] self-start sm:self-auto"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Changes Saved</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Session Management & Sign Out */}
      <div className="skill-card bg-white p-5 sm:p-6 md:p-8 space-y-4 border border-neutral-200/80 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-neutral-900" />
            <h3 className="text-base font-bold text-neutral-900 font-heading">
              Session Management &amp; Security
            </h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-neutral-100 rounded-full text-neutral-700">
            {supabaseSession ? "Google Workspace Active" : "Local Demo Session"}
          </span>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed">
          Signing out terminates your active session token in Supabase Auth, clears institutional credentials from browser storage, and returns you to the login screen.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-neutral-100">
          <div className="text-xs text-neutral-400">
            Current account: <span className="font-semibold text-neutral-800">{user.email || user.fullName}</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] border border-rose-200 text-rose-700 rounded-full text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Sign Out of SUTRA</span>
          </button>
        </div>
      </div>
    </div>
  );
}
