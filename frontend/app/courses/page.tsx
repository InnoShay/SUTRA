"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { SkillHubProgressBar } from "@/components/SkillHubProgressBar";
import {
  Plus,
  MoreVertical,
  Clock,
  ArrowUpRight,
  Sparkles,
  Shield,
  Activity,
  Cpu,
  Sliders,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

export default function CoursesPage() {
  const {
    interventions,
    mlModelInfo,
    courses,
    students,
    setIsNewCourseModalOpen,
  } = useSkillHub();

  const [activeDomainFilter, setActiveDomainFilter] = useState("All Interventions");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const tabs = [
    "All Interventions",
    "Academic",
    "Mentor",
    "Wellbeing",
    "Finance",
  ];

  // Derived catalogue items
  const catalogList =
    interventions.length > 0
      ? interventions
      : [
          {
            intervention_key: "academic_tutoring_offer",
            display_label: "Subject Tutoring Referral",
            domain: "academic",
            recipient_role: "faculty",
            required_purpose_key: "academic_support",
            description:
              "Targeted tutorial support session focusing on missed assignments, core module concepts, and exam prep.",
            active: true,
          },
          {
            intervention_key: "mentor_check_in",
            display_label: "Academic Mentor Check-In",
            domain: "mentor",
            recipient_role: "mentor",
            required_purpose_key: "academic_support",
            description:
              "Informal check-in with assigned mentor to identify study obstacles and attendance hurdles.",
            active: true,
          },
          {
            intervention_key: "counselling_referral",
            display_label: "Student Wellbeing Referral",
            domain: "counselling",
            recipient_role: "counsellor",
            required_purpose_key: "wellbeing_support",
            description:
              "Confidential appointment referral with institutional counselling service.",
            active: true,
          },
          {
            intervention_key: "fee_emergency_counselling",
            display_label: "Emergency Financial Aid Consultation",
            domain: "finance",
            recipient_role: "finance",
            required_purpose_key: "fee_support",
            description:
              "Restricted consultation with student finance team regarding institutional hardship assistance.",
            active: true,
          },
        ];

  const filteredCatalog = catalogList.filter((item) => {
    if (activeDomainFilter === "All Interventions") return true;
    return item.domain.toLowerCase() === activeDomainFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* 1. HEADER: Title and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            Interventions &amp; Model Catalogue
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Standardized support actions, recipient roles, and ML governance calibration
          </p>
        </div>

        <button
          onClick={() => setIsNewCourseModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-sm transition-all min-h-[44px] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Intervention</span>
        </button>
      </div>

      {/* 2. FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveDomainFilter(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] ${
              activeDomainFilter === tab
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/70 border border-neutral-200/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3. MAIN SPLIT: Interventions 2x2 Grid (left) & ML Governance Card (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: 2x2 Intervention Catalog Cards (~8 cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filteredCatalog.map((item, idx) => (
            <div
              key={item.intervention_key}
              className="skill-card bg-white p-5 flex flex-col justify-between group hover:shadow-skill-hover transition-all duration-200 relative"
            >
              <div>
                {/* 3D Image Artwork */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-4">
                  <img
                    src={courses[idx % courses.length]?.image || "/assets/course-figma.jpg"}
                    alt={item.display_label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-neutral-800 shadow-xs uppercase">
                      {item.domain}
                    </span>
                  </div>
                </div>

                {/* Title & Domain */}
                <h3 className="text-base font-bold text-neutral-900 tracking-tight leading-snug">
                  {item.display_label}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Bottom: Role and Purpose Key */}
              <div className="pt-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-neutral-400">
                    Recipient Role
                  </span>
                  <span className="font-bold text-neutral-900 uppercase">
                    {item.recipient_role}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-neutral-500">
                    {item.required_purpose_key}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    Active
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredCatalog.length === 0 && (
            <div className="col-span-2 text-center py-16 bg-white rounded-3xl border border-neutral-100 text-neutral-400 text-xs">
              No interventions found in &ldquo;{activeDomainFilter}&rdquo;
            </div>
          )}
        </div>

        {/* RIGHT PANEL: ML Model Governance + Policy Rules (~4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: ML Model Governance */}
          <div className="skill-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-neutral-900" />
                <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
                  ML Early Warning Model
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/50">
                Calibrated
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Model Version
                </span>
                <span className="text-xs font-mono font-bold text-neutral-900">
                  {mlModelInfo?.model_version || "day30_early_warning_v1"}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Platt-Calibrated Threshold
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xl font-extrabold text-neutral-900">
                    {mlModelInfo?.threshold ?? 0.46}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sensitivity 89%</span>
                  </span>
                </div>
                <div className="mt-1.5">
                  <SkillHubProgressBar progress={46} heightClass="h-2" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-[11px] text-neutral-600 leading-relaxed">
                Inference outputs generate Evidence Cards for human review. No automated action is triggered without educator rationale.
              </div>
            </div>
          </div>

          {/* Card 2: Deterministic Policy Engine Rules */}
          <div className="skill-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-neutral-900" />
                <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
                  Policy Engine Rule
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
                <span className="font-mono text-[11px] font-bold text-neutral-900 block">
                  ug_attendance_academic_v1
                </span>
                <p className="text-[11px] text-neutral-500">
                  Attendance &lt; 75% + 2 consecutive missed quiz submissions triggers review queue.
                </p>
              </div>

              <div className="flex items-center justify-between text-neutral-500 text-[11px] pt-1">
                <span>Evaluation Cutoff:</span>
                <span className="font-mono font-semibold text-neutral-800">
                  Day 30 (Temporal UTC)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
