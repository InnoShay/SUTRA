"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSkillHub } from "@/lib/store";
import { UserAvatar } from "./UserAvatar";
import {
  X,
  Settings,
  LogOut,
  Building,
  ShieldCheck,
  Mail,
  CheckCircle2,
} from "lucide-react";

interface AccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDialog({ isOpen, onClose }: AccountDialogProps) {
  const router = useRouter();
  const {
    user,
    activeRole,
    activeCampusName,
    supabaseSession,
    logout,
  } = useSkillHub();

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Focus the dialog close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    onClose();
    await logout();
  };

  const handleNavigateSettings = () => {
    onClose();
    router.push("/settings");
  };

  const displayName = user.fullName || user.name || "Educator";
  const displayEmail = user.email || (supabaseSession ? "Google Workspace" : "faculty@sutra.edu");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/35 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <h3
              id="account-dialog-title"
              className="text-sm font-bold text-neutral-900 font-heading"
            >
              Account Information
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            title="Close dialog (Esc)"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Summary */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3.5">
            <UserAvatar
              name={displayName}
              avatarUrl={user.avatar}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-neutral-900 truncate">
                {displayName}
              </h4>
              <p className="text-xs text-neutral-500 truncate flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="truncate">{displayEmail}</span>
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500 font-medium">
                <span className="capitalize">{user.role || activeRole}</span>
                <span className="text-neutral-300">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              </div>
            </div>
          </div>

          {/* Context Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-600">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                <Building className="w-3.5 h-3.5 text-neutral-400" />
                Campus
              </span>
              <span className="font-semibold text-neutral-800 truncate max-w-[170px] text-right">
                {activeCampusName}
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-600 pt-1.5 border-t border-neutral-200/50">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                Environment
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-700">
                <span className={`w-1.5 h-1.5 rounded-full ${supabaseSession ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-amber-400"}`} />
                <span>{supabaseSession ? "Live Mode" : "Demo Mode"}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-600 pt-1.5 border-t border-neutral-200/50">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                Auth Session
              </span>
              <span className="text-[11px] font-medium text-neutral-700">
                {supabaseSession ? "Google SSO Active" : "Local Campus Session"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleNavigateSettings}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Account Settings</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 rounded-2xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountDialog;
