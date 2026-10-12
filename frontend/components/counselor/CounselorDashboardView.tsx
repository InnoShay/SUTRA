"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import {
  HeartHandshake,
  PhoneCall,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Video,
  UserCheck,
  ShieldAlert,
  ChevronRight,
  Filter,
  FileText,
  MessageSquare,
  ArrowUpRight,
  Sparkles,
  Building,
  User,
  Activity,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { CounselorStatusBadge } from "./CounselorStatusBadge";
import { ContactAuthorityModal } from "./ContactAuthorityModal";
import { CounselorOnboardingModal } from "./CounselorOnboardingModal";
import { UrgentSupportBanner } from "./UrgentSupportBanner";
import { CounselorCallRequestDTO, CaseDetailDTO, CaseState } from "@/lib/types";

export function CounselorDashboardView() {
  const {
    user,
    students,
    cases,
    signals,
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
  const [selectedCaseForAction, setSelectedCaseForAction] = useState<CaseDetailDTO | null>(
    null
  );
  const [targetStudentForEscalation, setTargetStudentForEscalation] = useState<{
    caseId?: string;
    studentId?: string;
    studentName?: string;
  } | null>(null);

  // Note recording in drawer
  const [followUpNote, setFollowUpNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Compute live operational metrics
  const pendingCallRequests = callRequests.filter(
    (r) => r.status === "requested" || r.status === "assigned"
  );
  const highPriorityCases = cases.filter(
    (c) => c.is_escalated || c.state === "FOLLOW_UP_REQUIRED"
  );
  const openCases = cases.filter((c) => c.state !== "CLOSED" && c.state !== "RESOLVED");

  // Assigned students count (unique students in open cases or call requests)
  const assignedStudentIds = new Set([
    ...cases.map((c) => c.student_id),
    ...callRequests.map((r) => r.student_id),
  ]);

  // Follow-ups due (cases requiring follow up)
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
      {/* 1. TOP HEADER: Welcome Title, Counselor Identity, Status, and Direct Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
              Welcome back, {counselorProfile?.full_name || user.fullName || "Dr. Meera Nambiar"}!
            </h1>
            <CounselorStatusBadge
              status={counselorProfile?.onboarding_status || "APPROVED"}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
            <span className="font-medium text-neutral-700">
              {counselorProfile?.designation || "Senior Clinical Counselor & Student Wellbeing Lead"}
            </span>
            <span>•</span>
            <span className="text-neutral-600">
              {counselorProfile?.department || "Student Wellness Center"}
            </span>
            <span>•</span>
            <span className="font-medium text-neutral-600">
              {activeCampusName || counselorProfile?.campus_name || "Apex University Main Campus"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Availability Status Selector */}
          <div className="inline-flex items-center gap-1.5 p-1 bg-neutral-100 rounded-full border border-neutral-200/70 text-xs">
            <button
              onClick={() => setAvailability("available")}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-medium transition-all ${
                availability === "available"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Available</span>
            </button>
            <button
              onClick={() => setAvailability("in_session")}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-medium transition-all ${
                availability === "in_session"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>In Session</span>
            </button>
            <button
              onClick={() => setAvailability("away")}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-medium transition-all ${
                availability === "away"
                  ? "bg-white text-neutral-700 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-neutral-400" />
              <span>Away</span>
            </button>
          </div>

          {/* Quick Escalate Action */}
          <button
            onClick={() => handleOpenEscalation()}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-xs transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Contact Authority</span>
          </button>

          {/* Onboarding Profile Button */}
          <button
            onClick={() => setIsOnboardingModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-xs transition-all"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Counselor Profile</span>
          </button>
        </div>
      </div>

      {/* 2. URGENT 24/7 CAMPUS CRISIS BANNER */}
      <UrgentSupportBanner onOpenEscalationModal={() => handleOpenEscalation()} />

      {/* 3. OVERVIEW METRICS: Accurate, Live Support & Wellbeing Counts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Assigned Students
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {assignedStudentIds.size}
          </p>
          <p className="text-[11px] text-neutral-400">Across active cases</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Awaiting Contact
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {pendingCallRequests.length}
          </p>
          <p className="text-[11px] text-amber-600 font-medium">
            {pendingCallRequests.length > 0 ? "Requires contact SLA" : "Queue clear"}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Pending Requests
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {callRequests.filter((r) => r.status === "requested").length}
          </p>
          <p className="text-[11px] text-neutral-400">Student self-service</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
            High Priority
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {highPriorityCases.length}
          </p>
          <p className="text-[11px] text-rose-600 font-medium">Critical focus</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Follow-Ups Due
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {followUpsDue.length}
          </p>
          <p className="text-[11px] text-neutral-400">Scheduled checks</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Escalations
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            {escalations.length}
          </p>
          <p className="text-[11px] text-neutral-400">Authority transfers</p>
        </div>
      </div>

      {/* 4. WORKSPACE TABS & FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/70 pb-3">
        <div className="inline-flex p-1 bg-neutral-100 rounded-full border border-neutral-200/60 shadow-2xs">
          <button
            onClick={() => setActiveTab("call-requests")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "call-requests"
                ? "bg-white text-neutral-950 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-amber-600" />
            <span>Call Requests</span>
            {pendingCallRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingCallRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("active-cases")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "active-cases"
                ? "bg-white text-neutral-950 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-blue-600" />
            <span>Support Cases</span>
            <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-700 text-[10px] flex items-center justify-center font-bold">
              {openCases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("follow-ups")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "follow-ups"
                ? "bg-white text-neutral-950 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Follow-Up Schedule</span>
            {followUpsDue.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-bold">
                {followUpsDue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("escalations")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === "escalations"
                ? "bg-white text-neutral-950 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Authority Escalations</span>
            <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-700 text-[10px] flex items-center justify-center font-bold">
              {escalations.length}
            </span>
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-500 font-medium">Status Filter:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-400"
          >
            <option value="ALL">All Cases</option>
            <option value="CRITICAL">Escalated Only</option>
            <option value="FOLLOW_UP">Follow-Up Required</option>
          </select>
        </div>
      </div>

      {/* 5. TAB CONTENT: CALL REQUESTS */}
      {activeTab === "call-requests" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Student Counselor Call Requests
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Voluntary contact requests submitted by students crossing risk thresholds or requesting consultation.
              </p>
            </div>
          </div>

          {callRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-900">
                All counselor call requests have been resolved
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                New threshold-triggered or self-service student requests will appear here immediately.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {callRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-3.5 hover:border-neutral-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-neutral-900">
                          {req.student_name}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          ({req.student_id})
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Requested: {new Date(req.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.status === "requested"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : req.status === "contact_attempted"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : req.status === "contact_completed"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                      }`}
                    >
                      {req.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-50/80 rounded-xl space-y-1.5 text-xs text-neutral-700">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Contact Method:</span>
                      <span className="font-medium capitalize flex items-center gap-1">
                        {req.preferred_contact_method === "phone" ? (
                          <Phone className="w-3 h-3 text-emerald-600" />
                        ) : req.preferred_contact_method === "video" ? (
                          <Video className="w-3 h-3 text-blue-600" />
                        ) : (
                          <Building className="w-3 h-3 text-purple-600" />
                        )}
                        {req.preferred_contact_method}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Preferred Time:</span>
                      <span className="font-medium text-neutral-800">
                        {req.preferred_time_slot.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Attempts Logged:</span>
                      <span className="font-semibold text-neutral-900">
                        {req.contact_attempt_count}
                      </span>
                    </div>

                    {req.student_notes && (
                      <div className="pt-1.5 border-t border-neutral-200/60">
                        <span className="text-[11px] text-neutral-400 block mb-0.5">
                          Student&apos;s voluntary context:
                        </span>
                        <p className="text-neutral-800 text-xs italic bg-white p-2 rounded-lg border border-neutral-200/50">
                          &ldquo;{req.student_notes}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions for this call request */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:+918005550199`}
                        onClick={() => handleRecordCallAttempt(req)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Direct Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>

                      <button
                        onClick={() => handleRecordCallAttempt(req)}
                        className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-medium transition-colors"
                      >
                        Log Attempt
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMarkCallCompleted(req)}
                        className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Resolve
                      </button>

                      <button
                        onClick={() =>
                          handleOpenEscalation(req.student_id, req.student_name, req.case_id)
                        }
                        className="p-2 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Escalate to Authority"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB CONTENT: ASSIGNED CASES */}
      {activeTab === "active-cases" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Wellbeing &amp; Support Cases
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Active cases with canonical 10-state lifecycle, intervention plans, and confidential counseling updates.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Case State</th>
                    <th className="py-3 px-4">Urgency</th>
                    <th className="py-3 px-4">Intervention Plan</th>
                    <th className="py-3 px-4">Assigned Mentor / Lead</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-900">{c.student_display_name}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">{c.student_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                          {c.state}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.is_escalated
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : c.state === "FOLLOW_UP_REQUIRED"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
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
                          className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-medium transition-colors"
                        >
                          Record Note
                        </button>
                        <button
                          onClick={() => handleOpenEscalation(c.student_id, c.student_display_name, c.id)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full text-xs font-semibold transition-colors"
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

      {/* 7. TAB CONTENT: FOLLOW-UPS */}
      {activeTab === "follow-ups" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Follow-Up &amp; Session Management
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tracks scheduled follow-up check-ins, student wellbeing evaluations, and post-intervention milestones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases
              .filter((c) => c.state === "FOLLOW_UP_REQUIRED" || c.state === "IN_PROGRESS")
              .map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-neutral-900">{c.student_display_name}</h3>
                      <p className="text-xs text-neutral-500">Case ID: {c.id}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Follow-Up Required
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl text-xs space-y-1.5 text-neutral-700">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Target Protocol:</span>
                      <span className="font-medium">
                        {c.selected_intervention_key ? c.selected_intervention_key.replace("_", " ") : "Wellbeing Check-in"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Due Window:</span>
                      <span className="font-medium text-neutral-900">Within 48 hours</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
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
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold transition-colors"
                    >
                      Complete &amp; Resolve
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 8. TAB CONTENT: ESCALATIONS LOG */}
      {activeTab === "escalations" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Institutional Authority Escalation Log
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Auditable records of contact made with counseling supervisors, student affairs, academic heads, and emergency units.
              </p>
            </div>
            <button
              onClick={() => handleOpenEscalation()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Record New Escalation</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Escalation ID</th>
                    <th className="py-3 px-4">Student &amp; Case</th>
                    <th className="py-3 px-4">Institutional Authority</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Reason &amp; Rationale</th>
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
                        <div className="text-[11px] text-neutral-400 font-mono">{esc.case_id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-800">
                        {esc.authority_name}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-neutral-600">
                        {esc.escalation_category.replace("_", " ")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 capitalize">
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

      {/* 9. MODALS: Escalation & Onboarding */}
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

      {/* 10. RECORD CASE NOTE DRAWER / MODAL */}
      {selectedCaseForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-neutral-900">
                  Record Confidential Case Note
                </h3>
                <p className="text-xs text-neutral-500">
                  {selectedCaseForAction.student_display_name} ({selectedCaseForAction.student_id})
                </p>
              </div>
              <button
                onClick={() => setSelectedCaseForAction(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Counselor Note / Interaction Summary
                </label>
                <textarea
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  rows={4}
                  placeholder="Record summary of consultation, student responsiveness, and agreed support plan..."
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl text-[11px] text-neutral-500 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Notes are stored with restricted counseling access under institutional privacy governance.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setSelectedCaseForAction(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-xl"
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
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl shadow-xs"
              >
                Save Confidential Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
