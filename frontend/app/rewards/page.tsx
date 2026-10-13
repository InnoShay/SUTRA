"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSkillHub } from "@/lib/store";
import { PointsWalletCard } from "@/components/rewards/PointsWalletCard";
import { EligibleActivitiesList } from "@/components/rewards/EligibleActivitiesList";
import { TransactionHistoryTable } from "@/components/rewards/TransactionHistoryTable";
import { LeaderboardView } from "@/components/rewards/LeaderboardView";
import { RewardsStoreView } from "@/components/rewards/RewardsStoreView";
import { StudentParticipationReport } from "@/components/rewards/StudentParticipationReport";
import { AdminRewardsManagementView } from "@/components/rewards/AdminRewardsManagementView";
import { HappinessPulseModal } from "@/components/student/HappinessPulseModal";
import {
  Coins,
  Gift,
  Trophy,
  ListCheck,
  FileText,
  ShieldCheck,
  Heart,
  Settings,
  Sparkles,
} from "lucide-react";

type RewardsTab = "wallet" | "store" | "leaderboard" | "activities" | "report" | "admin";

function RewardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeRole, studentPulseSubmitted, pointsWallet } = useSkillHub();

  const initialTab = (searchParams.get("tab") as RewardsTab) || "wallet";
  const [activeTab, setActiveTab] = useState<RewardsTab>(initialTab === "store" ? "wallet" : initialTab);
  const [isPulseModalOpen, setIsPulseModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as RewardsTab | null;
    if (tabParam === "store") {
      router.push("/shop");
      return;
    }
    if (tabParam && ["wallet", "leaderboard", "activities", "report", "admin"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, router]);

  const isAdmin = activeRole === "admin" || activeRole === "superadmin";

  const tabs: { id: RewardsTab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: "wallet", label: "Points Wallet", icon: Coins },
    { id: "store", label: "Rewards Store", icon: Gift },
    { id: "leaderboard", label: "My Progress", icon: Trophy },
    { id: "activities", label: "Eligible Activities", icon: ListCheck },
    { id: "report", label: "Participation Report", icon: FileText },
    ...(isAdmin ? [{ id: "admin" as RewardsTab, label: "Admin Fulfilment", icon: Settings, adminOnly: true }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Leaderboard &amp; Rewards
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wider border border-amber-300">
              Student Recognition
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl">
            Track your progress. Earn rewards. Keep your position private.
          </p>
        </div>

        {/* Pulse Quick Action Banner */}
        <div className="flex items-center gap-3">
          {mounted && studentPulseSubmitted ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Weekly Pulse Done (+10 pts)</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsPulseModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span>Complete Pulse (+10 pts)</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-neutral-200/80 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          if (tab.id === "store") {
            return (
              <Link
                key={tab.id}
                href="/shop"
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-2xl transition-all whitespace-nowrap cursor-pointer text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80"
              >
                <Icon className="w-4 h-4 text-neutral-400" />
                <span>{tab.label}</span>
              </Link>
            );
          }
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-2xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-amber-300" : "text-neutral-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="space-y-6">
        {activeTab === "wallet" && (
          <div className="space-y-6">
            <PointsWalletCard
              onOpenStore={() => router.push("/shop")}
              onOpenActivities={() => setActiveTab("activities")}
            />
            <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 font-heading">
                    Recent Point Transactions
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Authoritative history of participation credits and reward debits.
                  </p>
                </div>
              </div>
              <TransactionHistoryTable />
            </div>
          </div>
        )}

        {activeTab === "store" && <RewardsStoreView />}

        {activeTab === "leaderboard" && <LeaderboardView />}

        {activeTab === "activities" && (
          <EligibleActivitiesList
            onOpenPulseModal={() => setIsPulseModalOpen(true)}
          />
        )}

        {activeTab === "report" && <StudentParticipationReport />}

        {activeTab === "admin" && <AdminRewardsManagementView />}
      </div>

      {/* Weekly Happiness Pulse Modal */}
      <HappinessPulseModal
        isOpen={isPulseModalOpen}
        onClose={() => setIsPulseModalOpen(false)}
      />
    </div>
  );
}

export default function RewardsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-neutral-100 rounded-2xl" />
          <div className="h-6 w-96 bg-neutral-100 rounded-xl" />
          <div className="h-48 w-full bg-neutral-100 rounded-3xl" />
        </div>
      }
    >
      <RewardsPageContent />
    </React.Suspense>
  );
}
