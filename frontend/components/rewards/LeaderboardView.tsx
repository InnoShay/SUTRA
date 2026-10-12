"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { LeaderboardPeriod } from "@/lib/types";
import {
  computeRewardProgress,
  resolveNextRewardTarget,
  computePrivateRankChange,
} from "@/lib/rewardsScoring";
import {
  Trophy,
  Award,
  Calendar,
  Lock,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Gift,
  ArrowRight,
  Info,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export function LeaderboardView() {
  const {
    myPrivateRankWeekly,
    myPrivateRankMonthly,
    pointsWallet,
    rewardsCatalog,
  } = useSkillHub();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");

  const currentRankData =
    period === "weekly" ? myPrivateRankWeekly : myPrivateRankMonthly;

  const currentRank = currentRankData?.current_rank ?? (period === "weekly" ? 12 : 8);
  const previousRank = currentRankData?.previous_rank ?? (period === "weekly" ? 14 : 10);
  const rankChange =
    currentRankData?.rank_change !== undefined && currentRankData?.rank_change !== null
      ? currentRankData.rank_change
      : computePrivateRankChange(currentRank, previousRank);

  const periodPoints =
    currentRankData?.period_points ??
    (period === "weekly"
      ? pointsWallet?.points_this_week ?? 85
      : pointsWallet?.points_this_month ?? 210);

  const availableBalance = pointsWallet?.available_balance ?? 385;
  const lifetimeEarned =
    currentRankData?.total_lifetime_points ?? pointsWallet?.total_earned ?? 485;

  const nextRewardTarget = resolveNextRewardTarget(availableBalance, rewardsCatalog);
  const nextRewardName =
    currentRankData?.next_reward_name || nextRewardTarget.title || "College merchandise";
  const targetCost = nextRewardTarget.points_cost || 500;
  const { progressPercent, pointsNeeded } = computeRewardProgress(
    availableBalance,
    targetCost
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with Period Switcher and Mode Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight font-heading">
              My Progress
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Lock className="w-3 h-3 text-emerald-700" />
              <span>Strictly Private</span>
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
            <span>{currentRankData?.cycle_label || (period === "weekly" ? "Weekly Cycle" : "Monthly Cycle")}</span>
            <span>•</span>
            <span>Visible only to you</span>
          </p>
        </div>

        {/* Period Switcher (Weekly Cycle vs Monthly Cycle) */}
        <div className="inline-flex p-1 bg-neutral-100 rounded-2xl self-start sm:self-auto border border-neutral-200/60">
          <button
            type="button"
            onClick={() => setPeriod("weekly")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              period === "weekly"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Weekly Cycle
          </button>
          <button
            type="button"
            onClick={() => setPeriod("monthly")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              period === "monthly"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Monthly Cycle
          </button>
        </div>
      </div>

      {/* 2. Strict Privacy & Standing Guarantee Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white border border-emerald-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-xs shrink-0">
            <Lock className="w-5 h-5 text-emerald-100" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-neutral-900 font-heading">
              Track your progress. Earn rewards. Keep your position private.
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-2xl">
              SUTRA never publishes public student rankings, peer rosters, or competitive scoreboards.
              Your position and participation points are confidential and visible exclusively to your authenticated account.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white text-emerald-800 border border-emerald-200/80 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pseudonymized display names &amp; Private</span>
          </div>
        </div>
      </div>

      {/* 3. Core Personal Metric Cards: My Rank, My Points, My Total Points, Next Reward */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: My Current Position / Rank */}
        <div className="p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              My Rank
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-100 text-neutral-600">
              {period === "weekly" ? "Weekly" : "Monthly"}
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-heading">
              #{currentRank}
            </span>
            {rankChange !== null && rankChange !== undefined && rankChange !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                  rankChange > 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {rankChange > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span>+{rankChange}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3 text-amber-600" />
                    <span>{rankChange}</span>
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 pt-1 border-t border-neutral-100">
            {previousRank ? (
              <span>Previous period: <strong className="text-neutral-700">#{previousRank}</strong></span>
            ) : (
              <span>Initial tracking cycle</span>
            )}
          </p>
        </div>

        {/* Card 2: My Period Points */}
        <div className="p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              My Points
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200/60">
              Period
            </span>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 tracking-tight font-heading">
              {periodPoints}
            </span>
            <span className="text-xs font-bold text-amber-800">pts</span>
          </div>
          <p className="text-xs text-neutral-500 pt-1 border-t border-neutral-100">
            Earned in {period === "weekly" ? "Week 42" : "Current Month"}
          </p>
        </div>

        {/* Card 3: My Total Points (Lifetime) */}
        <div className="p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              My Total Points
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-100 text-neutral-600">
              Lifetime
            </span>
          </div>
          <div className="flex items-baseline gap-1 pt-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-heading">
              {availableBalance}
            </span>
            <span className="text-xs font-bold text-neutral-500">available</span>
          </div>
          <p className="text-xs text-neutral-500 pt-1 border-t border-neutral-100">
            <span>Total earned: <strong className="text-neutral-700">{lifetimeEarned} pts</strong></span>
          </p>
        </div>

        {/* Card 4: Next Reward & Points to Go */}
        <div className="p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Next Reward
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200/60">
              Target
            </span>
          </div>
          <div className="pt-1">
            <h4 className="text-base font-bold text-neutral-900 truncate font-heading" title={nextRewardName}>
              {nextRewardName}
            </h4>
            <p className="text-xs font-semibold text-purple-700 mt-0.5">
              {pointsNeeded > 0 ? (
                <span><strong>{pointsNeeded} pts</strong> to go</span>
              ) : (
                <span className="text-emerald-700 font-bold">Ready to redeem!</span>
              )}
            </p>
          </div>
          <p className="text-xs text-neutral-500 pt-1 border-t border-neutral-100">
            Target Cost: <strong className="text-neutral-700">{targetCost} pts</strong>
          </p>
        </div>
      </div>

      {/* 4. Visual Progress Indicator toward Next Reward */}
      <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900 font-heading">
                My Progress to Next Reward
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                {progressPercent}% Unlocked
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {availableBalance} points available toward {nextRewardName} ({targetCost} pts required).
            </p>
          </div>
          <Link
            href="/rewards?tab=store"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-amber-300" />
            <span>Browse Rewards Store</span>
            <ArrowRight className="w-3 h-3 text-neutral-400" />
          </Link>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-2">
          <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden p-0.5 border border-neutral-200/60">
            <div
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>0 pts</span>
            <span className="font-semibold text-neutral-800">
              {pointsNeeded > 0 ? `${pointsNeeded} points to go` : "Goal achieved!"}
            </span>
            <span>{targetCost} pts</span>
          </div>
        </div>

        {/* Milestone Steps Visualizer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className={`p-3 rounded-2xl border text-xs space-y-1 ${availableBalance >= 100 ? "bg-emerald-50/60 border-emerald-200 text-emerald-950" : "bg-neutral-50 border-neutral-200/70 text-neutral-500"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold">Digital Badge</span>
              {availableBalance >= 100 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="text-[10px] font-mono">100 pts</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500">Unlocked at 100 points</p>
          </div>

          <div className={`p-3 rounded-2xl border text-xs space-y-1 ${availableBalance >= 200 ? "bg-emerald-50/60 border-emerald-200 text-emerald-950" : "bg-neutral-50 border-neutral-200/70 text-neutral-500"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold">Sticker Pack</span>
              {availableBalance >= 200 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="text-[10px] font-mono">200 pts</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500">Unlocked at 200 points</p>
          </div>

          <div className={`p-3 rounded-2xl border text-xs space-y-1 ${availableBalance >= 500 ? "bg-emerald-50/60 border-emerald-200 text-emerald-950" : "bg-neutral-50 border-neutral-200/70 text-neutral-500"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold">Campus T-Shirt</span>
              {availableBalance >= 500 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <span className="text-[10px] font-mono">500 pts</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500">Target reward (500 pts)</p>
          </div>
        </div>
      </div>

      {/* 5. Private Cycle Breakdown & Strict Decoupling Rules */}
      <div className="p-5 rounded-3xl bg-neutral-50 border border-neutral-200/80 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-neutral-700" />
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            SUTRA Participation &amp; Privacy Rules
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-neutral-600 leading-relaxed">
          <div className="p-3 bg-white rounded-2xl border border-neutral-200/60 space-y-1">
            <strong className="text-neutral-900 font-semibold">Strict Happiness Decoupling:</strong>
            <p>
              Completing the weekly Happiness Pulse check-in awards a flat 10 participation points.
              Answers never affect your points, and distress is never penalized.
            </p>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-neutral-200/60 space-y-1">
            <strong className="text-neutral-900 font-semibold">Private by Default:</strong>
            <p>
              Rankings are calculated internally from verified eligible participation points.
              No peer leaderboards or public ranking lists are displayed to students.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export alias for backward-compatible routing imports
export const MyProgressView = LeaderboardView;
