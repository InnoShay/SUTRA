"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { CaseState } from "@/lib/types";
import { UserAvatar } from "./UserAvatar";
import {
  X,
  MessageSquare,
  Heart,
  Send,
  Eye,
  Users,
  Share2,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ListTodo,
  PhoneCall,
  Clock,
  Layers,
  Plus,
} from "lucide-react";

interface DiscussionDetailModalProps {
  discussionId: string | null;
  onClose: () => void;
}

const CASE_LIFECYCLE_STATES: CaseState[] = [
  "NEW",
  "TRIAGED",
  "UNDER_REVIEW",
  "ACTIONABLE",
  "ASSIGNED",
  "ACCEPTED",
  "IN_PROGRESS",
  "FOLLOW_UP_REQUIRED",
  "RESOLVED",
  "CLOSED",
];

export function DiscussionDetailModal({
  discussionId,
  onClose,
}: DiscussionDetailModalProps) {
  const {
    discussions,
    discussionComments,
    addDiscussionComment,
    likeDiscussion,
    user,
    cases,
    transitionCase,
    createCaseTask,
    recordCaseFollowUp,
    recordCaseOutcome,
  } = useSkillHub();

  const [commentText, setCommentText] = useState("");
  const [copied, setCopied] = useState(false);

  // Case Workflow State
  const [isAdvancingState, setIsAdvancingState] = useState(false);
  const [targetState, setTargetState] = useState<CaseState>("IN_PROGRESS");
  const [transitionRationale, setTransitionRationale] = useState("");
  const [isLoggingFollowUp, setIsLoggingFollowUp] = useState(false);
  const [followUpChannel, setFollowUpChannel] = useState<
    "in_person" | "phone" | "email" | "lms"
  >("in_person");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpProof, setFollowUpProof] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDomain, setTaskDomain] = useState<string>("academic");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!discussionId) return null;

  // Check if this modal is bound to a case ID or a discussion
  const boundCase = cases.find(
    (c) => c.id === discussionId || discussionId.includes(c.id.slice(0, 6))
  ) || cases[0];

  const discussion = discussions.find((d) => d.id === discussionId) || {
    id: discussionId,
    title: boundCase
      ? `Case #${boundCase.id.slice(0, 8)}: ${(boundCase.selected_intervention_key || "academic_support").replace(/_/g, " ")}`
      : "Student Support Case Review",
    summary: boundCase
      ? `Intervention case for ${boundCase.student_display_name || boundCase.student_id.slice(0, 8)} (${boundCase.external_student_ref}). State: ${boundCase.state}. Tasks: ${boundCase.tasks?.length || 0}.`
      : "Active multi-disciplinary intervention case.",
    author: boundCase?.primary_owner_user_id ? `Owner: ${boundCase.primary_owner_user_id.slice(0, 8)}` : "Faculty Lead",
    authorRole: boundCase ? String(boundCase.state) : "Case Coordinator",
    authorAvatar: "/assets/avatar-sarah.jpg",
    timeAgo: "Active",
    repliesCount: 4,
    viewsCount: 18,
    participantsCount: 3,
    tags: ["Academic", "Attendance", "Intervention"],
  };

  const comments = discussionComments[discussionId] || [];

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addDiscussionComment(discussionId, commentText.trim());
    setCommentText("");
  };

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boundCase) return;
    if (!transitionRationale.trim() || transitionRationale.trim().length < 5) {
      setActionError("Rationale must be at least 5 characters per SUTRA audit requirements.");
      return;
    }
    setActionError(null);
    try {
      await transitionCase(boundCase.id, {
        to_state: targetState,
        reason_code: transitionRationale.trim(),
        metadata: { rationale: transitionRationale.trim() },
      });
      setActionSuccess(`Case successfully transitioned to ${targetState}.`);
      setIsAdvancingState(false);
      setTransitionRationale("");
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err: any) {
      setActionError(err?.message || "Failed to transition state. Check transition validity.");
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boundCase) return;
    if (!followUpNotes.trim()) {
      setActionError("Follow-up notes cannot be empty.");
      return;
    }
    setActionError(null);
    try {
      await recordCaseFollowUp(boundCase.id, {
        follow_up_type: followUpChannel,
        contact_status: "completed",
        proof_kind: "verification_note",
        occurred_at: new Date().toISOString(),
        note: followUpNotes.trim(),
        proof_ref: followUpProof ? followUpProof.trim() : "follow_up_note_v1",
      });
      setActionSuccess("Follow-up proof logged successfully.");
      setIsLoggingFollowUp(false);
      setFollowUpNotes("");
      setFollowUpProof("");
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err: any) {
      setActionError(err?.message || "Failed to record follow-up.");
    }
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boundCase || !taskTitle.trim()) return;
    setActionError(null);
    try {
      await createCaseTask(boundCase.id, {
        generic_label: taskTitle.trim(),
        domain: taskDomain as any,
        due_at: new Date(Date.now() + 86400000 * 2).toISOString(),
      });
      setActionSuccess("Task successfully created and assigned.");
      setIsAddingTask(false);
      setTaskTitle("");
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err: any) {
      setActionError(err?.message || "Failed to create task.");
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 pb-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={discussion.authorAvatar || "/assets/avatar-sarah.jpg"}
              name={discussion.author}
              className="w-10 h-10 ring-2 ring-neutral-100"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-neutral-900">
                  {discussion.author}
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  ({discussion.authorRole || "Case Owner"})
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {boundCase ? `Case ID: #${boundCase.id.slice(0, 8)}` : `Posted ${discussion.timeAgo}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-neutral-200/50 text-neutral-400 hover:text-neutral-700 transition-colors"
              title="Share Case"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-200/50 text-neutral-400 hover:text-neutral-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {actionSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* SUTRA 10-State Lifecycle Progress Indicator */}
          {boundCase && (
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-neutral-500" /> 10-State Lifecycle Status
                </span>
                <span className="text-xs font-mono font-bold uppercase text-neutral-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                  {boundCase.state}
                </span>
              </div>

              {/* State Pills horizontal scroll */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {CASE_LIFECYCLE_STATES.map((st, idx) => {
                  const isCurrent = boundCase.state === st;
                  const isPast =
                    CASE_LIFECYCLE_STATES.indexOf(boundCase.state as CaseState) > idx;

                  return (
                    <div
                      key={st}
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                        isCurrent
                          ? "bg-neutral-900 text-white font-bold ring-1 ring-neutral-900"
                          : isPast
                          ? "bg-emerald-100 text-emerald-800 font-semibold"
                          : "bg-neutral-200/60 text-neutral-400"
                      }`}
                    >
                      {st}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons for Case Advancement */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setIsAdvancingState(!isAdvancingState);
                    setIsLoggingFollowUp(false);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3 h-3" />
                  <span>Advance State</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsLoggingFollowUp(!isLoggingFollowUp);
                    setIsAdvancingState(false);
                    setIsAddingTask(false);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Log Follow-Up &amp; Proof</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTask(!isAddingTask);
                    setIsAdvancingState(false);
                    setIsLoggingFollowUp(false);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>
          )}

          {/* Form: Advance State */}
          {isAdvancingState && boundCase && (
            <form onSubmit={handleTransition} className="p-4 rounded-2xl bg-neutral-100/70 border border-neutral-200 space-y-3">
              <h4 className="text-xs font-bold text-neutral-900">
                Advance 10-State Case Lifecycle
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                    Target State
                  </label>
                  <select
                    value={targetState}
                    onChange={(e) => setTargetState(e.target.value as CaseState)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900"
                  >
                    {CASE_LIFECYCLE_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                    Transition Rationale (Required)
                  </label>
                  <input
                    type="text"
                    value={transitionRationale}
                    onChange={(e) => setTransitionRationale(e.target.value)}
                    placeholder="Enter audit rationale (min 5 chars)..."
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdvancingState(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200 rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 text-white rounded-full text-xs font-semibold cursor-pointer"
                >
                  Confirm Transition
                </button>
              </div>
            </form>
          )}

          {/* Form: Add Task */}
          {isAddingTask && boundCase && (
            <form onSubmit={handleAddTaskSubmit} className="p-4 rounded-2xl bg-neutral-100/70 border border-neutral-200 space-y-3">
              <h4 className="text-xs font-bold text-neutral-900">
                Add Action Task to Support Case
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                    Task Title / Label
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. 1:1 Diagnostic Review Session"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                    Domain
                  </label>
                  <select
                    value={taskDomain}
                    onChange={(e) => setTaskDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900"
                  >
                    <option value="academic">Academic Support</option>
                    <option value="attendance">Attendance</option>
                    <option value="counselling">Wellbeing / Counseling</option>
                    <option value="mentor">Faculty Mentorship</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200 rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 text-white rounded-full text-xs font-semibold cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          )}

          {/* Form: Log Follow-Up Proof */}
          {isLoggingFollowUp && boundCase && (
            <form onSubmit={handleFollowUpSubmit} className="p-4 rounded-2xl bg-neutral-100/70 border border-neutral-200 space-y-3">
              <h4 className="text-xs font-bold text-neutral-900">
                Record Case Follow-Up with Evidence
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                    Contact Channel
                  </label>
                  <select
                    value={followUpChannel}
                    onChange={(e) => setFollowUpChannel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900"
                  >
                    <option value="in_person">In-Person Meeting</option>
                    <option value="phone">Phone Consultation</option>
                    <option value="email">Institutional Email</option>
                    <option value="lms">LMS Direct Messaging</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                    Evidence Proof Artifact
                  </label>
                  <input
                    type="text"
                    value={followUpProof}
                    onChange={(e) => setFollowUpProof(e.target.value)}
                    placeholder="e.g. attendance_slip_2026_10.pdf"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                  Interaction Notes &amp; Next Action
                </label>
                <textarea
                  rows={2}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Record summary of discussion and agreed academic targets..."
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsLoggingFollowUp(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200 rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 text-white rounded-full text-xs font-semibold cursor-pointer"
                >
                  Save Follow-Up
                </button>
              </div>
            </form>
          )}

          {/* Action Tasks List on this Case */}
          {boundCase && (boundCase.tasks || []).length > 0 && (
            <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Case Action Tasks ({boundCase.tasks?.length})
                </h4>
                <span className="text-[10px] text-neutral-500 font-mono">Assigned Milestones</span>
              </div>
              <div className="space-y-1.5">
                {boundCase.tasks?.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-white border border-neutral-200/60 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <div>
                        <span className="font-semibold text-neutral-900 block">
                          {t.generic_label || (t as any).title}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          Due: {t.due_at ? new Date(t.due_at).toLocaleDateString() : "Scheduled"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                      {t.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logged Follow-Ups & Proof on this Case */}
          {boundCase && (boundCase.follow_ups || []).length > 0 && (
            <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Logged Follow-Up Records ({boundCase.follow_ups?.length})
                </h4>
                <span className="text-[10px] text-neutral-500 font-mono">Audited Evidence</span>
              </div>
              <div className="space-y-2">
                {boundCase.follow_ups?.map((fu, idx) => (
                  <div
                    key={fu.id || idx}
                    className="p-3 rounded-xl bg-white border border-neutral-200/60 space-y-1 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 capitalize">
                        {fu.follow_up_type.replace(/_/g, " ")} • {fu.contact_status || "Completed"}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {new Date(fu.occurred_at || fu.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {fu.sanitized_note && (
                      <p className="text-neutral-700 text-[11px] leading-relaxed">
                        {fu.sanitized_note}
                      </p>
                    )}
                    {fu.proof_ref && (
                      <span className="inline-block text-[10px] font-mono text-neutral-500">
                        Artifact: {fu.proof_ref}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Title & Summary */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight leading-snug">
              {discussion.title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
              {discussion.summary}
            </p>
          </div>

          {/* Existing Comments / Case Collaboration Notes */}
          <div className="pt-4 space-y-4">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider text-neutral-400">
              Case Collaboration Notes ({comments.length})
            </h4>

            {comments.length === 0 ? (
              <div className="text-center py-6 rounded-2xl bg-neutral-50/70 border border-dashed border-neutral-200">
                <MessageSquare className="w-5 h-5 text-neutral-300 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-neutral-500">
                  No notes recorded yet. Add an update below.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100/80 space-y-1.5 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          src={comment.authorAvatar}
                          name={comment.author}
                          className="w-5 h-5 text-[9px]"
                        />
                        <span className="text-xs font-bold text-neutral-800">
                          {comment.author}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        {comment.timeAgo}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 pl-7 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reply Input Bar */}
        <form
          onSubmit={handleSendComment}
          className="p-3.5 sm:p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center gap-2.5 flex-shrink-0"
        >
          <UserAvatar
            src={user.avatar}
            name={user.fullName}
            className="w-8 h-8 ring-1 ring-neutral-200 shrink-0"
          />
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Log an internal collaboration note or resolution update..."
            className="flex-1 bg-white border border-neutral-200/80 rounded-full px-4 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-h-[40px]"
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
            aria-label="Send note"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
