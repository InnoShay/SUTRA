"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HeartHandshake,
  FileText,
  MessageCircle,
  ChevronDown,
  ArrowUpRight,
  Search,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

export default function HelpPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const faqs: FAQItem[] = [
    {
      id: "how-to-request",
      question: "How do I request support?",
      answer: (
        <p>
          You can submit a support request at any time through the{" "}
          <Link href="/request-support" className="font-semibold text-neutral-900 underline underline-offset-2">
            Request Support
          </Link>{" "}
          page. Select an appropriate category (such as Academic Mentorship, Attendance &amp; Schedule Support, Learning Resources, Student Wellbeing, or General Support), provide a clear subject and description of your concern, and choose your preferred contact method (in-person, video, or phone). Once submitted, your request is logged and routed directly to your campus support advisors.
        </p>
      ),
    },
    {
      id: "track-case",
      question: "How can I track my case?",
      answer: (
        <p>
          You can track all your active and previous requests by visiting{" "}
          <Link href="/cases" className="font-semibold text-neutral-900 underline underline-offset-2">
            My Cases
          </Link>
          . The case list shows your assigned faculty mentor or lead advisor, current status, intervention type, and the date the case was created. Selecting any case opens its detailed history and notes.
        </p>
      ),
    },
    {
      id: "case-statuses",
      question: "What do the different case statuses mean?",
      answer: (
        <div className="space-y-2.5">
          <p>
            SUTRA uses a closed-loop case lifecycle to track each support request from submission to resolution:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-xs sm:text-sm text-neutral-600">
            <li>
              <strong className="text-neutral-900 font-semibold">New / Triaged:</strong> Your request has been received and logged in the campus triage queue for initial evaluation.
            </li>
            <li>
              <strong className="text-neutral-900 font-semibold">Under Review / Actionable:</strong> An advisor is reviewing the details to verify needed assistance and outline intervention steps.
            </li>
            <li>
              <strong className="text-neutral-900 font-semibold">Assigned / Accepted:</strong> A dedicated faculty mentor or advisor has accepted ownership of your request.
            </li>
            <li>
              <strong className="text-neutral-900 font-semibold">In Progress:</strong> Support meetings, academic guidance sessions, or check-ins are actively underway.
            </li>
            <li>
              <strong className="text-neutral-900 font-semibold">Follow-Up Required:</strong> Initial steps have taken place, and a scheduled follow-up checkpoint is set to ensure the support resolved your concern.
            </li>
            <li>
              <strong className="text-neutral-900 font-semibold">Resolved / Closed:</strong> All agreed intervention milestones have been successfully completed, and the case record is archived.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "receive-updates",
      question: "How will I receive updates?",
      answer: (
        <p>
          You will receive updates directly through the in-app{" "}
          <Link href="/messages" className="font-semibold text-neutral-900 underline underline-offset-2">
            Messages
          </Link>{" "}
          screen and the top navigation <strong>Notifications</strong> drawer. When an advisor replies to your request or advances your case state, an unread indicator will appear in your top navigation bar.
        </p>
      ),
    },
    {
      id: "update-request",
      question: "Can I update an existing request?",
      answer: (
        <p>
          Once submitted, active support cases cannot be directly edited by students to maintain audit compliance and official record integrity. However, you can communicate additional details, clarify circumstances, or provide new information at any time by messaging your assigned advisor through{" "}
          <Link href="/messages" className="font-semibold text-neutral-900 underline underline-offset-2">
            Messages
          </Link>{" "}
          or during scheduled one-on-one sessions.
        </p>
      ),
    },
    {
      id: "who-can-access",
      question: "Who can access my information?",
      answer: (
        <p>
          SUTRA strictly enforces institutional privacy boundaries (ADR-004 data minimization). Only you and the faculty mentors, counselors, and advisors explicitly assigned to your campus and case can view your individual support records. Other students cannot see your cases, and executive leadership only has access to aggregated, anonymized statistics. Sensitive financial records are also strictly partitioned from academic support views.
        </p>
      ),
    },
    {
      id: "urgent-issues",
      question: "What should I do if my issue is urgent?",
      answer: (
        <p>
          If you need prompt institutional support, submit a request under the <strong>Student Wellbeing &amp; Counseling</strong> category and choose phone or in-person as your preferred contact method. In-app triage requests are monitored during campus administrative hours. If you are experiencing an immediate physical or medical emergency, or personal safety crisis, please contact your campus emergency security desk, campus medical clinic, or local emergency services directly.
        </p>
      ),
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-7 max-w-5xl mx-auto pb-10">
      {/* A. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-heading">
            Help &amp; Support
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Find answers, understand your cases, or contact the support team.
          </p>
        </div>

        <Link
          href="/request-support"
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full text-xs font-semibold shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Request Support</span>
        </Link>
      </div>

      {/* B. QUICK HELP: 3 COMPACT OPTIONS */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 px-1">
          Quick Help
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. My Cases */}
          <Link
            href="/cases"
            className="group p-5 bg-white rounded-3xl border border-neutral-200/70 hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 group-hover:bg-neutral-200/70 flex items-center justify-center text-neutral-800 transition-colors mb-3.5">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 font-heading group-hover:text-neutral-950">
                My Cases
              </h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                View your cases, current status, and updates.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700 mt-4 group-hover:text-neutral-950">
              <span>View Cases</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* 2. Request Support */}
          <Link
            href="/request-support"
            className="group p-5 bg-white rounded-3xl border border-neutral-200/70 hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mb-3.5">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 font-heading group-hover:text-neutral-950">
                Request Support
              </h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Ask for help with an academic or personal concern.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700 mt-4 group-hover:text-neutral-950">
              <span>Start Request</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>

          {/* 3. Messages */}
          <Link
            href="/messages"
            className="group p-5 bg-white rounded-3xl border border-neutral-200/70 hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 group-hover:bg-neutral-200/70 flex items-center justify-center text-neutral-800 transition-colors mb-3.5">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 font-heading group-hover:text-neutral-950">
                Messages
              </h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                View replies and communicate with your support team.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700 mt-4 group-hover:text-neutral-950">
              <span>Open Messages</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* C. FREQUENTLY ASKED QUESTIONS */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Clear answers about support requests, lifecycle tracking, and privacy.
            </p>
          </div>

          {/* Quick FAQ Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter questions..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200/80 rounded-full text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-200/70 divide-y divide-neutral-100 overflow-hidden shadow-2xs">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No matching questions found for &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isOpen = expandedIndex === index;
              return (
                <div key={faq.id} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isOpen ? null : index)}
                    className="w-full text-left px-5 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-neutral-50/70 transition-colors cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-xs sm:text-sm font-semibold text-neutral-900 font-heading">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-neutral-900" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-4 pt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-50 bg-neutral-50/30 animate-in fade-in duration-150">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* D. CONTACT AND ESCALATION */}
      <div className="bg-white rounded-3xl border border-neutral-200/70 p-5 sm:p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Contact &amp; Assistance
          </h2>
          <h3 className="text-base font-bold text-neutral-900 mt-1 font-heading">
            Need further guidance or follow-up?
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
            All student support requests in SUTRA are handled through structured in-app workflows to ensure audit traceability, advisor accountability, and closed-loop follow-up.
          </p>
        </div>

        {/* Categories Supported in App */}
        <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/60 space-y-2">
          <p className="text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
            Supported Assistance Categories
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Academic Tutoring &amp; Mentorship</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Attendance &amp; Schedule Support</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Learning Materials &amp; Grants</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Student Wellbeing &amp; Counseling</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>General Institutional Guidance</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/request-support"
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Request Support</span>
          </Link>

          <Link
            href="/messages"
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200/80 text-neutral-800 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-neutral-500" />
            <span>Open Messages</span>
          </Link>

          <Link
            href="/cases"
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200/80 text-neutral-800 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-500" />
            <span>View Active Cases</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
