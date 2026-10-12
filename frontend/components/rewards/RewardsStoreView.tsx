"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { RewardItemDTO } from "@/lib/types";
import { RedemptionModal } from "./RedemptionModal";
import {
  Gift,
  Coins,
  Sparkles,
  Lock,
  CheckCircle2,
  Package,
  Layers,
  ShieldCheck,
  Tag,
} from "lucide-react";

export function RewardsStoreView() {
  const { rewardsCatalog, pointsWallet } = useSkillHub();
  const [selectedReward, setSelectedReward] = useState<RewardItemDTO | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const availablePoints = pointsWallet?.available_balance ?? 385;

  const handleOpenRedemption = (reward: RewardItemDTO) => {
    setSelectedReward(reward);
    setIsModalOpen(true);
  };

  const getCategoryBadge = (category: string, isDigital: boolean) => {
    if (isDigital) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
          Digital Voucher
        </span>
      );
    }
    if (category === "experience") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          Campus Event
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
        Physical Merchandise
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 font-heading">
              SUTRA Campus Rewards Store
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
              Published Catalog
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-0.5 max-w-xl">
            Redeem points earned through voluntary participation for verified badges, official college merchandise, and skill workshops.
          </p>
        </div>

        {/* Current Available Points Badge */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs shrink-0 self-start sm:self-auto">
          <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Your Balance
            </p>
            <p className="text-sm font-extrabold text-neutral-900 font-heading leading-tight">
              {availablePoints.toLocaleString()} <span className="text-xs font-bold text-amber-700">pts</span>
            </p>
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rewardsCatalog.map((reward) => {
          const hasEnough = availablePoints >= reward.points_cost;
          const isOutOfStock = reward.stock <= 0;
          const deficit = Math.max(0, reward.points_cost - availablePoints);

          return (
            <div
              key={reward.id}
              className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200/80 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                {/* Category & Stock Header */}
                <div className="flex items-center justify-between gap-2">
                  {getCategoryBadge(reward.category, reward.is_digital)}
                  <span className="text-[11px] text-neutral-500 font-medium flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-neutral-400" />
                    <span>
                      {reward.is_digital ? "Unlimited" : `${reward.stock} in stock`}
                    </span>
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-bold text-neutral-900 font-heading">
                    {reward.title}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {reward.description}
                  </p>
                </div>

                {/* Eligibility notes */}
                {reward.eligibility_notes && (
                  <p className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                    📍 {reward.eligibility_notes}
                  </p>
                )}
              </div>

              {/* Price & Action Button */}
              <div className="space-y-3 pt-3 border-t border-neutral-100">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-neutral-500 font-medium">
                    Points Required:
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 font-heading">
                    {reward.points_cost}{" "}
                    <span className="text-xs font-bold text-amber-700">pts</span>
                  </span>
                </div>

                {isOutOfStock ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 bg-neutral-100 text-neutral-400 rounded-xl text-xs font-semibold cursor-not-allowed text-center"
                  >
                    Out of Stock
                  </button>
                ) : hasEnough ? (
                  <button
                    type="button"
                    onClick={() => handleOpenRedemption(reward)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-300" />
                    <span>Redeem Reward</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenRedemption(reward)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Lock className="w-3 h-3 text-neutral-400" />
                    <span>Need {deficit} more pts</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Redemption Confirmation Modal */}
      <RedemptionModal
        reward={selectedReward}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedReward(null);
        }}
      />
    </div>
  );
}
