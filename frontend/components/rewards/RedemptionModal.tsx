"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { RewardItemDTO, RedemptionRecordDTO } from "@/lib/types";
import { validateRedemptionEligibility } from "@/lib/rewardsScoring";
import {
  X,
  Gift,
  Coins,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface RedemptionModalProps {
  reward: RewardItemDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RedemptionModal({ reward, isOpen, onClose }: RedemptionModalProps) {
  const { pointsWallet, redeemStoreReward } = useSkillHub();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRecord, setSuccessRecord] = useState<RedemptionRecordDTO | null>(null);
  const [notes, setNotes] = useState("");

  if (!isOpen || !reward) return null;

  const currentBalance = pointsWallet?.available_balance ?? 385;
  const { eligible, reason } = validateRedemptionEligibility(currentBalance, reward);
  const balanceAfter = Math.max(0, currentBalance - reward.points_cost);

  const handleConfirm = async () => {
    if (!eligible) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await redeemStoreReward(reward.id, notes.trim() || undefined);
      setSuccessRecord(res.redemption);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Redemption request failed. Your point balance has NOT been deducted."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessRecord(null);
    setErrorMessage(null);
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-neutral-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <Gift className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 font-heading">
                {successRecord ? "Redemption Confirmed!" : "Redeem Campus Reward"}
              </h3>
              <p className="text-xs text-neutral-500">
                {reward.title} • {reward.points_cost} Points
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {successRecord ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900 font-heading">
                  Order Successfully Placed
                </h4>
                <p className="text-xs text-neutral-600 mt-1 max-w-sm mx-auto">
                  Your redemption request has been registered with reference ID{" "}
                  <span className="font-mono font-bold text-neutral-900">{successRecord.id}</span>.
                </p>
              </div>

              {/* Fulfilment info box */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-left text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-neutral-900">
                  <MapPin className="w-4 h-4 text-neutral-600 shrink-0" />
                  <span>
                    {successRecord.is_digital
                      ? "Digital Access"
                      : "Collection Instructions"}
                  </span>
                </div>
                <p className="text-neutral-600">
                  {successRecord.collection_location ||
                    (successRecord.is_digital
                      ? "A confirmation voucher has been generated in your participation history."
                      : "Bring your student ID to Student Services Center (Room 102) once status updates to 'Ready for Collection'.")}
                </p>
                <p className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-200/60">
                  Initial Status: <strong className="text-neutral-800 uppercase font-bold">{successRecord.status}</strong>
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Item Summary Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Selected Item
                  </span>
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {reward.category}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-neutral-900 font-heading">
                  {reward.title}
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {reward.description}
                </p>
                {reward.eligibility_notes && (
                  <p className="text-[11px] text-neutral-500 italic">
                    Note: {reward.eligibility_notes}
                  </p>
                )}
              </div>

              {/* Point Ledger Calculation */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-neutral-600">
                  <span>Current Available Points:</span>
                  <span className="font-semibold text-neutral-900">{currentBalance} pts</span>
                </div>
                <div className="flex justify-between items-center text-neutral-600">
                  <span>Cost of this Reward:</span>
                  <span className="font-bold text-rose-700">-{reward.points_cost} pts</span>
                </div>
                <div className="pt-2 border-t border-neutral-100 flex justify-between items-center font-bold text-neutral-900">
                  <span>Remaining Points After:</span>
                  <span className={eligible ? "text-emerald-700" : "text-rose-600"}>
                    {balanceAfter} pts
                  </span>
                </div>
              </div>

              {/* Optional note or sizing */}
              {!reward.is_digital && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700">
                    Optional Size / Collection Preference:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Size M, black color, or special instruction"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                    maxLength={100}
                  />
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {/* Ineligibility notice if balance is low */}
              {!eligible && reason && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{reason}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between gap-3">
          {successRecord ? (
            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!eligible || isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Redemption...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-3.5 h-3.5 text-amber-300" />
                    <span>Confirm Redemption ({reward.points_cost} pts)</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
