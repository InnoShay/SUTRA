"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { DEMO_PERSONAS, DEMO_CAMPUS_ID } from "@/lib/demo-auth";
import { UserRole } from "@/lib/types";
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
} from "lucide-react";

export default function SettingsPage() {
  const {
    user,
    updateUser,
    activeRole,
    setActiveRole,
    activeCampusName,
    currentPersona,
    backendConnected,
    backendError,
  } = useSkillHub();

  const [name, setName] = useState(user.fullName || user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email || "faculty@sutra.edu");
  const [saved, setSaved] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

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
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              backendConnected
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-amber-50 text-amber-700 border border-amber-200/60"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>{backendConnected ? "FastAPI Online" : "Demo Mode"}</span>
          </span>
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

      {/* Profile Card */}
      <div className="skill-card bg-white p-5 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 pb-6 border-b border-neutral-100">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullName || user.name}
              className="w-16 h-16 rounded-full object-cover ring-4 ring-neutral-100 flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-xl ring-4 ring-neutral-100 flex-shrink-0">
              {(user.fullName || user.name || "U").charAt(0).toUpperCase()}
            </div>
          )}
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
    </div>
  );
}
