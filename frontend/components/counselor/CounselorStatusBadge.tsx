"use client";

import React from "react";
import { CounselorOnboardingStatus } from "@/lib/types";

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
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-neutral-900 border border-neutral-300 ${className}`}
        >
          Verified &amp; Approved
        </span>
      );
    case "PENDING_VERIFICATION":
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-300 ${className}`}
        >
          Pending Verification
        </span>
      );
    case "INCOMPLETE":
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300 ${className}`}
        >
          Onboarding Incomplete
        </span>
      );
    case "REJECTED":
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 ${className}`}
        >
          Verification Rejected
        </span>
      );
    case "SUSPENDED":
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-600 text-white ${className}`}
        >
          Account Suspended
        </span>
      );
    case "NOT_STARTED":
    default:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 ${className}`}
        >
          Not Started
        </span>
      );
  }
}

export default CounselorStatusBadge;
