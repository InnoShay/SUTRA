"use client";

import React from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { computeRewardProgress } from "@/lib/rewardsScoring";
import {
  Coins,
  ArrowUpRight,
  Sparkles,
  Gift,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

interface PointsWalletCardProps {
  onOpenActivities?: () => void;
  onOpenStore?: () => void;
  showFullDetails?: boolean;
}

export function PointsWalletCard({
  onOpenActivities,
  onOpenStore,
  showFullDetails = true,
}: PointsWalletCardProps) {
  const { pointsWallet, rewardsCatalog, isLoadingRewards, refreshRewardsData } = useSkillHub();

  const available = pointsWallet?.available_balance ?? 385;
  const totalEarned = pointsWallet?.total_earned ?? 485;
  const totalRedeemed = pointsWallet?.total_redeemed ?? 100;
  const thisWeek = pointsWallet?.points_this_week ?? 35;
  const thisMonth = pointsWallet?.points_this_month ?? 115;

  const targetReward =
    rewardsCatalog.find((r) => r.is_available && r.points_cost > available) ||
    rewardsCatalog[2] || {
      title: "College Merchandise T-Shirt",
      points_cost: 500,
    };

  const { progressPercent, pointsNeeded } = computeRewardProgress(
    available,
    targetReward.points_cost
  );

  return (
    <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                SUTRA Points Wallet
              </h2>
              {pointsWallet?.is_demo_data && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                  Demo Wallet
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Recognizing voluntary student participation, workshops, and campus community engagement.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refreshRewardsData()}
          disabled={isLoadingRewards}
          title="Refresh points balance"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoadingRewards ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Primary Balance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Points */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white border border-amber-200/70">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            Available Balance
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-3xl font-extrabold text-neutral-900 font-heading tracking-tight">
              {available.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-700">pts</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Redeemable in the Campus Rewards Store
          </p>
        </div>

        {/* Lifetime Earned */}
        <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
            <span>Lifetime Earned</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-bold text-neutral-800 font-heading">
              {totalEarned.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-neutral-500">pts</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            +{thisWeek} pts this week • +{thisMonth} pts this month
          </p>
        </div>

        {/* Total Redeemed */}
        <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
            <span>Total Redeemed</span>
            <Gift className="w-3.5 h-3.5 text-purple-600" />
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-bold text-neutral-800 font-heading">
              {totalRedeemed.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-neutral-500">pts</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Fulfilled rewards and badges claimed
          </p>
        </div>
      </div>

      {/* Progress to Next Reward */}
      {showFullDetails && (
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border border-neutral-200/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-neutral-900">
                Next Milestone Reward:{" "}
                <strong className="text-neutral-950 font-bold">{targetReward.title}</strong>
              </span>
            </div>
            <span className="text-neutral-600 font-medium">
              {pointsNeeded > 0 ? (
                <>
                  <strong className="text-amber-800 font-bold">{pointsNeeded} more points</strong> to unlock ({targetReward.points_cost} pts)
                </>
              ) : (
                <span className="text-emerald-700 font-bold">Ready to redeem!</span>
              )}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-neutral-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
            <span>{available} points available</span>
            <span>{progressPercent}% towards {targetReward.title}</span>
          </div>
        </div>
      )}

      {/* Action Links */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {onOpenStore ? (
            <button
              type="button"
              onClick={onOpenStore}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 text-amber-300" />
              <span>Browse Rewards Store</span>
            </button>
          ) : (
            <Link
              href="/rewards?tab=store"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Gift className="w-3.5 h-3.5 text-amber-300" />
              <span>Browse Rewards Store</span>
            </Link>
          )}

          {onOpenActivities ? (
            <button
              type="button"
              onClick={onOpenActivities}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-50 active:scale-[0.98] text-neutral-800 border border-neutral-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>Eligible Activities</span>
            </button>
          ) : (
            <Link
              href="/rewards?tab=activities"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-50 active:scale-[0.98] text-neutral-800 border border-neutral-200 rounded-xl text-xs font-semibold shadow-2xs transition-all"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>Eligible Activities</span>
            </Link>
          )}
        </div>

        {/* Non-negotiable Governance Disclaimers */}
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span>Non-transferable • Zero cash value • Independent of grades &amp; wellbeing</span>
        </div>
      </div>
    </div>
  );
}
