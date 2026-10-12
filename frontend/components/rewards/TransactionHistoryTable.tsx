"use client";

import React from "react";
import { useSkillHub } from "@/lib/store";
import { PointsTransactionDTO } from "@/lib/types";
import {
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
} from "lucide-react";

interface TransactionHistoryTableProps {
  transactions?: PointsTransactionDTO[];
  limit?: number;
}

export function TransactionHistoryTable({
  transactions: propTxs,
  limit,
}: TransactionHistoryTableProps) {
  const { pointsTransactions } = useSkillHub();
  const txList = propTxs || pointsTransactions;
  const displayed = limit ? txList.slice(0, limit) : txList;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  if (!displayed || displayed.length === 0) {
    return (
      <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-100 space-y-2">
        <Receipt className="w-8 h-8 text-neutral-400 mx-auto" />
        <p className="text-sm font-semibold text-neutral-800">
          No point transactions yet
        </p>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          Participate in weekly pulses, campus workshops, and learning challenges to earn participation points.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-3 px-4">Transaction / Activity</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Points</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Date &amp; Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {displayed.map((tx) => {
              const isCredit = tx.points > 0;
              return (
                <tr key={tx.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">
                          {tx.description}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                          {tx.id} • {tx.activity_or_reward_id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-neutral-600">
                    {isCredit ? "Participation Credit" : "Reward Redemption"}
                  </td>
                  <td className="py-3.5 px-4 font-bold">
                    <span
                      className={
                        isCredit ? "text-emerald-700" : "text-neutral-900"
                      }
                    >
                      {isCredit ? `+${tx.points}` : `${tx.points}`} pts
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tx.status === "credited"
                          ? "bg-emerald-100/80 text-emerald-800"
                          : tx.status === "debited"
                          ? "bg-neutral-100 text-neutral-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{tx.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-neutral-500 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span suppressHydrationWarning>{formatDate(tx.created_at)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
