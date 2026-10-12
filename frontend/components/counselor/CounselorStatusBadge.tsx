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
          className={`inline-block text-[11px] font-mono text-neutral-600 border border-neutral-200 px-2 py-0.5 rounded ${className}`}
        >
          Verified
        </span>
      );
    case "PENDING_VERIFICATION":
      return (
        <span
          className={`inline-block text-[11px] font-mono text-neutral-600 border border-neutral-200 px-2 py-0.5 rounded ${className}`}
        >
          Pending
        </span>
      );
    case "INCOMPLETE":
      return (
        <span
          className={`inline-block text-[11px] font-mono text-neutral-600 border border-neutral-200 px-2 py-0.5 rounded ${className}`}
        >
          Incomplete
        </span>
      );
    case "REJECTED":
      return (
        <span
          className={`inline-block text-[11px] font-mono text-neutral-900 border border-neutral-900 px-2 py-0.5 rounded ${className}`}
        >
          Rejected
        </span>
      );
    case "SUSPENDED":
      return (
        <span
          className={`inline-block text-[11px] font-mono text-neutral-900 border border-neutral-900 px-2 py-0.5 rounded ${className}`}
        >
          Suspended
        </span>
      );
    case "NOT_STARTED":
    default:
      return (
        <span
          className={`inline-block text-[11px] font-mono text-neutral-400 border border-neutral-200 px-2 py-0.5 rounded ${className}`}
        >
          Not Started
        </span>
      );
  }
}

export default CounselorStatusBadge;
