"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { CounselorCalendarEvent } from "@/lib/types";
import { INITIAL_CALENDAR_ATTACHMENTS, CalendarAttachment } from "@/lib/skillhub-data";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter as FilterIcon,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  MoreHorizontal,
  Check,
  CheckCircle2,
  User,
  Phone,
  Video,
  AlertCircle,
  X,
  FileText,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { dayNum: 1, name: "Mon", fullDate: "1 - Mon", dateStr: "Jan 1, 2025" },
  { dayNum: 2, name: "Tue", fullDate: "2 - Tue", dateStr: "Jan 2, 2025" },
  { dayNum: 3, name: "Wed", fullDate: "3 - Wed", dateStr: "Jan 3, 2025" },
  { dayNum: 4, name: "Thur", fullDate: "4 - Thur", dateStr: "Jan 4, 2025" },
  { dayNum: 5, name: "Fri", fullDate: "5 - Fri", dateStr: "Jan 5, 2025" },
  { dayNum: 6, name: "Sat", fullDate: "6 - Sat", dateStr: "Jan 6, 2025" },
  { dayNum: 7, name: "Sun", fullDate: "7 - Sun", dateStr: "Jan 7, 2025" },
];

const TIME_SLOTS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
];

const CATEGORIES = [
  { id: "all", label: "All Calls" },
  { id: "academic", label: "Academic Support" },
  { id: "wellbeing", label: "Mental Health" },
  { id: "attendance", label: "Attendance" },
  { id: "career", label: "Career Guidance" },
];

