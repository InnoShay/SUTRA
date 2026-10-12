"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSkillHub } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { UserAvatar } from "./UserAvatar";
import {
  User,
  Languages,
  Bell,
  ShieldCheck,
  CircleHelp,
  LogOut,
  X,
  Check,
  Mail,
  Send,
  Loader2,
  ExternalLink,
  Lock,
  Building
} from "lucide-react";

export type SettingsTabId =
  | "profile"
  | "language"
  | "alerts"
  | "security"
  | "help";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
}

export function UserSettingsModal({
  isOpen,
  onClose,
  initialTab = "profile",
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const {
    user,
    updateUser,
    activeRole,
    activeCampusName,
    supabaseSession,
    logout,
  } = useSkillHub();

  const {
    currentLanguage,
    setLanguage,
    languages,
    translateText,
  } = useLanguage();

  // Profile Form States
  const [fullName, setFullName] = useState(user.fullName || user.name || "Prof. Ananya Sharma");
  const [email, setEmail] = useState(user.email || "faculty@sutra.edu");
  const [department, setDepartment] = useState("School of Engineering & Computer Science");
  const [title, setTitle] = useState("Associate Professor & Faculty Advisor");
  const [bio, setBio] = useState(
    "Dedicated to student persistence, early intervention orchestration, and empathetic academic guidance."
  );
  const [profileSaved, setProfileSaved] = useState(false);

  // Notification / Alert Toggles
  const [notifSlaAlerts, setNotifSlaAlerts] = useState(true);
  const [notifDailyDigest, setNotifDailyDigest] = useState(true);
  const [notifHighRiskSound, setNotifHighRiskSound] = useState(false);
  const [notifHandoffs, setNotifHandoffs] = useState(true);
  const [notifsSaved, setNotifsSaved] = useState(false);

  // Translation testbed
  const [testInput, setTestInput] = useState(
    "Student attendance dropped below 75% threshold in Digital Electronics course. Immediate counselor outreach requested."
  );
  const [testOutput, setTestOutput] = useState("");
  const [testTranslating, setTestTranslating] = useState(false);
  const [testLatency, setTestLatency] = useState<number | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (user.fullName || user.name) {
      setFullName(user.fullName || user.name || "Prof. Ananya Sharma");
    }
    if (user.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ fullName, email });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2200);
  };

  const handleSaveAlerts = (e: React.FormEvent) => {
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

  const handleSignOut = async () => {
    onClose();
    await logout();
  };

  const navMenuItems: {
    id: SettingsTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "profile", label: "Profile & Account", icon: User },
    { id: "language", label: "Indic Languages", icon: Languages },
    { id: "alerts", label: "Alerts & SLAs", icon: Bell },
    { id: "security", label: "Security & Tenancy", icon: ShieldCheck },
    { id: "help", label: "Help & Knowledge", icon: CircleHelp },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="User Settings"
        className="w-full max-w-5xl h-[92vh] max-h-[720px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-200/90 flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* INTERNAL SIDEBAR NAVBAR */}
        <aside className="w-full md:w-64 lg:w-72 bg-[#F8F9FA] border-b md:border-b-0 md:border-r border-neutral-200/80 flex flex-col justify-between shrink-0 select-none">
          <div>
            {/* Top User Profile Header inside sidebar */}
            <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-neutral-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar
                  src={user.avatar}
                  name={fullName || "Prof. Ananya Sharma"}
                  size="md"
                  className="w-10 h-10 ring-2 ring-white shadow-2xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-neutral-900 truncate">
                    {fullName || "Prof. Ananya Sharma"}
                  </h3>
                  <p className="text-[11px] text-neutral-400 truncate">
                    Course Instructor &amp; Faculty Mentor ...
                  </p>
                </div>
              </div>

              {/* Close Button on Mobile in Header */}
              <button
                type="button"
                onClick={onClose}
                className="md:hidden p-1.5 rounded-full hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-700 transition-colors"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-2 sm:p-3 overflow-x-auto md:overflow-x-visible no-scrollbar">
              <span className="hidden md:block text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3.5 py-1.5 mb-1 font-mono">
                USER SETTINGS
              </span>
              <nav className="flex md:flex-col gap-1">
                {navMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 md:w-full text-left cursor-pointer ${
                        isSelected
                          ? "bg-white text-neutral-950 shadow-xs border border-neutral-200/80 font-bold"
                          : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isSelected ? "text-neutral-950" : "text-neutral-400"
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Bottom Sidebar Action: Campus & Sign Out */}
          <div className="flex flex-col gap-2 p-3 sm:p-4 border-t border-neutral-200/70 bg-neutral-100/40">
            <div className="flex items-center justify-between text-[11px] text-neutral-500 px-2 py-1">
              <span className="truncate max-w-[150px] font-medium">
                {activeCampusName || "Apex University Main Ca..."}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 border border-transparent hover:border-rose-200/60 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* INTERNAL RIGHT CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          {/* Top Bar with Title & Desktop Close Button */}
          <div className="hidden md:flex items-center justify-between px-6 lg:px-8 py-4 border-b border-neutral-100 bg-white/70 backdrop-blur-xs shrink-0">
            <div>
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                {activeTab === "profile" && "Profile & Account"}
                {activeTab === "language" && "Indic Languages"}
                {activeTab === "alerts" && "Alerts & SLAs"}
                {activeTab === "security" && "Security & Tenancy"}
                {activeTab === "help" && "Help & Knowledge"}
              </h2>
              <p className="text-[11px] text-neutral-400">
                Institutional configuration and educator preferences
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Tab Content View */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* 1. PROFILE & ACCOUNT TAB (Matched to user screenshot!) */}
            {activeTab === "profile" && (
              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
                {/* Profile Avatar Card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50/80 border border-neutral-100">
                  <UserAvatar
                    src={user.avatar}
                    name={fullName}
                    size="lg"
                    className="w-14 h-14 ring-4 ring-white shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-neutral-900">{fullName}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">{email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-neutral-500 font-medium">
                      <span>Faculty Mentor</span>
                      <span className="text-neutral-300">•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Check className="w-3 h-3" />
                        <span>SSO Verified</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                        placeholder="faculty@sutra.edu"
                        required
                      />
                      <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-neutral-700">Academic Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      placeholder="School of Engineering & Computer Science"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-neutral-700">Academic Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                      placeholder="Associate Professor & Faculty Advisor"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-neutral-700">Advisor Notes &amp; Bio</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white resize-none leading-relaxed"
                      placeholder="Dedicated to student persistence, early intervention orchestration, and empathetic academic guidance."
                    />
                  </div>
                </div>

                {/* Footer with Save Button */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-neutral-400">
                    Changes take effect across case handoffs and student notes.
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {profileSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Saved Successfully</span>
                      </>
                    ) : (
                      <span>Save Profile Changes</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 2. INDIC LANGUAGES TAB */}
            {activeTab === "language" && (
              <div className="space-y-6 max-w-3xl">
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
                            ? "bg-neutral-950 text-white border-neutral-950 shadow-sm"
                            : "bg-[#F8F9FA] hover:bg-white text-neutral-800 border-neutral-200/80 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{lang.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#d2f831]" />}
                        </div>
                        <span className={`text-[11px] block mt-1 ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                          {lang.nativeName}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Translation Sandbox */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">
                      Live Translation Sandbox ({currentLanguage.name})
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {testLatency ? `${testLatency}ms` : "Sarvam AI"}
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

            {/* 3. ALERTS & SLAS TAB */}
            {activeTab === "alerts" && (
              <form onSubmit={handleSaveAlerts} className="space-y-6 max-w-2xl">
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 cursor-pointer hover:bg-white transition-all">
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">
                        48-Hour SLA Breach Escalations
                      </span>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Instant notifications when unacknowledged cases approach deadline.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifSlaAlerts}
                      onChange={(e) => setNotifSlaAlerts(e.target.checked)}
                      className="w-4 h-4 accent-neutral-900 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 cursor-pointer hover:bg-white transition-all">
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

                  <label className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 cursor-pointer hover:bg-white transition-all">
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">
                        Audio Cue on Critical Signal
                      </span>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Play chime when urgent high-risk observation (Score &gt; 0.65) is routed.
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
                      <span>Save Notification Preferences</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 4. SECURITY & TENANCY TAB */}
            {activeTab === "security" && (
              <div className="space-y-6 max-w-2xl">
                <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-500 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-neutral-400" />
                      Active Campus Tenancy
                    </span>
                    <span className="font-bold text-neutral-900">{activeCampusName}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60">
                    <span className="font-medium text-neutral-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Authentication Mode
                    </span>
                    <span className="font-mono text-neutral-800 text-[11px] font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {supabaseSession ? "Supabase JWT (SSO)" : "Local Campus Session"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-neutral-100 text-neutral-800 shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-neutral-900">
                        ADR-003: Financial Data Segregation
                      </h5>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Tuition arrears and bursar holds are isolated in a segregated schema to protect student dignity.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-neutral-100 text-neutral-800 shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-neutral-900">
                        ADR-004: Executive Queue Privacy Guard
                      </h5>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        High-sensitivity wellness and disciplinary incidents route exclusively to authorized deans.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. HELP & KNOWLEDGE TAB */}
            {activeTab === "help" && (
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-3">
                  <a
                    href="/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-[#F8F9FA] hover:bg-white border border-neutral-200/80 hover:border-neutral-300 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-neutral-900 group-hover:text-sky-600 transition-colors">
                        SUTRA 10-State Case Machine Manual
                      </h5>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Detailed guide to transitions and closure proof verification.
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-sky-600 transition-colors" />
                  </a>

                  <a
                    href="/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-[#F8F9FA] hover:bg-white border border-neutral-200/80 hover:border-neutral-300 transition-all flex items-center justify-between group"
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
                    <h5 className="text-xs font-bold text-white">Campus IT Helpdesk</h5>
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

          </div>
        </main>
      </div>
    </div>
  );
}

export default UserSettingsModal;
