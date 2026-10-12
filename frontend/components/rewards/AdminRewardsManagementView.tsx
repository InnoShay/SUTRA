"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { RedemptionStatus, RedemptionRecordDTO } from "@/lib/types";
import {
  Package,
  Gift,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  Loader2,
  ChevronDown,
  RotateCcw,
} from "lucide-react";

export function AdminRewardsManagementView() {
  const {
    rewardsCatalog = [],
    allRedemptions = [],
    updateAdminRedemptionStatus,
    activeRole,
    isLoadingRewards,
    refreshRewardsData,
  } = useSkillHub();

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isAdmin = activeRole === "admin" || activeRole === "superadmin";

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-rose-50 rounded-3xl border border-rose-200 space-y-3">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-rose-950 font-heading">
          Administrative Access Restricted
        </h3>
        <p className="text-xs text-rose-800 max-w-md mx-auto">
          Reward catalog administration and fulfillment processing require administrative credentials.
          Ordinary students and faculty are restricted from modifying reward inventories or approving orders.
        </p>
      </div>
    );
  }

  const handleStatusChange = async (redemptionId: string, newStatus: RedemptionStatus) => {
    setUpdatingId(redemptionId);
    setFeedback(null);
    try {
      await updateAdminRedemptionStatus(redemptionId, newStatus);
      setFeedback(`Status updated to ${newStatus.replace(/_/g, " ")}.`);
    } catch (err: any) {
      setFeedback(err?.message || "Failed to update redemption status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "collected":
        return "bg-emerald-100 text-emerald-800";
      case "ready_for_collection":
        return "bg-amber-100 text-amber-900 border border-amber-300";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 font-heading">
              Reward Administration &amp; Fulfilment Desk
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
              Staff Only
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage catalog inventory, approve merchandise collection, and track student redemptions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshRewardsData()}
          disabled={isLoadingRewards}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoadingRewards ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. Student Redemption Fulfilment Queue */}
      <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-neutral-900 font-heading">
              Student Redemption Fulfilment Queue
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Review requests, prepare merchandise packages, and confirm student collections.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
            {(allRedemptions?.length ?? 0)} Total Orders
          </span>
        </div>

        {(allRedemptions?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 italic">
            No student redemptions in fulfillment queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order ID / Student</th>
                  <th className="py-3 px-4">Reward Item</th>
                  <th className="py-3 px-4">Points Spent</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Update Fulfilment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(allRedemptions || []).map((red) => {
                  const isUpdating = updatingId === red.id;
                  return (
                    <tr key={red.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-neutral-900">
                          {red.id}
                        </span>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {red.student_display_name || red.student_id}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-neutral-900">
                          {red.reward_title}
                        </span>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {red.is_digital ? "Digital Voucher" : "Physical Merchandise"}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-neutral-800">
                        {red.points_spent} pts
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                            red.status
                          )}`}
                        >
                          {red.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                          ) : (
                            <select
                              value={red.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  red.id,
                                  e.target.value as RedemptionStatus
                                )
                              }
                              className="px-2.5 py-1 text-xs bg-white border border-neutral-200 rounded-lg text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer"
                            >
                              <option value="requested">Requested</option>
                              <option value="approved">Approved</option>
                              <option value="ready_for_collection">
                                Ready for Collection
                              </option>
                              <option value="collected">Collected</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Published Catalog Inventory Table */}
      <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
        <div className="pb-3 border-b border-neutral-100">
          <h3 className="text-base font-bold text-neutral-900 font-heading">
            Published Catalog Inventory
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time stock counts and point costs published to students.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Catalog ID</th>
                <th className="py-3 px-4">Reward Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Point Cost</th>
                <th className="py-3 px-4 text-right">Remaining Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rewardsCatalog.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-700">
                    {item.id}
                  </td>
                  <td className="py-3 px-4 font-semibold text-neutral-900">
                    {item.title}
                  </td>
                  <td className="py-3 px-4 uppercase text-[10px] font-bold text-neutral-500">
                    {item.category}
                  </td>
                  <td className="py-3 px-4 font-bold text-neutral-900">
                    {item.points_cost} pts
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-neutral-700">
                    {item.is_digital ? "Unlimited" : `${item.stock} units`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