export default function SchedulePage() {
  const {
    user,
    students,
    cases,
    callRequests,
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    counselorProfile,
  } = useSkillHub();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedDayNum, setSelectedDayNum] = useState<number>(2); // 2 - Tue is active by default as in design
  const [weekLabel, setWeekLabel] = useState<string>("01-07 January 2025");
  const [timeViewDropdown, setTimeViewDropdown] = useState<string>("This week");
  const [filterDropdown, setFilterDropdown] = useState<string>("All");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<CounselorCalendarEvent | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<CalendarAttachment | null>(null);
  const [showNeedsHelpBanner, setShowNeedsHelpBanner] = useState(true);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState("Academic Review Call");
  const [newEventStudentId, setNewEventStudentId] = useState("SYN-1007");
  const [newEventCategory, setNewEventCategory] = useState<CounselorCalendarEvent["category"]>("academic");
  const [newEventDay, setNewEventDay] = useState<number>(2);
  const [newEventStartTime, setNewEventStartTime] = useState("09:00");
  const [newEventEndTime, setNewEventEndTime] = useState("09:45");
  const [newEventStatus, setNewEventStatus] = useState<"confirmed" | "pending">("confirmed");
  const [newEventColor, setNewEventColor] = useState<"lavender" | "sky" | "peach" | "mint">("lavender");
  const [newEventNotes, setNewEventNotes] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("Google Meet • Video Call");

  // Filter events
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((evt) => {
      if (activeCategory === "all") return true;
      return evt.category === activeCategory;
    });
  }, [calendarEvents, activeCategory]);

  // Students requiring help
  const studentsNeedingHelp = useMemo(() => {
    return students.filter(
      (s) => s.status === "At Risk" || callRequests.some((r) => r.student_id === s.id && r.status === "requested")
    );
  }, [students, callRequests]);

  const handleOpenAddForStudent = (studentId: string, studentName: string) => {
    setNewEventStudentId(studentId);
    setNewEventTitle(`Guidance Consultation • ${studentName.split(" ")[0]}`);
    setNewEventDay(selectedDayNum);
    setIsAddModalOpen(true);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find((s) => s.id === newEventStudentId);
    const durationStr = `${newEventStartTime} - ${newEventEndTime}`;

    addCalendarEvent({
      title: newEventTitle,
      studentId: newEventStudentId,
      studentName: stu?.name || "Student Scholar",
      category: newEventCategory,
      dayOfWeek: Number(newEventDay),
      startTime: newEventStartTime,
      endTime: newEventEndTime,
      durationLabel: durationStr,
      status: newEventStatus,
      color: newEventColor,
      locationOrMode: newEventLocation,
      notes: newEventNotes,
    });

    setIsAddModalOpen(false);
    // Reset defaults
    setNewEventNotes("");
  };

  // Helper to calculate card vertical position within the grid based on start time
  const getEventPositionStyles = (startTime: string, endTime: string) => {
    // Each hour slot is 70px height. Base start is 06:00
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const baseHour = 6;
    const startMinutesFromBase = (startHour - baseHour) * 60 + (startMin || 0);
    const endMinutesFromBase = (endHour - baseHour) * 60 + (endMin || 0);
    const durationMinutes = Math.max(30, endMinutesFromBase - startMinutesFromBase);

    // 70px per 60 minutes = 1.166px per min
    const topPx = Math.max(0, startMinutesFromBase * 1.166);
    const heightPx = Math.max(48, durationMinutes * 1.166);

    return {
      top: `${topPx}px`,
      height: `${heightPx}px`,
    };
  };

  const getColorStyles = (color: CounselorCalendarEvent["color"]) => {
    switch (color) {
      case "sky":
        return {
          bg: "bg-[#E0F2FE]",
          text: "text-[#0369A1]",
          border: "border-[#BAE6FD]",
          timeText: "text-[#0284C7]",
        };
      case "peach":
        return {
          bg: "bg-[#FEF3C7]",
          text: "text-[#92400E]",
          border: "border-[#FDE68A]",
          timeText: "text-[#B45309]",
        };
      case "mint":
        return {
          bg: "bg-[#DCFCE7]",
          text: "text-[#15803D]",
          border: "border-[#BBF7D0]",
          timeText: "text-[#16A34A]",
        };
      case "rose":
        return {
          bg: "bg-[#FFE4E6]",
          text: "text-[#9F1239]",
          border: "border-[#FECDD3]",
          timeText: "text-[#BE123C]",
        };
      case "lavender":
      default:
        return {
          bg: "bg-[#ECE9FE]",
          text: "text-[#4F378B]",
          border: "border-[#DDD6FE]",
          timeText: "text-[#65558F]",
        };
    }
  };

  return (
    <div className="space-y-6 pb-12 selection:bg-neutral-900 selection:text-white">
      {/* 1. TOP BREADCRUMB & STUDENT OVERLOOK BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/dashboard" className="hover:text-neutral-900 transition-colors">
            {counselorProfile?.full_name?.split(" ")[0] || "Dr. Meera Nambiar"}
          </Link>
          <span className="text-neutral-400">›</span>
          <span className="text-neutral-900 font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-800" />
            Schedule
          </span>
        </div>
      </div>

      {/* 2. OVERLOOK: STUDENTS NEEDING HELP BANNER */}
      {showNeedsHelpBanner && (
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/90 shadow-[0_10px_30px_rgba(15,23,42,0.03)] relative overflow-hidden">
          <button
            onClick={() => setShowNeedsHelpBanner(false)}
            className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-100 transition-all"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-extrabold text-neutral-900">
                {studentsNeedingHelp.length} Students Flagged for Guidance &amp; Consultation
              </h2>
              <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
                Review at-risk signals across attendance and exam workload, then schedule consultation slots directly on the calendar below.
              </p>
            </div>

            {/* Quick Students Avatars to Schedule */}
            <div className="flex items-center gap-2 flex-wrap">
              {studentsNeedingHelp.slice(0, 4).map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleOpenAddForStudent(student.id, student.name)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-xs font-semibold text-neutral-800 transition-all hover:scale-105 active:scale-95 group"
                >
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-neutral-300"
                  />
                  <span>{student.name.split(" ")[0]}</span>
                  <Plus className="w-3 h-3 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                </button>
              ))}
              <Link
                href="/students"
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 px-3 py-1.5"
              >
                View all students →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. CALENDAR MASTER BOARD: PIXEL-PERFECT REPLICA OF USER DESIGN */}
      <div className="bg-white rounded-[32px] sm:rounded-[36px] border border-neutral-200/90 shadow-[0_20px_60px_rgba(15,23,42,0.04)] p-4 sm:p-7 md:p-9 space-y-6">
        {/* HEADER CONTROLS BAR: Date range, category pills, filter, add event */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
          {/* Left: Date Display & Category Filters */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Week Label with chevrons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekLabel("24-30 December 2024")}
                className="w-8 h-8 rounded-full border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-600 transition-all"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight font-heading min-w-[210px]">
                {weekLabel}
              </h1>
              <button
                onClick={() => setWeekLabel("08-14 January 2025")}
                className="w-8 h-8 rounded-full border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-600 transition-all"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Pills (Exact styling from screenshot) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-neutral-900 text-white shadow-2xs"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                    }`}
                  >
                    {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dropdown Pills: This week, All */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-neutral-500">
              <button
                onClick={() => setTimeViewDropdown((prev) => (prev === "This week" ? "Next week" : "This week"))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors"
              >
                <span>{timeViewDropdown}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFilterDropdown((prev) => (prev === "All" ? "Only Mine" : "All"))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors"
              >
                <span>{filterDropdown}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Filter button & Add Event */}
          <div className="flex items-center gap-2.5 self-end lg:self-auto">
            {/* Filter 1 Button */}
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-800 transition-all shadow-2xs">
              <FilterIcon className="w-3.5 h-3.5 text-neutral-600" />
              <span>Filter</span>
              <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] flex items-center justify-center font-bold">
                1
              </span>
            </button>

            {/* + Add Event (Black pill button from user design) */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-5 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* 4. CALENDAR WEEK GRID VIEW */}
        <div className="overflow-x-auto select-none">
          <div className="min-w-[840px]">
            {/* Day Headers Row */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-2 pb-4 border-b border-neutral-100">
              {/* Empty corner above time gutter */}
              <div />

              {/* 7 Days Columns Headers */}
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDayNum === day.dayNum;
                return (
                  <div
                    key={day.dayNum}
                    onClick={() => setSelectedDayNum(day.dayNum)}
                    className="flex justify-center cursor-pointer"
                  >
                    {isSelected ? (
                      <div className="px-5 py-1.5 rounded-full bg-neutral-900 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1">
                        <span>{day.fullDate}</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors">
                        <span>{day.fullDate}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Main Time Grid Area */}
            <div className="relative grid grid-cols-[80px_repeat(7,1fr)] gap-2 pt-2 min-h-[700px]">
              {/* Left Time Axis Gutter */}
              <div className="relative">
                {TIME_SLOTS.map((slot) => (
                  <div key={slot} className="h-[70px] text-xs font-semibold text-neutral-400 font-mono pt-0.5">
                    {slot}
                  </div>
                ))}

                {/* 8:40 Live Time Indicator (Exact Black Pill Marker from screenshot) */}
                <div
                  className="absolute z-20 flex items-center"
                  style={{ top: "186px" }} // Exactly between 08:00 and 09:00 (8:40 = 2h 40min = 160min * 1.166 = ~186px)
                >
                  <div className="px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[11px] font-bold font-mono shadow-xs">
                    8:40
                  </div>
                </div>
              </div>

              {/* 7 Day Vertical Columns */}
              {DAYS_OF_WEEK.map((day) => {
                const isCurrentDay = day.dayNum === selectedDayNum;
                const dayEvents = filteredEvents.filter((e) => e.dayOfWeek === day.dayNum);
                const dayAttachments = INITIAL_CALENDAR_ATTACHMENTS.filter((a) => a.dayOfWeek === day.dayNum);

                return (
                  <div
                    key={day.dayNum}
                    className={`relative border-l border-neutral-100 min-h-[700px] transition-colors ${
                      isCurrentDay ? "bg-neutral-50/30" : ""
                    }`}
                  >
                    {/* Horizontal hour guide lines */}
                    {TIME_SLOTS.map((slot) => (
                      <div
                        key={slot}
                        onClick={() => {
                          setSelectedDayNum(day.dayNum);
                          setNewEventDay(day.dayNum);
                          setNewEventStartTime(slot);
                          setIsAddModalOpen(true);
                        }}
                        className="h-[70px] border-b border-neutral-100/70 hover:bg-neutral-100/40 transition-colors cursor-pointer"
                        title={`Click to schedule call on ${day.name} at ${slot}`}
                      />
                    ))}

                    {/* Live time indicator line across selected Tuesday column (from screenshot) */}
                    {day.dayNum === 2 && (
                      <div
                        className="absolute left-0 right-0 z-10 pointer-events-none"
                        style={{ top: "196px" }}
                      >
                        <div className="h-[1.5px] bg-neutral-900 w-full" />
                      </div>
                    )}

                    {/* Scheduled Event Cards on this Day */}
                    {dayEvents.map((event) => {
                      const pos = getEventPositionStyles(event.startTime, event.endTime);
                      const color = getColorStyles(event.color);

                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEventForDetail(event)}
                          style={{ top: pos.top, height: pos.height }}
                          className={`absolute left-1 right-1 z-20 ${color.bg} ${color.border} border rounded-2xl p-2.5 sm:p-3 shadow-2xs cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between overflow-hidden group`}
                        >
                          <div>
                            {/* Title & Three dots menu */}
                            <div className="flex items-start justify-between gap-1">
                              <h4 className={`text-xs font-bold ${color.text} truncate leading-tight`}>
                                {event.title}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventForDetail(event);
                                }}
                                className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded transition-colors"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Time subtitle */}
                            <p className={`text-[11px] font-semibold ${color.timeText} mt-0.5`}>
                              {event.durationLabel}
                            </p>
                          </div>

                          {/* Student name / confirmed badge */}
                          <div className="flex items-center justify-between gap-1 mt-1">
                            {event.status === "confirmed" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-neutral-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Confirmed</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-neutral-500 truncate">
                                {event.studentName.split(" ")[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Bottom Row Paperclip Attachment Badges (from screenshot at 15:00 row) */}
                    <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5 z-20">
                      {dayAttachments.map((att, idx) => {
                        const circleBg =
                          att.color === "peach"
                            ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                            : att.color === "sky"
                            ? "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]"
                            : "bg-[#ECE9FE] text-[#4F378B] border-[#DDD6FE]";

                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedAttachment(att)}
                            className={`w-7 h-7 rounded-full ${circleBg} border flex items-center justify-center shadow-2xs hover:scale-110 active:scale-95 transition-all`}
                            title={att.title}
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. MODAL: SCHEDULE NEW EVENT / CALL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Schedule Counseling Call</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Add an upcoming student consultation or exam review to the calendar.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              {/* Event Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800">Event / Call Title</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Math Exam Review or Anxiety De-escalation"
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  required
                />
              </div>

              {/* Student Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800">Student Scholar</label>
                <select
                  value={newEventStudentId}
                  onChange={(e) => setNewEventStudentId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id}) • {s.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category & Day Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-800">Category</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                  >
                    <option value="academic">Academic Support</option>
                    <option value="wellbeing">Mental Health &amp; Wellbeing</option>
                    <option value="attendance">Attendance De-escalation</option>
                    <option value="career">Career &amp; Placement Guidance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-800">Day of Week</label>
                  <select
                    value={newEventDay}
                    onChange={(e) => setNewEventDay(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.dayNum} value={d.dayNum}>
                        {d.fullDate}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time Slots */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-800">Start Time</label>
                  <input
                    type="time"
                    value={newEventStartTime}
                    onChange={(e) => setNewEventStartTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-800">End Time</label>
                  <input
                    type="time"
                    value={newEventEndTime}
                    onChange={(e) => setNewEventEndTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                    required
                  />
                </div>
              </div>

              {/* Card Color Scheme */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800">Card Color Aesthetic</label>
                <div className="flex items-center gap-2">
                  {[
                    { id: "lavender", bg: "bg-[#ECE9FE]", label: "Lavender" },
                    { id: "sky", bg: "bg-[#E0F2FE]", label: "Sky Blue" },
                    { id: "peach", bg: "bg-[#FEF3C7]", label: "Peach" },
                    { id: "mint", bg: "bg-[#DCFCE7]", label: "Mint Green" },
                  ].map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setNewEventColor(c.id as any)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        c.bg
                      } ${newEventColor === c.id ? "ring-2 ring-neutral-900 border-neutral-900" : "border-neutral-200"}`}
                    >
                      {newEventColor === c.id && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Consultation Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-800">Session Agenda / Notes</label>
                <textarea
                  rows={2}
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  placeholder="Notes on exam anxiety, syllabus backlog, or support plan..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-white shadow-xs transition-all"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: EVENT DETAILS & ACTIONS */}
      {selectedEventForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase font-mono tracking-wider">
                  {selectedEventForDetail.category}
                </span>
                <h3 className="text-lg font-bold text-neutral-900 mt-1">
                  {selectedEventForDetail.title}
                </h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                  {selectedEventForDetail.durationLabel}
                </p>
              </div>
              <button
                onClick={() => setSelectedEventForDetail(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student details */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Assigned Student Scholar
              </p>
              <p className="text-sm font-bold text-neutral-900">
                {selectedEventForDetail.studentName}
              </p>
              <p className="text-xs text-neutral-500">
                ID: {selectedEventForDetail.studentId} • Location: {selectedEventForDetail.locationOrMode || "Student Wellness Desk"}
              </p>
            </div>

            {selectedEventForDetail.notes && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-neutral-800">Clinical Consultation Notes</p>
                <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100 leading-relaxed">
                  {selectedEventForDetail.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  updateCalendarEvent(selectedEventForDetail.id, { status: "confirmed" });
                  setSelectedEventForDetail(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Mark Confirmed</span>
              </button>
              <button
                onClick={() => {
                  deleteCalendarEvent(selectedEventForDetail.id);
                  setSelectedEventForDetail(null);
                }}
                className="py-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
              >
                Cancel Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: ATTACHMENT DETAILS DEBRIEF */}
      {selectedAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Session Attachment Note</h3>
                  <p className="text-xs text-neutral-500">{selectedAttachment.studentName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAttachment(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-900">{selectedAttachment.title}</h4>
              <p className="text-xs text-neutral-600 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80 leading-relaxed">
                {selectedAttachment.notes}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAttachment(null)}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
              >
                Close Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
