"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import {
  MessageSquare,
  Send,
  User,
  Clock,
  Shield,
  ArrowLeft,
  CheckCircle2,
  Search,
} from "lucide-react";

export default function MessagesPage() {
  const {
    user,
    students,
    studentMessages,
    sendMessageToStudent,
    activeRole,
    currentPersona,
  } = useSkillHub();

  const isStudent = activeRole === "student";
  const studentId = currentPersona?.userId || "SYN-1007";

  // For students, the primary contact is their assigned mentor (Prof. Sharma)
  // For staff/admin, they can converse with students
  const [selectedContactId, setSelectedContactId] = useState<string>(
    isStudent ? "MENTOR" : students[0]?.id || "SYN-1007"
  );
  const [inputText, setInputText] = useState("");

  const currentMessages = studentMessages[studentId] || [
    {
      id: "m-init-1",
      sender: "mentor",
      text: "Hello Asha! I reviewed your Day-30 check-in. Please let me know how you are progressing with the week 3 lab assignment.",
      time: "Yesterday, 14:30",
    },
    {
      id: "m-init-2",
      sender: "user",
      text: "Thank you Professor Sharma. I am reviewing the lecture slides and will have my problem set ready for our Tuesday session.",
      time: "Yesterday, 15:10",
    },
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessageToStudent(studentId, inputText);
    setInputText("");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            {isStudent ? "Mentor Messages" : "Student Communications"}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {isStudent
              ? "Confidential communications with your assigned faculty mentor and support coordinators."
              : "Direct support messaging with students under authorized mentorship protocols."}
          </p>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="skill-card bg-white rounded-3xl border border-neutral-200/80 shadow-2xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
        {/* Left Column: Conversations List (4 cols) */}
        <div className="md:col-span-4 border-r border-neutral-100 p-4 space-y-3 bg-neutral-50/50">
          <div className="px-2 pt-1 pb-2">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              {isStudent ? "Support Mentors" : "Assigned Students"}
            </h3>
          </div>

          <div className="space-y-1.5">
            {isStudent ? (
              <div className="p-3 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs flex items-center gap-3 cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  AS
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-900 truncate">
                    Prof. Ananya Sharma
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate">
                    Course Instructor &amp; Mentor
                  </p>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            ) : (
              students.map((stu) => (
                <div
                  key={stu.id}
                  onClick={() => setSelectedContactId(stu.id)}
                  className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                    selectedContactId === stu.id
                      ? "bg-white border-neutral-200 shadow-2xs"
                      : "border-transparent hover:bg-neutral-100/70"
                  }`}
                >
                  <img
                    src={stu.avatar}
                    alt={stu.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {stu.name}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {stu.id} • {stu.course}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Thread (8 cols) */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          {/* Thread Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700">
                {isStudent ? "AS" : "ST"}
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900">
                  {isStudent ? "Prof. Ananya Sharma" : "Asha (synthetic)"}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {isStudent
                    ? "Assigned Faculty Mentor • Case CASE-SYN-1007"
                    : "Student ID: SYN-1007 • Cohort CS-Y2"}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              Active Case Channel
            </span>
          </div>

          {/* Thread Message Feed */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px]">
            {currentMessages.map((msg) => {
              const isMine =
                (isStudent && msg.sender === "user") ||
                (!isStudent && msg.sender !== "user");

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 ${
                      isMine
                        ? "bg-neutral-900 text-white rounded-br-xs"
                        : "bg-neutral-100 text-neutral-900 rounded-bl-xs"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <span
                      className={`text-[10px] block text-right ${
                        isMine ? "text-neutral-400" : "text-neutral-400"
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thread Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-neutral-100 flex items-center gap-2 bg-white"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
