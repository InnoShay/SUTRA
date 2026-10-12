"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import {
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  HeartHandshake,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  PhoneCall,
  User,
  ArrowUpRight,
} from "lucide-react";
import { RequestCounselorCallModal } from "@/components/RequestCounselorCallModal";

export function StudentDashboardView() {
  const { user, currentPersona, cases, callRequests, activeCampusName } = useSkillHub();
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

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

  // Active call request for this student
  const activeCallReq = callRequests.find(
    (r) =>
      (r.student_id === studentId || r.external_student_ref === studentId) &&
      r.status !== "closed"
  );

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER: Welcome Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
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
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-xs transition-all min-h-[42px]"
          >
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span>Request Support</span>
          </Link>
        </div>
      </div>

      {/* 2. MAIN GRID: Left (Cases & Next Steps) | Right (Need Help card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section: My Cases */}
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
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900">
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
                      <p className="text-xs text-neutral-500 flex items-center gap-2">
                        <span>
                          Created: {new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                        <span>•</span>
                        <span>
                          Status:{" "}
                          <span className="font-semibold text-neutral-800">
                            {c.state.replace(/_/g, " ")}
                          </span>
                        </span>
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Link
                        href={`/cases/${c.id}`}
                        className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-full text-xs font-semibold text-neutral-800 transition-colors shadow-2xs"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                    className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-3"
                  >
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl mt-0.5 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-neutral-900">
                        {task.generic_label}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Part of: {task.caseTitle} • Target Timeline: Within 48 hours
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200/70 text-neutral-700 shrink-0">
                      {task.state}
                    </span>
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
                        {evt.event_type.replace(/_/g, " ")}
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
        <div className="lg:col-span-4 space-y-6">
          {/* Card: Need Help? */}
          <div className="skill-card bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 font-heading">
                  Need Assistance?
                </h3>
                <p className="text-xs text-neutral-500">
                  Campus support services are free and confidential.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              If you are experiencing academic difficulty, attendance challenges, or personal stress,
              you can connect with your assigned faculty mentor or request contact from a counselor.
            </p>

            <div className="space-y-2 pt-2">
              <Link
                href="/request-support"
                className="w-full px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
                <span>Submit Support Request</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsCallModalOpen(true)}
                className="w-full px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  {activeCallReq ? "Call Request Active" : "Request a Counselor Call"}
                </span>
              </button>
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-[11px] text-neutral-500 space-y-1">
              <span className="font-semibold text-neutral-700 block">
                Campus Crisis Line:
              </span>
              <p>
                Available 24/7 for health emergencies at{" "}
                <a
                  href="tel:+918023459999"
                  className="font-bold text-rose-700 hover:underline"
                >
                  +91 80 2345 9999
                </a>
                .
              </p>
            </div>
          </div>

          {/* Card: Assigned Mentor Information */}
          <div className="skill-card bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 font-heading">
              Assigned Faculty Mentor
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 font-bold text-xs">
                AS
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate">
                  Prof. Ananya Sharma
                </p>
                <p className="text-[11px] text-neutral-500 truncate">
                  Course Instructor &amp; Mentor
                </p>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed pt-1 border-t border-neutral-100">
              Department of Computer Science • Office Hours: Tue/Thu 14:00 - 16:00
            </p>
            <Link
              href="/messages"
              className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1 hover:underline pt-1"
            >
              <span>Send Message</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Modal: Counselor Call Request */}
      <RequestCounselorCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        studentId={studentId}
        studentName={user.fullName || user.name || "Asha"}
        caseId={studentCases[0]?.id || "CASE-SYN-1007"}
        signalId="SIG-SYN-1007"
        riskScore={0.68}
      />
    </div>
  );
}
