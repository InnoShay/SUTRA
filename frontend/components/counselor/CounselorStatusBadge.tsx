"use client";

import React from "react";
import { CounselorOnboardingStatus } from "@/lib/types";
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert } from "lucide-react";

interface CounselorStatusBadgeProps {
  status?: CounselorOnboardingStatus | string;
  className?: string;
}

export function CounselorStatusBadge({
  status = "PENDING_VERIFICATION",
  className = "",
}: CounselorStatusBadgeProps) {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case "APPROVED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Verified &amp; Approved</span>
        </span>
      );
    case "PENDING_VERIFICATION":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 ${className}`}
        >
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Pending Verification</span>
        </span>
      );
    case "INCOMPLETE":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/70 ${className}`}
        >
          <Clock className="w-3 h-3 text-sky-600" />
          <span>Onboarding Incomplete</span>
        </span>
      );
    case "REJECTED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 ${className}`}
        >
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Verification Rejected</span>
        </span>
      );
    case "SUSPENDED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300/80 ${className}`}
        >
          <ShieldAlert className="w-3 h-3 text-neutral-600" />
          <span>Account Suspended</span>
        </span>
      );
    case "NOT_STARTED":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200/80 ${className}`}
        >
          <AlertTriangle className="w-3 h-3 text-neutral-500" />
          <span>Not Started</span>
        </span>
      );
  }
}

export default CounselorStatusBadge;
