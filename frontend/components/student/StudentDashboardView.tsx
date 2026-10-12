"use client";

import React from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import {
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  HeartHandshake,
  ArrowUpRight,
} from "lucide-react";

export function StudentDashboardView() {
  const { user, currentPersona, cases, activeCampusName } = useSkillHub();

  // Authenticated student reference (defaults to Asha SYN-1007 for demo)
  const studentId = currentPersona?.userId || "SYN-1007";

  // Filter cases belonging to this student
  const studentCases = cases.filter(
    (c) => c.student_id === studentId || c.external_student_ref === studentId
  );

  // Tasks / Next Steps
  const nextSteps = studentCases.flatMap((c) =>
    (c.tasks || []).map((t) => ({
      ...t,
      caseId: c.id,
      caseTitle: c.selected_intervention_key
        ? c.selected_intervention_key.replace(/_/g, " ")
        : "Academic Support Plan",
    }))
  );

  // Recent activity events across the student's cases
  const recentEvents = studentCases.flatMap((c) =>
    (c.events || []).map((e) => ({
      ...e,
      caseId: c.id,
    }))
  );

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER: Welcome Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            Welcome back, {user.name}!
          </h1>
          <p className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Enrolled Student</span>
            <span>•</span>
            <span className="font-medium text-neutral-700">Cohort CS-Y2</span>
            <span>•</span>
            <span className="text-neutral-600">
              {activeCampusName || "Apex University Main Campus"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/request-support"
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all min-h-[42px]"
          >
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span>Request Support</span>
          </Link>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN GRID: Left (Support Cases & Activity) | Right (Next Steps & Mentor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 8 cols */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Section: My Support Cases */}
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-bold text-neutral-900 font-heading">
                  My Support Cases
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Track ongoing academic mentorship, tutoring, and student welfare requests.
                </p>
              </div>
              <Link
                href="/cases"
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 hover:underline"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {studentCases.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-900">
                  No active support cases
                </p>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  You do not have any pending academic or wellbeing support requests.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentCases.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-neutral-50/70 hover:bg-neutral-50 rounded-2xl border border-neutral-200/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900 break-words">
                          {c.selected_intervention_key
                            ? c.selected_intervention_key
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())
                            : "Academic Tutoring & Mentorship"}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          ({c.id})
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                        <span>
                          Created:{" "}
                          <span className="text-neutral-600 font-normal">
                            {new Date(c.created_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </span>
                        <span>•</span>
                        <span>
                          Status:{" "}
                          <span className="font-semibold text-neutral-800">
                            {c.state.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </span>
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Link
                        href={`/cases/${c.id}`}
                        className="w-full sm:w-auto text-center px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 transition-colors shadow-2xs"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Recent Activity */}
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                Recent Activity
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Timeline of updates, assigned mentors, and verified progress.
              </p>
            </div>

            {recentEvents.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center italic">
                No recent activity recorded.
              </p>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-neutral-100">
                {recentEvents.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="relative flex items-start gap-3.5 pl-1">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-neutral-300 flex items-center justify-center shrink-0 mt-0.5 z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-semibold text-neutral-800">
                        {evt.event_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {new Date(evt.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 4 cols */}
        <div className="lg:col-span-4 space-y-6 min-w-0">
          {/* Section: Your Next Steps */}
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                Your Next Steps
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Scheduled check-ins and action items prepared by your assigned mentor.
              </p>
            </div>

            {nextSteps.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center italic">
                No immediate follow-ups scheduled. Check back after your next consultation.
              </p>
            ) : (
              <div className="space-y-2.5">
                {nextSteps.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl mt-0.5 shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-semibold text-neutral-900">
                          {task.generic_label}
                        </h3>
                        <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                          Part of: {task.caseTitle}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Target Timeline:{" "}
                          <span className="font-medium text-neutral-600">
                            Within 48 hours
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-neutral-700 shrink-0 pt-0.5">
                      {task.state.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Assigned Faculty Mentor */}
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                Assigned Faculty Mentor
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Direct advisor assigned for academic guidance and support.
              </p>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-700 font-bold text-xs shrink-0">
                AS
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  Prof. Ananya Sharma
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  Course Instructor &amp; Mentor
                </p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed pt-2 border-t border-neutral-100">
              Department of Computer Science • Office Hours:{" "}
              <span className="font-medium text-neutral-700">Tue/Thu 14:00 - 16:00</span>
            </p>
            <div className="pt-1">
              <Link
                href="/messages"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 hover:text-neutral-950 hover:underline"
              >
                <span>Send Message</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
