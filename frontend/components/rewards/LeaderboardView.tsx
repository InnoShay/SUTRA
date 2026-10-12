"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { LeaderboardPeriod } from "@/lib/types";
import { rankLeaderboardEntries } from "@/lib/rewardsScoring";
import {
  Trophy,
  Medal,
  Calendar,
  Users,
  ShieldCheck,
  Award,
  Sparkles,
  Info,
} from "lucide-react";

export function LeaderboardView() {
  const { leaderboardWeekly, leaderboardMonthly } = useSkillHub();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");

  const currentData = period === "weekly" ? leaderboardWeekly : leaderboardMonthly;
  const entries = rankLeaderboardEntries(currentData?.entries || []);
  const currentUserEntry = currentData?.current_user_entry;

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs border border-amber-300">
            🥇
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs border border-slate-300">
            🥈
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-900 flex items-center justify-center font-black text-xs border border-amber-200">
            🥉
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold text-xs">
            #{rank}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Explanation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-900 font-heading">
              Student Participation Leaderboard
            </h2>
            {currentData?.is_demo_data && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                Demo Cycle
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-2">
            <span>{currentData?.cycle_label || "Active Cycle"}</span>
            <span>•</span>
            <span>{currentData?.total_participants || entries.length} Active Participants</span>
          </p>
        </div>

        {/* Period Switcher */}
        <div className="inline-flex p-1 bg-neutral-100 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriod("weekly")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              period === "monthly"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Monthly Cycle
          </button>
        </div>
      </div>

      {/* Strict Decoupling and Privacy Explanation Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/70 via-orange-50/30 to-white border border-amber-200/70 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-neutral-700 leading-relaxed">
            <strong>How Rankings Work:</strong> Ranks reflect <em>period-specific participation points</em> earned in workshops, challenges, and campus events.
            <strong> Happiness Index scores are strictly confidential and never used for leaderboard rankings.</strong>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-600" />
          <span>Pseudonymized display names</span>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      {entries.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200/80 shadow-2xs space-y-2">
          <Trophy className="w-8 h-8 text-neutral-300 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-800">
            Leaderboard currently updating
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Participation points for the {period} cycle are being compiled. Verified activities will appear shortly.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Student Participant</th>
                  <th className="py-3 px-4 text-center">Verified Activities</th>
                  <th className="py-3 px-4 text-right">Points in {period === "weekly" ? "Week" : "Month"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {entries.map((entry) => {
                  const isCurrent = Boolean(entry.is_current_user);
                  return (
                    <tr
                      key={`${entry.rank}-${entry.display_name}`}
                      className={`transition-colors ${
                        isCurrent
                          ? "bg-amber-50/60 font-semibold"
                          : "hover:bg-neutral-50/50"
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center">
                          {getRankBadge(entry.rank)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                              isCurrent
                                ? "bg-amber-600 text-white border-amber-600"
                                : "bg-neutral-100 text-neutral-700 border-neutral-200"
                            }`}
                          >
                            {entry.avatar || entry.display_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900">
                                {entry.display_name}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 font-normal">
                              Voluntary Campus Participant
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-neutral-600">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>{entry.activities_count || 1} activities</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-sm font-extrabold text-neutral-900 font-heading">
                          {entry.points_in_period}
                        </span>
                        <span className="text-xs font-semibold text-amber-700 ml-1">
                          pts
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
