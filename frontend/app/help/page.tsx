"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import {
  HelpCircle,
  Book,
  MessageCircle,
  FileText,
  ArrowUpRight,
  Search,
  ChevronDown,
  X,
  Send,
  Check,
  Shield,
  Activity,
  Layers,
  CheckCircle2,
} from "lucide-react";

export default function HelpPage() {
  const { user, backendConnected } = useSkillHub();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const categories = ["All", "Orchestration", "Case Lifecycle", "Privacy", "ML Governance"];

  const allFaqs = [
    {
      category: "Orchestration",
      q: "What does the product principle 'No Alert Without Action' mean?",
      a: "Every early warning or rule-triggered alert requires an explicit human review action (Approve to create case, Modify intervention, or Dismiss with rationale). Signals never languish as ignored notifications and automated actions are never triggered without human educator accountability.",
    },
    {
      category: "Case Lifecycle",
      q: "How does the SUTRA 10-State Case Machine govern interventions?",
      a: "Cases progress strictly through audited transitions: NEW -> TRIAGED -> UNDER_REVIEW -> ACTIONABLE -> ASSIGNED -> ACCEPTED -> IN_PROGRESS -> FOLLOW_UP_REQUIRED -> RESOLVED -> CLOSED. Every transition records reviewer identity, transition rationale, and follow-up verification evidence.",
    },
    {
      category: "Privacy",
      q: "Why are individual student profiles hidden in Leadership role (ADR-004)?",
      a: "Under ADR-004 and data minimization governance, executive leadership accounts are restricted to institutional cohort-level aggregates. FastAPI returns HTTP 403 InstitutionalPrivacyRestrictedError if leadership attempts to inspect individual student 360° telemetry.",
    },
    {
      category: "Privacy",
      q: "What is Sensitive Domain Separation (ADR-003)?",
      a: "Fee records, financial hardship applications, and billing arrears are strictly partitioned from academic telemetry. Educators and academic mentors cannot view financial records in student support views.",
    },
    {
      category: "ML Governance",
      q: "How are Evidence Cards and Platt calibration thresholds applied?",
      a: "Early warning models run Day-30 inference with Platt-calibrated thresholds (0.46) to maximize sensitivity without bias. Models output Evidence Cards with feature attributions rather than autonomous diagnoses.",
    },
  ];

  const filteredFaqs = allFaqs.filter((faq) => {
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketSubmitted(false);
      setIsTicketModalOpen(false);
      setTicketSubject("");
      setTicketMessage("");
    }, 1800);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            SUTRA Runbook &amp; Documentation
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Operational workflows, 10-state case transitions, and institutional privacy runbooks
          </p>
        </div>

        <button
          onClick={() => setIsTicketModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all min-h-[44px] self-start sm:self-auto active:scale-95"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Support Escalation</span>
        </button>
      </div>

      {/* System Health Status Card */}
      <div className="skill-card bg-white p-5 rounded-3xl border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-900 flex items-center gap-2">
              <span>Backend Core API Status</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {backendConnected ? "ONLINE" : "STANDBY"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              FastAPI v0.115 • Supabase JWT Verification Active • Temporal UTC Cutoffs
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-neutral-500">
          Campus: Apex Main (v1)
        </div>
      </div>

      {/* 2. SEARCH BAR & CATEGORIES */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SUTRA policy rules, state transitions, privacy safeguards..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200/80 rounded-2xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-100/70 border border-neutral-200/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. FAQ ACCORDION LIST */}
      <div className="space-y-3">
        {filteredFaqs.map((faq, index) => {
          const isOpen = expandedFaqIndex === index;
          return (
            <div
              key={index}
              className="skill-card bg-white rounded-2xl border border-neutral-100 overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpandedFaqIndex(isOpen ? null : index)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
              >
                <span className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 transition-transform flex-shrink-0 ${
                    isOpen ? "rotate-180 text-neutral-900" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-neutral-600 leading-relaxed border-t border-neutral-50 pt-3 animate-in fade-in duration-150">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="py-12 text-center text-xs text-neutral-400 bg-white rounded-2xl border border-neutral-100">
            No questions found matching your query
          </div>
        )}
      </div>

      {/* Support Escalation Modal */}
      {isTicketModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsTicketModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">
                Log Support Escalation
              </h3>
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTicketSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Escalation Topic
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Urgent Case Escalation / False Positive Report"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Details &amp; Case Reference
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide details on the case ID, student cohort, or rule version..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none"
                />
              </div>

              {ticketSubmitted && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Escalation logged to Dean review dispatch.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketSubmitted}
                  className="px-5 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-full hover:bg-neutral-800"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
