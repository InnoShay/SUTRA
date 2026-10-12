"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { CounselorStatusBadge } from "./CounselorStatusBadge";
import { ContactAuthorityModal } from "./ContactAuthorityModal";
import { CounselorOnboardingModal } from "./CounselorOnboardingModal";
import { CounselorCallRequestDTO, CaseDetailDTO } from "@/lib/types";

export function CounselorDashboardView() {
  const {
    user,
    students,
    cases,
    counselorProfile,
    callRequests,
    escalations,
    activeCampusName,
    updateCallRequestStatus,
    transitionCase,
    recordCaseFollowUp,
  } = useSkillHub();

  const [activeTab, setActiveTab] = useState<
    "call-requests" | "active-cases" | "follow-ups" | "escalations"
  >("call-requests");

  const [availability, setAvailability] = useState<"available" | "in_session" | "away">(
    "available"
  );
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Modals state
  const [isAuthorityModalOpen, setIsAuthorityModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [targetStudentForEscalation, setTargetStudentForEscalation] = useState<{
    studentId: string;
    studentName: string;
    caseId?: string;
  } | null>(null);

  // Selected case for quick note/drawer
  const [selectedCaseForAction, setSelectedCaseForAction] = useState<CaseDetailDTO | null>(null);
  const [followUpNote, setFollowUpNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Derived metrics
  const assignedStudentIds = new Set(cases.map((c) => c.student_id));
  const pendingCallRequests = callRequests.filter(
    (r) => r.status === "requested" || r.status === "contact_attempted"
  );
  const openCases = cases.filter((c) => c.state !== "RESOLVED" && c.state !== "CLOSED");
  const highPriorityCases = cases.filter(
    (c) => c.is_escalated || c.state === "FOLLOW_UP_REQUIRED"
  );

  const followUpsDue = cases.filter(
    (c) =>
      c.state === "FOLLOW_UP_REQUIRED" ||
      (c.due_at && new Date(c.due_at) <= new Date(Date.now() + 86400000 * 3))
  );

  const handleOpenEscalation = (studentId?: string, studentName?: string, caseId?: string) => {
    setTargetStudentForEscalation({
      studentId: studentId || "SYN-1007",
      studentName: studentName || "Asha (synthetic)",
      caseId: caseId || "CASE-SYN-1007",
    });
    setIsAuthorityModalOpen(true);
  };

  const handleRecordCallAttempt = async (req: CounselorCallRequestDTO) => {
    await updateCallRequestStatus(
      req.id,
      "contact_attempted",
      `Call attempt logged by ${counselorProfile?.full_name || user.fullName} on ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      true
    );
  };

  const handleMarkCallCompleted = async (req: CounselorCallRequestDTO) => {
    await updateCallRequestStatus(
      req.id,
      "contact_completed",
      `Support consultation completed by ${counselorProfile?.full_name || user.fullName}. Next steps documented.`
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER: Clean, Sharp, Minimal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight font-heading">
              Welcome back, {counselorProfile?.full_name || user.fullName || "Dr. Meera Nambiar"}
            </h1>
            <CounselorStatusBadge
              status={counselorProfile?.onboarding_status || "APPROVED"}
            />
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-neutral-100 text-neutral-700 border border-neutral-300">
              PR #7 • Authored by Aryan
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
            <span className="font-medium text-neutral-700">
              {counselorProfile?.designation || "Senior Clinical Counselor & Student Wellbeing Lead"}
            </span>
            <span>•</span>
            <span className="text-neutral-500">
              {counselorProfile?.department || "Student Wellness Center"}
            </span>
            <span>•</span>
            <span className="text-neutral-500">
              {activeCampusName || counselorProfile?.campus_name || "Apex University Main Campus"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Availability Segmented Control */}
          <div className="inline-flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200 text-xs">
            <button
              onClick={() => setAvailability("available")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                availability === "available"
                  ? "bg-white text-neutral-900 shadow-xs font-semibold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Available
            </button>
            <button
              onClick={() => setAvailability("in_session")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                availability === "in_session"
                  ? "bg-white text-neutral-900 shadow-xs font-semibold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              In Session
            </button>
            <button
              onClick={() => setAvailability("away")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                availability === "away"
                  ? "bg-white text-neutral-900 shadow-xs font-semibold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Away
            </button>
          </div>

          <button
            onClick={() => handleOpenEscalation()}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-all"
          >
            Contact Authority
          </button>

          <Link
            href="/schedule"
            className="px-3.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-lg text-xs font-medium transition-all"
          >
            Call Schedule
          </Link>

          <button
            onClick={() => setIsOnboardingModalOpen(true)}
            className="px-3.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-lg text-xs font-medium transition-all"
          >
            Counselor Profile
          </button>
        </div>
      </div>

      {/* 2. OVERVIEW METRICS: ONLY WHITE AND BLACK, NO TEXT BUBBLES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-1">
          <p className="text-xs font-medium text-neutral-500">
            Assigned Students
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {assignedStudentIds.size}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-1">
          <p className="text-xs font-medium text-neutral-500">
            Awaiting Contact
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {pendingCallRequests.length}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-1">
          <p className="text-xs font-medium text-neutral-500">
            Pending Requests
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {callRequests.filter((r) => r.status === "requested").length}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-1">
          <p className="text-xs font-medium text-neutral-500">
            High Priority
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {highPriorityCases.length}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-1">
          <p className="text-xs font-medium text-neutral-500">
            Follow-Ups Due
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {followUpsDue.length}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-neutral-200 space-y-1">
          <p className="text-xs font-medium text-neutral-500">
            Escalations
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {escalations.length}
          </p>
        </div>
      </div>

      {/* 3. WORKSPACE TABS & FILTER BAR (Clean underline tabs, no bubbles) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200">
        <div className="flex items-center gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("call-requests")}
            className={`pb-3 text-xs font-medium transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "call-requests"
                ? "border-neutral-900 text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <span>Call Requests</span>
            {pendingCallRequests.length > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 bg-neutral-100 text-neutral-800 rounded">
                {pendingCallRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("active-cases")}
            className={`pb-3 text-xs font-medium transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "active-cases"
                ? "border-neutral-900 text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <span>Support Cases</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-neutral-100 text-neutral-800 rounded">
              {openCases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("follow-ups")}
            className={`pb-3 text-xs font-medium transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "follow-ups"
                ? "border-neutral-900 text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <span>Follow-Up Schedule</span>
            {followUpsDue.length > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 bg-neutral-100 text-neutral-800 rounded">
                {followUpsDue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("escalations")}
            className={`pb-3 text-xs font-medium transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "escalations"
                ? "border-neutral-900 text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <span>Authority Escalations</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-neutral-100 text-neutral-800 rounded">
              {escalations.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2 sm:pb-3 text-xs">
          <span className="text-neutral-500">Status:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-neutral-200 rounded-md text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
          >
            <option value="ALL">All Cases</option>
            <option value="CRITICAL">Escalated Only</option>
            <option value="FOLLOW_UP">Follow-Up Required</option>
          </select>
        </div>
      </div>

      {/* 4. TAB CONTENT: CALL REQUESTS */}
      {activeTab === "call-requests" && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Student Counselor Call Requests
          </h2>

          {callRequests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-neutral-200 text-xs text-neutral-500">
              No active call requests pending.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {callRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-neutral-900">
                          {req.student_name}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">
                          {req.student_id}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded border border-neutral-200 text-[10px] font-mono font-medium uppercase tracking-wider text-neutral-700">
                      {req.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 text-neutral-600">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Contact Method</span>
                      <span className="font-medium text-neutral-900 capitalize">
                        {req.preferred_contact_method}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Preferred Time</span>
                      <span className="font-medium text-neutral-900">
                        {req.preferred_time_slot.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Attempts Logged</span>
                      <span className="font-mono text-neutral-900">
                        {req.contact_attempt_count}
                      </span>
                    </div>

                    {req.student_notes && (
                      <p className="text-xs text-neutral-700 pt-1.5 border-t border-neutral-100">
                        &ldquo;{req.student_notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:+918005550199`}
                        onClick={() => handleRecordCallAttempt(req)}
                        className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors"
                      >
                        Call
                      </a>

                      <button
                        onClick={() => handleRecordCallAttempt(req)}
                        className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-50 text-neutral-800 rounded-md text-xs font-medium transition-colors"
                      >
                        Log Attempt
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMarkCallCompleted(req)}
                        className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-50 text-neutral-800 rounded-md text-xs font-medium transition-colors"
                      >
                        Resolve
                      </button>

                      <button
                        onClick={() =>
                          handleOpenEscalation(req.student_id, req.student_name, req.case_id)
                        }
                        className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-50 text-neutral-800 rounded-md text-xs font-medium transition-colors"
                      >
                        Escalate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT: ASSIGNED CASES */}
      {activeTab === "active-cases" && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Wellbeing &amp; Support Cases
          </h2>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Case State</th>
                    <th className="py-3 px-4">Urgency</th>
                    <th className="py-3 px-4">Intervention Plan</th>
                    <th className="py-3 px-4">Assigned Mentor</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-900">{c.student_display_name}</div>
                        <div className="text-xs text-neutral-400 font-mono">{c.student_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded border border-neutral-200 text-[10px] font-mono font-medium text-neutral-700">
                          {c.state}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded border border-neutral-200 text-[10px] font-mono font-medium text-neutral-700">
                          {c.is_escalated ? "ESCALATED" : c.state === "FOLLOW_UP_REQUIRED" ? "HIGH" : "STANDARD"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-neutral-800 capitalize">
                          {c.selected_intervention_key ? c.selected_intervention_key.replace("_", " ") : "Initial Assessment"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {c.primary_owner_user_id || counselorProfile?.full_name || "Counseling Lead"}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedCaseForAction(c)}
                          className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-50 text-neutral-800 rounded-md text-xs font-medium transition-colors"
                        >
                          Record Note
                        </button>
                        <button
                          onClick={() => handleOpenEscalation(c.student_id, c.student_display_name, c.id)}
                          className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-50 text-neutral-800 rounded-md text-xs font-medium transition-colors"
                        >
                          Escalate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: FOLLOW-UPS */}
      {activeTab === "follow-ups" && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Follow-Up Management
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases
              .filter((c) => c.state === "FOLLOW_UP_REQUIRED" || c.state === "IN_PROGRESS")
              .map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-neutral-900">{c.student_display_name}</h3>
                      <p className="text-xs text-neutral-400 font-mono">Case: {c.id}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded border border-neutral-200 text-[10px] font-mono font-medium text-neutral-700">
                      Follow-Up Required
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-neutral-600">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Target Protocol:</span>
                      <span className="font-medium text-neutral-900">
                        {c.selected_intervention_key ? c.selected_intervention_key.replace("_", " ") : "Wellbeing Check-in"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Due Window:</span>
                      <span className="font-medium text-neutral-900">Within 48 hours</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-neutral-100">
                    <button
                      onClick={() => {
                        recordCaseFollowUp(c.id, {
                          follow_up_type: "in_person",
                          contact_status: "completed",
                          proof_kind: "counselor_log",
                          occurred_at: new Date().toISOString(),
                          note: "Check-in completed. Student reporting improved confidence.",
                        });
                        transitionCase(c.id, {
                          to_state: "RESOLVED",
                          reason_code: "follow_up_successful",
                          metadata: { note: "Student concerns resolved with counselor guidance." },
                        });
                      }}
                      className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors"
                    >
                      Complete &amp; Resolve
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT: ESCALATIONS LOG */}
      {activeTab === "escalations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              Institutional Authority Escalation Log
            </h2>
            <button
              onClick={() => handleOpenEscalation()}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors"
            >
              Record New Escalation
            </button>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Escalation ID</th>
                    <th className="py-3 px-4">Student &amp; Case</th>
                    <th className="py-3 px-4">Authority</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {escalations.map((esc) => (
                    <tr key={esc.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-neutral-600">
                        {esc.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-900">{esc.student_name}</div>
                        <div className="text-xs text-neutral-400 font-mono">{esc.case_id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-800">
                        {esc.authority_name}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-neutral-600">
                        {esc.escalation_category.replace("_", " ")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded border border-neutral-200 text-[10px] font-mono font-medium text-neutral-700 capitalize">
                          {esc.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500">
                        {new Date(esc.timestamp).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-700 max-w-xs truncate" title={esc.reason}>
                        {esc.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODALS: Escalation & Onboarding */}
      <ContactAuthorityModal
        isOpen={isAuthorityModalOpen}
        onClose={() => {
          setIsAuthorityModalOpen(false);
          setTargetStudentForEscalation(null);
        }}
        caseId={targetStudentForEscalation?.caseId || "CASE-SYN-1007"}
        studentId={targetStudentForEscalation?.studentId || "SYN-1007"}
        studentName={targetStudentForEscalation?.studentName || "Asha (synthetic)"}
      />

      <CounselorOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
      />

      {/* 9. RECORD CASE NOTE MODAL */}
      {selectedCaseForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  Record Case Note
                </h3>
                <p className="text-xs text-neutral-400">
                  {selectedCaseForAction.student_display_name} ({selectedCaseForAction.student_id})
                </p>
              </div>
              <button
                onClick={() => setSelectedCaseForAction(null)}
                className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1">
                  Counselor Note
                </label>
                <textarea
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  rows={4}
                  placeholder="Record summary of consultation..."
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:border-neutral-900"
                />
              </div>

              <p className="text-[11px] text-neutral-400">
                Notes are confidential and stored under institutional governance.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setSelectedCaseForAction(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-md"
              >
                Cancel
              </button>
              <button
                disabled={!followUpNote.trim() || isSubmittingNote}
                onClick={async () => {
                  setIsSubmittingNote(true);
                  try {
                    await recordCaseFollowUp(selectedCaseForAction.id, {
                      follow_up_type: "in_person",
                      contact_status: "completed",
                      proof_kind: "counselor_log",
                      occurred_at: new Date().toISOString(),
                      note: followUpNote,
                    });
                    setSelectedCaseForAction(null);
                    setFollowUpNote("");
                  } finally {
                    setIsSubmittingNote(false);
                  }
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-md transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
