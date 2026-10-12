"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSkillHub } from "@/lib/store";
import { SkillHubProgressBar } from "./SkillHubProgressBar";
import { UserAvatar } from "./UserAvatar";
import {
  X,
  Mail,
  Calendar,
  GraduationCap,
  Clock,
  Send,
  CheckCircle2,
  Award,
  BookOpen,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

export function StudentProfileModal() {
  const {
    selectedStudent,
    setSelectedStudent,
    studentMessages,
    sendMessageToStudent,
    updateStudentStatus,
  } = useSkillHub();
  const [message, setMessage] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!selectedStudent) return null;

  const messages = studentMessages[selectedStudent.id] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageToStudent(selectedStudent.id, message);
    setSentSuccess(true);
    setMessage("");
    setTimeout(() => {
      setSentSuccess(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="relative p-4 sm:p-6 pb-3 sm:pb-4 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 border-b border-neutral-100 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
              <UserAvatar
                src={selectedStudent.avatar}
                name={selectedStudent.name}
                className="w-full h-full ring-4 ring-white shadow-md"
              />
              {selectedStudent.isOnline && (
                <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-400/50" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-xl font-bold text-neutral-900 font-heading truncate">
                  {selectedStudent.name}
                </h3>
                {/* Dynamic Status Dropdown Selector */}
                <select
                  value={selectedStudent.status}
                  onChange={(e) =>
                    updateStudentStatus(
                      selectedStudent.id,
                      e.target.value as "Active" | "At Risk" | "Completed" | "Inactive"
                    )
                  }
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border focus:outline-none cursor-pointer transition-colors ${
                    selectedStudent.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : selectedStudent.status === "Completed"
                      ? "bg-blue-50 text-blue-700 border-blue-200/60"
                      : selectedStudent.status === "At Risk"
                      ? "bg-rose-50 text-rose-700 border-rose-200/60"
                      : "bg-neutral-100 text-neutral-600 border-neutral-200"
                  }`}
                >
                  <option value="Active">Active</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Completed">Completed</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5 truncate">
                <Mail className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span className="truncate">{selectedStudent.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedStudent(null)}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick Metrics & Course */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
            <div>
              <p className="text-xs font-bold text-neutral-900">{selectedStudent.course}</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {selectedStudent.progress}% complete • Grade {selectedStudent.grade} • {selectedStudent.attendance} attendance
              </p>
            </div>
            <Link
              href={`/students/${selectedStudent.id}`}
              onClick={() => setSelectedStudent(null)}
              className="px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-neutral-800 transition-colors shrink-0"
            >
              <span>360° View</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Messages */}
          <div className="space-y-2">
            <div className="bg-neutral-50/70 rounded-2xl p-3 max-h-40 overflow-y-auto space-y-2 border border-neutral-100">
              {messages.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-3">
                  No messages yet.
                </p>
              ) : (
                messages.map((m) => {
                  const isUser = m.sender === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-1.5 rounded-xl text-xs ${
                          isUser
                            ? "bg-neutral-900 text-white"
                            : "bg-white text-neutral-800 border border-neutral-200/70 shadow-2xs"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick message compose form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder={`Message ${selectedStudent.name.split(" ")[0]}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
            {sentSuccess && (
              <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sent
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
