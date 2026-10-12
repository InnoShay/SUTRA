"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";

export default function CounselorAnalyticsPage() {
  const { counselorProfile } = useSkillHub();
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "semester">("30d");

  // Essential KPI summary (White, Black, Red - Zero SVGs)
  const kpiData = [
    { title: "Completion Rate", value: "96.4%", change: "+3.2%" },
    { title: "Avg SLA Response", value: "18.2m", change: "-4.5m" },
    { title: "Recovery Index", value: "+42.8%", change: "+8.1%" },
    { title: "Satisfaction Rating", value: "4.92 / 5", change: "+0.12" },
    { title: "De-escalation Rate", value: "88.5%", change: "+5.4%" },
    { title: "Consultation Hours", value: "142h", change: "48 calls" },
  ];

  // Weekly Call Data
  const weeklyData = [
    { day: "Mon", scheduled: 8, completed: 8 },
    { day: "Tue", scheduled: 10, completed: 9 },
    { day: "Wed", scheduled: 7, completed: 7 },
    { day: "Thu", scheduled: 9, completed: 9 },
    { day: "Fri", scheduled: 8, completed: 8 },
    { day: "Sat", scheduled: 5, completed: 5 },
    { day: "Sun", scheduled: 2, completed: 2 },
  ];

  // Domain Distribution (Total = 121) - Monochrome only
  const domainSegments = [
    { name: "Mental Health & Exam Anxiety", count: 46, pct: 38, isHighlight: true },
    { name: "Academic Mentoring & Workload", count: 34, pct: 28, isHighlight: false },
    { name: "Attendance Drop Mitigation", count: 24, pct: 20, isHighlight: false },
    { name: "Career & Placement Guidance", count: 17, pct: 14, isHighlight: false },
  ];

  // Recent Consultations (Zero SVGs, White Black Red)
  const consultations = [
    { id: "SYN-1007", name: "Asha", domain: "Exam Anxiety", duration: "40m", date: "Oct 12", rating: "5.0", status: "Recovered" },
    { id: "SYN-1009", name: "Ira", domain: "Design Anxiety", duration: "45m", date: "Oct 11", rating: "5.0", status: "In Progress" },
    { id: "SYN-1011", name: "Milan", domain: "Lab Attendance", duration: "35m", date: "Oct 10", rating: "4.0", status: "Follow-up Due" },
    { id: "SYN-1010", name: "Noor", domain: "Routine Wellness", duration: "50m", date: "Oct 09", rating: "5.0", status: "Recovered" },
    { id: "SYN-1012", name: "Tara", domain: "Career Prep", duration: "60m", date: "Oct 08", rating: "5.0", status: "Recovered" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. COMPACT HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Link href="/dashboard" className="hover:text-neutral-900 transition-colors">
              {counselorProfile?.full_name || "Dr. Meera Nambiar"}
            </Link>
            <span className="text-neutral-300">›</span>
            <span className="text-neutral-900 font-semibold">Counselor Analytics</span>
          </div>

          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight font-heading mt-0.5">
            Performance &amp; Clinical Impact
          </h1>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2.5">
          <div className="inline-flex p-1 bg-white rounded-full border border-neutral-200/90 shadow-2xs text-xs font-semibold">
            {(["7d", "30d", "semester"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-full transition-all ${
                  timeframe === tf
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {tf === "7d" ? "7 Days" : tf === "30d" ? "30 Days" : "Semester"}
              </button>
            ))}
          </div>

          <Link
            href="/schedule"
            className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 rounded-full text-xs font-semibold shadow-2xs transition-all"
          >
            Open Schedule
          </Link>
        </div>
      </div>

      {/* 2. CORE KPI TILES (No SVGs, Clean Typography) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiData.map((kpi, idx) => (
          <div
            key={idx}
            className="p-4 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs space-y-1 hover:border-neutral-300 transition-colors"
          >
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block truncate">
              {kpi.title}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 tracking-tight font-heading">
                {kpi.value}
              </span>
              <span className="text-[11px] font-bold text-neutral-600 font-mono">
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. VISUAL ANALYTICS ROW: HTML/CSS BAR & DOMAIN BREAKDOWN (No SVGs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CSS BAR CHART: Weekly Throughput */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Weekly Consultation Volume</h3>
              <p className="text-xs text-neutral-400">Scheduled vs Completed sessions</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-neutral-700">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-900" />
                Completed
              </span>
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
                Scheduled
              </span>
            </div>
          </div>

          {/* Pure CSS Bar Chart */}
          <div className="pt-4">
            <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 border-b border-neutral-200 pb-2">
              {weeklyData.map((item) => {
                const maxVal = 10;
                const scheduledPercent = (item.scheduled / maxVal) * 100;
                const completedPercent = (item.completed / item.scheduled) * 100;

                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[10px] font-mono font-bold text-neutral-500">
                      {item.completed}
                    </span>
                    <div
                      className="w-full max-w-[36px] bg-neutral-100 rounded-xl relative overflow-hidden flex flex-col justify-end"
                      style={{ height: `${scheduledPercent}%` }}
                    >
                      <div
                        className="w-full bg-neutral-900 rounded-xl transition-all duration-300"
                        style={{ height: `${completedPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-neutral-700">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DOMAIN DISTRIBUTION: Pure CSS Progress Bars */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Domain Distribution</h3>
            <p className="text-xs text-neutral-400">121 total consultations categorized by concern</p>
          </div>

          <div className="space-y-3.5 my-auto">
            {domainSegments.map((seg, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${seg.isHighlight ? "text-neutral-950 font-bold" : "text-neutral-700"}`}>
                    {seg.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400 font-mono">{seg.count} calls</span>
                    <span className="font-mono font-bold text-neutral-900">{seg.pct}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      seg.isHighlight ? "bg-red-600" : "bg-neutral-900"
                    }`}
                    style={{ width: `${seg.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 text-xs flex justify-between">
            <span className="text-neutral-500">Primary Focus:</span>
            <span className="font-bold text-neutral-900">Exam &amp; Mental Health (38%)</span>
          </div>
        </div>
      </div>

      {/* 4. RECOVERY TRAJECTORY & SLA VELOCITY (No SVGs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Student Recovery Progression */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Student Wellbeing Recovery Curve</h3>
              <p className="text-xs text-neutral-400">Academic engagement index progression</p>
            </div>
            <span className="text-xs font-bold font-mono text-neutral-900 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-300">
              +46% Net Gain
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-2">
            {[
              { week: "Week 0", score: "42%", label: "Initial Intake", isTarget: false },
              { week: "Week 2", score: "58%", label: "Check-in", isTarget: false },
              { week: "Week 4", score: "73%", label: "Stabilization", isTarget: false },
              { week: "Week 6", score: "88%", label: "Full Recovery", isTarget: true },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border text-center space-y-1 ${
                  step.isTarget
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                    : "bg-neutral-50 text-neutral-800 border-neutral-200"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${step.isTarget ? "text-neutral-300" : "text-neutral-400"}`}>
                  {step.week}
                </span>
                <span className="text-xl font-extrabold font-heading block">
                  {step.score}
                </span>
                <span className={`text-[10px] font-medium block ${step.isTarget ? "text-neutral-200" : "text-neutral-500"}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Response Speed */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">SLA Response Speed</h3>
              <p className="text-xs text-neutral-400">Time elapsed from request to contact</p>
            </div>
            <span className="text-xs font-bold text-neutral-900 font-mono">97% on-time</span>
          </div>

          <div className="space-y-3 my-auto">
            {[
              { label: "< 15 mins", pct: 62, count: "31 calls", isAlert: false },
              { label: "15 - 30 mins", pct: 26, count: "13 calls", isAlert: false },
              { label: "30 - 60 mins", pct: 9, count: "4 calls", isAlert: false },
              { label: "> 1 hour", pct: 3, count: "2 calls", isAlert: true },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-neutral-800">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400 font-mono">{item.count}</span>
                    <span className="font-mono font-bold text-neutral-900">{item.pct}%</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.isAlert ? "bg-red-600" : "bg-neutral-900"}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. MINIMAL CONSULTATIONS LOG TABLE (No SVGs) */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Recent Consultations</h3>
            <p className="text-xs text-neutral-400">Latest completed student sessions</p>
          </div>

          <Link
            href="/schedule"
            className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 transition-colors"
          >
            View All in Schedule →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-2.5 pl-2">Student</th>
                <th className="pb-2.5">Domain</th>
                <th className="pb-2.5">Duration</th>
                <th className="pb-2.5">Date</th>
                <th className="pb-2.5">Rating</th>
                <th className="pb-2.5 pr-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {consultations.map((c, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 pl-2 font-bold text-neutral-900">
                    <div>{c.name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono font-normal">{c.id}</div>
                  </td>
                  <td className="py-3 font-medium text-neutral-700">{c.domain}</td>
                  <td className="py-3 text-neutral-600 font-mono">{c.duration}</td>
                  <td className="py-3 text-neutral-500">{c.date}</td>
                  <td className="py-3 font-bold text-neutral-900">
                    {c.rating}
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === "Recovered"
                          ? "bg-neutral-900 text-white"
                          : c.status === "In Progress"
                          ? "bg-neutral-100 text-neutral-800 border border-neutral-300"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {c.status}
                    </span>
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
