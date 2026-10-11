"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { DiscussionDetailModal } from "@/components/DiscussionDetailModal";
import {
  Plus,
  MessageSquare,
  Eye,
  Users,
  MoreVertical,
  ArrowUpRight,
  Heart,
  Check,
  Layers,
  AlertTriangle,
  Clock,
  Shield,
  Activity,
} from "lucide-react";

export default function CommunityPage() {
  const {
    discussions,
    setIsCreatePostModalOpen,
    likeDiscussion,
    cases,
  } = useSkillHub();

  const [activeDiscussion, setActiveDiscussion] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [eventJoined, setEventJoined] = useState(false);

  // Derive case items if backend cases exist
  const caseList = cases.map((c) => ({
    id: c.id,
    title: `Case #${c.id.slice(0, 8)}: ${(c.selected_intervention_key || "academic_support").replace(/_/g, " ")}`,
    summary: `Student: ${c.student_display_name || c.student_id.slice(0, 8)} (${c.external_student_ref}) • State: ${c.state} • Tasks: ${c.tasks?.length || 0} active • Follow-ups: ${c.follow_ups?.length || 0} logged`,
    author: c.primary_owner_user_id ? `Owner: ${c.primary_owner_user_id.slice(0, 8)}` : "Case Coordinator",
    authorRole: String(c.state),
    authorAvatar: "/assets/avatar-sarah.jpg",
    timeAgo: "Active",
    repliesCount: (c.tasks?.length || 0) + (c.follow_ups?.length || 0),
    viewsCount: 24,
    participantsCount: 3,
    tags: [String(c.state), "Intervention", "Support"],
    isFeatured: c.is_escalated,
  }));

  const allItems = caseList.length > 0 ? caseList : discussions;

  const featured = allItems.find((d) => d.isFeatured) || allItems[0];

  const filteredDiscussions = selectedTag
    ? allItems.filter(
        (d) =>
          d.tags?.some((t) => t.toLowerCase().includes(selectedTag.toLowerCase())) ||
          d.title.toLowerCase().includes(selectedTag.toLowerCase())
      )
    : allItems;

  const recentList = filteredDiscussions.filter((d) => d.id !== featured.id);

  const handleJoinEvent = () => {
    setEventJoined((prev) => !prev);
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER: Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            Intervention Triage &amp; Case Hub
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Closed-loop student support cases, multi-disciplinary task handoffs, and 10-state progression
          </p>
        </div>

        <button
          onClick={() => setIsCreatePostModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-sm transition-all min-h-[44px] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Case Task</span>
        </button>
      </div>

      {/* Tag Filter Pills */}
      {selectedTag && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-medium">Filtered by:</span>
          <span className="px-3 py-1 rounded-full bg-neutral-900 text-white text-xs font-medium flex items-center gap-1.5">
            #{selectedTag}
            <button
              onClick={() => setSelectedTag(null)}
              className="hover:text-neutral-300 ml-1 font-bold"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {/* 2. MAIN SPLIT: Featured Discussion (left) & Recent Discussions (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* LEFT: Featured Discussion Card (~7 cols) */}
        <div className="lg:col-span-7 skill-card bg-white p-5 sm:p-7 relative overflow-hidden flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Primary Support Case in Scope
              </span>
              <button
                onClick={() => likeDiscussion(featured.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors"
                title="Highlight Case"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500" />
                <span>Priority</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Text side */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white uppercase tracking-wider">
                    {featured.authorRole || "IN_PROGRESS"}
                  </span>
                </div>

                <h2
                  onClick={() => setActiveDiscussion(featured.id)}
                  className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight leading-tight cursor-pointer hover:text-neutral-700 transition-colors"
                >
                  {featured.title}
                </h2>
                {featured.summary && (
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                    {featured.summary}
                  </p>
                )}
              </div>

              {/* 3D Bubble Illustration side */}
              <div className="md:col-span-5 flex items-center justify-center">
                <img
                  src="/assets/community-bubbles.jpg"
                  alt="3D Speech Bubbles"
                  className="w-32 h-32 sm:w-36 sm:h-36 object-contain drop-shadow-md cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setActiveDiscussion(featured.id)}
                />
              </div>
            </div>
          </div>

          {/* Stats & Actions */}
          <div className="pt-6 space-y-4">
            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <MessageSquare className="w-4 h-4 text-neutral-400" />
                <span>{featured.repliesCount} actions / tasks</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Eye className="w-4 h-4 text-neutral-400" />
                <span>{featured.viewsCount} reviews</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4 text-neutral-400" />
                <span>{featured.participantsCount} stakeholders</span>
              </span>
            </div>

            {/* Buttons row */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => setActiveDiscussion(featured.id)}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-colors min-h-[40px]"
              >
                Inspect Case Actions
              </button>

              <button
                onClick={() => setActiveDiscussion(featured.id)}
                className="px-5 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-200/80 text-neutral-800 rounded-full text-xs font-semibold transition-colors min-h-[40px]"
              >
                10-State Machine
              </button>

              <button
                onClick={() => setActiveDiscussion(featured.id)}
                className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Active Cases Queue (~5 cols) */}
        <div className="lg:col-span-5 skill-card bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
              Active Intervention Queue
            </h3>
            {selectedTag ? (
              <button
                onClick={() => setSelectedTag(null)}
                className="text-xs font-semibold text-neutral-900 hover:underline"
              >
                Clear filter
              </button>
            ) : (
              <span className="text-xs font-medium text-neutral-400">
                {recentList.length} cases
              </span>
            )}
          </div>

          <div className="space-y-4 pt-1">
            {recentList.map((disc) => (
              <div
                key={disc.id}
                onClick={() => setActiveDiscussion(disc.id)}
                className="flex items-start justify-between group cursor-pointer p-2.5 -mx-2.5 rounded-2xl hover:bg-neutral-50 transition-colors"
              >
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 group-hover:text-neutral-600 transition-colors">
                    {disc.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {disc.author} • {disc.repliesCount} actions • {disc.authorRole || "ACTIVE"}
                  </p>
                </div>
                <div className="w-6 h-6 rounded-full bg-neutral-50 group-hover:bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:text-neutral-900 transition-colors flex-shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}

            {recentList.length === 0 && (
              <div className="py-8 text-center text-xs text-neutral-400">
                All cases triaged and progressing through lifecycle
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW: Trending Topics, Top Contributors, Upcoming Event */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trending Intervention Domains */}
        <div className="skill-card bg-white p-5 space-y-3">
          <h4 className="text-xs font-bold tracking-tight uppercase text-neutral-400">
            Intervention Domains
          </h4>
          <div
            onClick={() => setSelectedTag("Academic")}
            className="flex items-center justify-between text-xs py-1.5 px-2 -mx-2 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            <span className="font-semibold text-neutral-800"># Academic Recovery</span>
            <span className="text-[11px] text-neutral-400 font-mono">Faculty Led</span>
          </div>
          <div
            onClick={() => setSelectedTag("Attendance")}
            className="flex items-center justify-between text-xs py-1.5 px-2 -mx-2 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            <span className="font-semibold text-neutral-800"># Attendance Watch</span>
            <span className="text-[11px] text-neutral-400 font-mono">Mentor Check-in</span>
          </div>
          <div
            onClick={() => setSelectedTag("Wellbeing")}
            className="flex items-center justify-between text-xs py-1.5 px-2 -mx-2 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            <span className="font-semibold text-neutral-800"># Student Wellbeing</span>
            <span className="text-[11px] text-neutral-400 font-mono">Counselor Confidential</span>
          </div>
        </div>

        {/* Top Case Responders */}
        <div className="skill-card bg-white p-5 space-y-3">
          <h4 className="text-xs font-bold tracking-tight uppercase text-neutral-400">
            Case Responders
          </h4>
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2">
              <img
                src="/assets/avatar-sarah.jpg"
                alt="Sarah"
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="font-semibold text-neutral-800">Dr. Sarah Wilson</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold font-mono">Faculty (Lead)</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2">
              <img
                src="/assets/avatar-marvin.jpg"
                alt="Mike"
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="font-semibold text-neutral-800">Prof. Marcus Vance</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold font-mono">Academic Dean</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2">
              <img
                src="/assets/avatar-jane.jpg"
                alt="Emma"
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="font-semibold text-neutral-800">Elena Rostova</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold font-mono">Lead Counselor</span>
          </div>
        </div>

        {/* Deadlines & Escalation Watch */}
        <div className="skill-card bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold tracking-tight uppercase text-neutral-400">
                Action Deadlines Watch
              </h4>
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <h5 className="text-sm font-bold text-neutral-900">
              Next Action Due: Oct 15, 2026
            </h5>
            <p className="text-xs text-neutral-500 mt-1">
              Case follow-up verification deadline for active Day-30 academic intervention cohort.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleJoinEvent}
              className={`w-full py-2 rounded-full text-xs font-semibold transition-all ${
                eventJoined
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-neutral-900 text-white hover:bg-neutral-800"
              }`}
            >
              {eventJoined ? "Deadline Acknowledged ✓" : "Review Escalation SLA"}
            </button>
          </div>
        </div>
      </div>

      {/* Discussion / Case Detail Modal */}
      {activeDiscussion && (
        <DiscussionDetailModal
          discussionId={activeDiscussion}
          onClose={() => setActiveDiscussion(null)}
        />
      )}
    </div>
  );
}
