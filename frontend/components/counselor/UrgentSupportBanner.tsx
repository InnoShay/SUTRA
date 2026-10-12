"use client";

import React from "react";
import { ShieldAlert, Phone, ExternalLink } from "lucide-react";

interface UrgentSupportBannerProps {
  onOpenEscalationModal?: () => void;
  className?: string;
}

export function UrgentSupportBanner({
  onOpenEscalationModal,
  className = "",
}: UrgentSupportBannerProps) {
  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl bg-neutral-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-neutral-800 ${className}`}
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white font-heading">
              Institutional Crisis &amp; Emergency Escalation Protocols
            </h4>
            <span className="text-[11px] font-mono text-rose-300 font-semibold">
              • 24/7 Rapid Response
            </span>
          </div>
          <p className="text-xs text-neutral-300 mt-0.5 max-w-xl leading-relaxed">
            For critical student safety, severe psychological distress, or campus emergencies, contact
            the Campus Medical Desk directly at{" "}
            <a
              href="tel:+918023459999"
              className="text-amber-300 hover:text-amber-200 font-semibold underline underline-offset-2"
            >
              +91 80 2345 9999
            </a>{" "}
            or open verified authority coordination.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
        <a
          href="tel:+918023459999"
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Call 24/7 Desk</span>
        </a>
        {onOpenEscalationModal && (
          <button
            type="button"
            onClick={onOpenEscalationModal}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Escalate Case</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default UrgentSupportBanner;
