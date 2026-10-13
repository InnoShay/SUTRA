"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSkillHub } from "@/lib/store";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HeartHandshake,
  MessageSquare,
  Shield,
  User,
  AlertCircle,
  Send,
  Plus,
} from "lucide-react";
import { api, isDemoMode } from "@/lib/api";
import { DEMO_CASES } from "@/lib/skillhub-data";

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = (params?.id as string) || "CASE-SYN-1007";
  const { cases, user, activeRole, currentPersona, createCaseTask, sendMessageToStudent } = useSkillHub();

  const isStudent = activeRole === "student";
  const studentId = currentPersona?.userId || "SYN-1007";

  // Strictly locate matched case without fallback to cases[0]
  const matchedCase = isStudent
    ? cases.find(
        (c) =>
          c.id === caseId &&
          (c.student_id === studentId || c.external_student_ref === studentId || c.student_id === "SYN-1007" || c.external_student_ref === "SYN-1007")
      ) ||
      (isDemoMode()
        ? DEMO_CASES.find(
            (c) =>
              c.id === caseId &&
              (c.student_id === "SYN-1007" || c.external_student_ref === "SYN-1007")
          ) || null
        : null)
    : cases.find((c) => c.id === caseId) ||
      (isDemoMode() ? DEMO_CASES.find((c) => c.id === caseId) || null : null);

  const [newMessage, setNewMessage] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [messages, setMessages] = useState<
    { id: string; sender: string; time: string; text: string; isStudent: boolean }[]
  >([
    {
      id: "m-1",
      sender: "Prof. Ananya Sharma",
      time: "Oct 11, 14:30",
      text: "Hello Asha. I reviewed your recent lab check-in. Let's meet on Tuesday at 17:30 to walk through the week 3 exercises together.",
      isStudent: false,
    },
    {
      id: "m-2",
      sender: "Asha (synthetic)",
      time: "Oct 11, 15:10",
      text: "Thank you Professor Sharma. Tuesday works well for me. I will bring my problem set draft.",
      isStudent: true,
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !matchedCase) return;

    const messageText = newMessage.trim();
    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: user.fullName || user.name || "Student",
        time: "Just now",
        text: messageText,
        isStudent: true,
      },
    ]);
    sendMessageToStudent(matchedCase.student_id, messageText);
    api.proposed.sendCaseMessage(matchedCase.id, { text: messageText }).catch(console.warn);
    setNewMessage("");
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !matchedCase) return;
    try {
      await createCaseTask(matchedCase.id, {
        generic_label: newTaskTitle.trim(),
        domain: "academic",
        due_at: new Date(Date.now() + 86400000 * 2).toISOString(),
      });
      setNewTaskTitle("");
      setIsAddingTask(false);
    } catch (err: any) {
      console.warn("Failed to create task", err);
    }
  };

  if (!matchedCase) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200/80 max-w-xl mx-auto space-y-4 my-8">
        <AlertCircle className="w-10 h-10 text-neutral-400 mx-auto" />
        <h2 className="text-base font-bold text-neutral-900">
          {isStudent ? "Case Not Accessible" : "Case Not Found"}
        </h2>
        <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
          {isStudent
            ? "The requested support case could not be located or does not belong to your student account."
            : "The requested support case could not be located in the current campus context."}
        </p>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cases</span>
        </Link>
      </div>
    );
  }

  const isResolved =
    matchedCase.state === "RESOLVED" || matchedCase.state === "CLOSED";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Link
          href="/cases"
          className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 font-medium hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cases</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-neutral-400">{matchedCase.id}</span>
      </div>

      {/* Case Header Card */}
      <div className="skill-card bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight font-heading">
                {matchedCase.selected_intervention_key
                  ? matchedCase.selected_intervention_key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                  : "Academic Support & Mentorship Plan"}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isResolved ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span>{matchedCase.state.replace(/_/g, " ")}</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 flex items-center gap-2">
              <span>Case ID: <strong className="font-mono text-neutral-700">{matchedCase.id}</strong></span>
              <span>•</span>
              <span>Opened on: {new Date(matchedCase.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium">
              Assigned Mentor: <strong className="text-neutral-800 font-semibold">{matchedCase.primary_owner_user_id || "Faculty Mentor"}</strong>
            </span>
          </div>
        </div>

        {/* Permitted Case Scope & Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Plan Objective &amp; Support Scope
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50/80 p-4 rounded-2xl border border-neutral-200/60">
            Assistance allocated under institutional student support framework. The goal is to provide structured mentorship check-ins, coursework guidance, and subject-matter assistance.
          </p>
        </div>
      </div>

      {/* Grid: Left (Actionable Milestones & Timeline) | Right (Messages) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Milestones */}
        <div className="lg:col-span-7 space-y-6">
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-neutral-100 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-900 font-heading">
                  Action Items &amp; Next Steps
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Tasks arranged by your mentor to support your academic progress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Inline Task Creation Form */}
            {isAddingTask && (
              <form onSubmit={handleCreateTask} className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">New Support Action Item</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-700"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Enter action item description..."
                    className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {(matchedCase.tasks || []).length === 0 ? (
                <div className="p-4 rounded-2xl bg-neutral-50/60 border border-dashed border-neutral-200 text-center text-xs text-neutral-400">
                  No action items assigned yet. Click "Add Item" above to create one.
                </div>
              ) : (
                (matchedCase.tasks || []).map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-neutral-50/80 rounded-2xl border border-neutral-200/60 flex items-start gap-3"
                  >
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl mt-0.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-neutral-900">
                        {t.generic_label}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Target Window: Within 48 hours • Assignee: Faculty Mentor
                      </p>
                    </div>
                    <span className="text-xs font-mono text-neutral-500 shrink-0">
                      {t.state}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity History */}
          <div className="skill-card bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-900 font-heading">
                Case Activity
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Audited milestones and updates recorded on this support case.
              </p>
            </div>

            <div className="space-y-3">
              {(matchedCase.events || []).map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 bg-neutral-50/60 rounded-xl border border-neutral-100 text-xs flex items-center justify-between gap-2"
                >
                  <span className="font-semibold text-neutral-800">
                    {evt.event_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {new Date(evt.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}

              {/* Logged Follow-Ups in Activity */}
              {(matchedCase.follow_ups || []).map((fu, idx) => (
                <div
                  key={fu.id || idx}
                  className="p-3 bg-neutral-50/60 rounded-xl border border-neutral-100 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900 capitalize">
                      {fu.follow_up_type.replace(/_/g, " ")} • {fu.contact_status || "Completed"}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(fu.occurred_at || fu.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {fu.sanitized_note && (
                    <p className="text-neutral-600 text-[11px] leading-relaxed">
                      {fu.sanitized_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Student-Visible Messages */}
        <div className="lg:col-span-5 space-y-6">
          <div className="skill-card bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 font-heading">
                  Case Messages
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Direct communication with your assigned mentor.
                </p>
              </div>
              <MessageSquare className="w-4 h-4 text-neutral-400" />
            </div>

            {/* Messaging integration status disclosure */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-800 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Consultation notes are coordinated with your mentor. Direct real-time messaging persistence is pending backend messaging service.
              </span>
            </div>

            {/* Message Feed */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-2xl text-xs space-y-1 ${
                    m.isStudent
                      ? "bg-neutral-900 text-white ml-6"
                      : "bg-neutral-100 text-neutral-800 mr-6"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75">
                    <span className="font-semibold">{m.sender}</span>
                    <span>{m.time}</span>
                  </div>
                  <p className="leading-relaxed">{m.text}</p>
                </div>
              ))}
            </div>

            {/* Message Reply Form */}
            <form onSubmit={handleSendMessage} className="pt-2 border-t border-neutral-100 flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your response or update..."
                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl transition-colors"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
