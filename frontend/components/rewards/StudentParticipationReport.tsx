"use client";

import React from "react";
import { useSkillHub } from "@/lib/store";
import {
  Coins,
  Gift,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  FileCheck,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { computeRewardProgress } from "@/lib/rewardsScoring";

export function StudentParticipationReport() {
  const { pointsWallet, myRedemptions, rewardsCatalog, pointsTransactions } = useSkillHub();

  const available = pointsWallet?.available_balance ?? 385;
  const earned = pointsWallet?.total_earned ?? 485;
  const redeemed = pointsWallet?.total_redeemed ?? 100;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "collected":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
            Collected
          </span>
        );
      case "ready_for_collection":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
            Ready for Collection
          </span>
        );
      case "approved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
            Approved
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700">
            Requested
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Current Balance
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-extrabold text-neutral-900 font-heading">
              {available.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-700">pts</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Available for redemption
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            This Week &amp; Month
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-bold text-neutral-800 font-heading">
              +{thisWeek}
            </span>
            <span className="text-xs font-semibold text-neutral-500">pts / wk</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            +{thisMonth} pts during current monthly cycle
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Lifetime Earned
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-bold text-neutral-800 font-heading">
              {earned.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-neutral-500">pts</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Across {pointsTransactions.filter((t) => t.status === "credited").length} verified activities
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Points Redeemed
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-bold text-neutral-800 font-heading">
              {redeemed.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-neutral-500">pts</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Across {myRedemptions.length} claimed campus rewards
          </p>
        </div>
      </div>

      {/* Milestone Progress Bar */}
      <div className="skill-card bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 font-heading flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Target Milestone: {targetReward.title}</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Cost: {targetReward.points_cost} points • {progressPercent}% achieved
            </p>
          </div>
          <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-3 py-1 rounded-xl self-start sm:self-auto">
            {pointsNeeded > 0 ? `${pointsNeeded} points remaining` : "Eligible for Redemption"}
          </span>
        </div>

        <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Redemption Fulfilment History */}
      <div className="skill-card bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-neutral-900 font-heading">
              Reward Redemption History
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Track status of claimed merchandise, digital vouchers, and collection details.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
            {myRedemptions.length} Orders
          </span>
        </div>

        {myRedemptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 italic">
            No rewards claimed yet. Visit the Rewards Store to redeem points.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {myRedemptions.map((red) => (
              <div
                key={red.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-neutral-900">
                      {red.reward_title}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400">
                      ({red.id})
                    </span>
                    {getStatusBadge(red.status)}
                  </div>
                  <p className="text-neutral-500 flex items-center gap-2 flex-wrap">
                    <span>Spent: <strong className="text-neutral-700">{red.points_spent} pts</strong></span>
                    <span>•</span>
                    <span>Redeemed: {formatDate(red.redeemed_at)}</span>
                    {red.collection_location && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-neutral-400" />
                          <span>{red.collection_location}</span>
                        </span>
                      </>
                    )}
                  </p>
                  {red.notes && (
                    <p className="text-[11px] text-neutral-400 italic">
                      Note: {red.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Non-clinical / Non-evaluative Mandatory Guard Notice */}
      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-[11px] text-neutral-500 flex items-start gap-2.5 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
        <p>
          <strong>Governance Notice:</strong> SUTRA points measure participation in voluntary campus enrichment activities.
          Points do not represent happiness, mental health, emotional resilience, academic grades, or personal worth.
          Check-in responses from the Happiness Pulse are aggregate and strictly excluded from rewards and leaderboard computations.
        </p>
      </div>
    </div>
  );
}
