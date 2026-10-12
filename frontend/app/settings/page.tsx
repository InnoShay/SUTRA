"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Check,
  Lock,
  LogOut,
} from "lucide-react";

export default function SettingsPage() {
  const {
    user,
    updateUser,
    activeRole,
    activeCampusName,
    supabaseSession,
    logout,
  } = useSkillHub();

  const [name, setName] = useState(user.fullName || user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email || "faculty@sutra.edu");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ fullName: name, role });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
          Settings
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile Card */}
      <div className="skill-card bg-white p-5 sm:p-6 md:p-8 space-y-6 border border-neutral-200/80 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 pb-6 border-b border-neutral-100">
          <UserAvatar
            src={user.avatar}
            name={user.fullName || user.name}
            size="xl"
            className="w-16 h-16 ring-4 ring-neutral-100 shadow-sm"
          />
          <div>
            <h3 className="text-lg font-bold text-neutral-900">{user.fullName || user.name}</h3>
            <p className="text-xs text-neutral-500 capitalize">{user.role || activeRole}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                Verified SUTRA Educator
              </span>
              <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                {activeCampusName}
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
