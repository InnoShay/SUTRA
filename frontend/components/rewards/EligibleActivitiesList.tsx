"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import {
  Coins,
  CheckCircle2,
  Calendar,
  Sparkles,
  BookOpen,
  Users,
  Compass,
  AlertCircle,
  ShieldCheck,
  Heart,
  Loader2,
} from "lucide-react";
import { EligibleActivityDTO } from "@/lib/types";

interface EligibleActivitiesListProps {
  onOpenPulseModal?: () => void;
}

export function EligibleActivitiesList({ onOpenPulseModal }: EligibleActivitiesListProps) {
  const {
    eligibleActivities,
    claimEligibleActivity,
    studentPulseSubmitted,
    pointsTransactions,
  } = useSkillHub();

  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<{ key: string; message: string; isError?: boolean } | null>(null);

  const getActivityIcon = (category: string) => {
    switch (category) {
      case "wellness_pulse":
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-100" />;
      case "micro_challenge":
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case "workshop":
        return <Users className="w-4 h-4 text-blue-600" />;
      case "student_development":
        return <Compass className="w-4 h-4 text-indigo-600" />;
      case "learning_activity":
        return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case "campus_improvement":
        return <Calendar className="w-4 h-4 text-amber-600" />;
      default:
        return <Coins className="w-4 h-4 text-amber-600" />;
    }
  };

  const handleClaim = async (act: EligibleActivityDTO) => {
    if (act.key === "weekly_pulse") {
      if (onOpenPulseModal) {
        onOpenPulseModal();
      }
      return;
    }

    setClaimingKey(act.key);
    setClaimFeedback(null);
    try {
      const res = await claimEligibleActivity(act.key);
      setClaimFeedback({
        key: act.key,
        message: res.message || `+${act.points} points successfully credited!`,
        isError: false,
      });
    } catch (err: any) {
      setClaimFeedback({
        key: act.key,
        message: err?.message || "Failed to verify completion. Please try again later.",
        isError: true,
      });
    } finally {
      setClaimingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Policy Governance Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border border-neutral-200/70 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-neutral-900">
          <ShieldCheck className="w-4 h-4 text-neutral-700" />
          <span>SUTRA Voluntary Participation Rules</span>
        </div>
        <p className="text-neutral-600 leading-relaxed">
          Points recognize voluntary participation in published campus enrichment activities.
          Happiness Pulse participation earns a flat 10 points regardless of your answers. Scores never affect points, rankings, grades, or access to support.
        </p>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {eligibleActivities.map((act) => {
          const isPulse = act.key === "weekly_pulse";
          const isClaimedPulse = isPulse && studentPulseSubmitted;
          const isRecentlyClaimed = pointsTransactions.some(
            (t) => t.activity_or_reward_id === act.key && t.status === "credited"
          );
          const isClaiming = claimingKey === act.key;
          const feedback = claimFeedback?.key === act.key ? claimFeedback : null;

          return (
            <div
              key={act.key}
              className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-neutral-100/80 shrink-0">
                      {getActivityIcon(act.category)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 font-heading">
                        {act.title}
                      </h3>
                      <p className="text-[11px] text-neutral-400 font-medium">
                        {act.frequency_label}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold rounded-lg shrink-0">
                    <Coins className="w-3 h-3 text-amber-600" />
                    <span>+{act.points} pts</span>
                  </span>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  {act.description}
                </p>
              </div>

              {/* Action Area & Feedback */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                {feedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      feedback.isError
                        ? "bg-rose-50 text-rose-800 border border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {feedback.isError ? (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    )}
                    <span className="truncate">{feedback.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-400">
                    {isPulse
                      ? "Confidential check-in"
                      : "Verified participation"}
                  </span>

                  {isClaimedPulse ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Claimed This Week</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleClaim(act)}
                      disabled={isClaiming}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isClaiming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>
                        {isPulse
                          ? "Take Weekly Pulse"
                          : isRecentlyClaimed
                          ? "Verify Participation"
                          : "Claim Participation"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
