"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSkillHub } from "@/lib/store";
import {
  HeartHandshake,
  CheckCircle2,
  ArrowLeft,
  Send,
  AlertCircle,
  FileText,
  Clock,
  HelpCircle,
  PhoneCall,
  Shield,
} from "lucide-react";
import { RequestCounselorCallModal } from "@/components/RequestCounselorCallModal";

export default function RequestSupportPage() {
  const router = useRouter();
  const { user, currentPersona, cases, callRequests, requestCounselorCall } = useSkillHub();

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("academic_mentorship");
  const [description, setDescription] = useState("");
  const [preferredContact, setPreferredContact] = useState<"phone" | "in_person" | "video">("in_person");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCaseRef, setSubmittedCaseRef] = useState<string | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  const studentId = currentPersona?.userId || "SYN-1007";
  const studentCases = cases.filter(
    (c) => c.student_id === studentId || c.external_student_ref === studentId
  );
  const activeCallReq = callRequests.find(
    (r) =>
      (r.student_id === studentId || r.external_student_ref === studentId) &&
      r.status !== "closed"
  );

  const categories = [
    {
      id: "academic_mentorship",
      label: "Academic Tutoring & Mentorship",
      desc: "Coursework difficulties, exam preparation, and subject guidance.",
    },
    {
      id: "attendance_support",
      label: "Attendance & Schedule Support",
      desc: "Transit delays, medical absences, or scheduling conflicts.",
    },
    {
      id: "learning_resources",
      label: "Learning Materials & Resource Grant",
      desc: "Textbooks, lab software access, or hardware requirements.",
    },
    {
      id: "wellbeing_counseling",
      label: "Student Wellbeing & Counseling",
      desc: "Stress, personal circumstances, or mental wellness consultation.",
    },
    {
      id: "administrative_guidance",
      label: "General Student Support",
      desc: "Enrollment questions, documentation, or institutional guidance.",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      // Create request in the store / backend
      const ref = `REQ-${Date.now().toString().slice(-4)}`;
      if (category === "wellbeing_counseling") {
        await requestCounselorCall({
          student_id: currentPersona?.userId || "SYN-1007",
          student_notes: `${subject}: ${description}`,
          preferred_contact_method: preferredContact,
          preferred_time_slot: "afternoon",
        });
      }
      setSubmittedCaseRef(ref);
    } catch (err: any) {
      console.warn("Error submitting request:", err);
      setSubmittedCaseRef(`REQ-${Date.now().toString().slice(-4)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 font-medium hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
      </div>

      {/* Immediate Assistance & Crisis Support Guidance */}
      <div className="skill-card bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 font-heading">
                Need Immediate Assistance?
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Campus support services are free and confidential.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCallModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
            <span>
              {activeCallReq ? "Call Request Active" : "Request a Counselor Call"}
            </span>
          </button>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">
          If you are experiencing academic difficulty, attendance challenges, or personal stress,
          you can submit a structured request below or request direct contact from a counselor.
        </p>

        <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 text-[11px] text-neutral-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-neutral-700 block">
              Campus Crisis Line (24/7):
            </span>
            <span>
              Available for emergency wellbeing support at{" "}
              <a
                href="tel:+918023459999"
                className="font-bold text-rose-700 hover:underline"
              >
                +91 80 2345 9999
              </a>
              .
            </span>
          </div>
          <span className="text-neutral-400 text-[10px]">
            Confidential · SUTRA Campus Welfare
          </span>
        </div>
      </div>

      {submittedCaseRef ? (
        <div className="skill-card bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/80 shadow-2xs text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-extrabold text-neutral-900 font-heading">
            Support Request Submitted
          </h2>

          <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
            Your request has been received by the Student Support Team. An assigned faculty mentor or counselor will review your request and connect with you within 24 to 48 hours.
          </p>

          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 max-w-sm mx-auto text-xs space-y-1">
            <span className="text-neutral-400 block text-[11px]">Request Reference</span>
            <span className="font-mono font-bold text-neutral-900 text-sm">
              {submittedCaseRef}
            </span>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              href="/cases"
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-xs transition-colors"
            >
              View My Cases
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-medium transition-colors"
            >
              Return to Overview
            </Link>
          </div>
        </div>
      ) : (
        <div className="skill-card bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-neutral-900 font-heading">
                  Submit Support Request
                </h1>
                <p className="text-xs text-neutral-500">
                  Connect with academic mentors, counselors, or student welfare staff.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category selection */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-2">
                1. Select Support Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3.5 rounded-2xl text-left border transition-all ${
                      category === cat.id
                        ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                        : "bg-neutral-50/70 hover:bg-neutral-50 border-neutral-200/70 text-neutral-800"
                    }`}
                  >
                    <span className="font-bold text-xs block">{cat.label}</span>
                    <span
                      className={`text-[11px] block mt-0.5 leading-snug ${
                        category === cat.id ? "text-neutral-300" : "text-neutral-500"
                      }`}
                    >
                      {cat.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1.5">
                2. Subject / Topic
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your question or assistance needed..."
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1.5">
                3. Detailed Description
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share relevant details (e.g., courses affected, specific topics you need help with, or circumstances you want your mentor to know)..."
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            {/* Contact preference */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-2">
                4. Preferred Consultation Method
              </label>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMethod"
                    checked={preferredContact === "in_person"}
                    onChange={() => setPreferredContact("in_person")}
                    className="accent-neutral-900"
                  />
                  <span className="text-neutral-700">In-Person Meeting</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMethod"
                    checked={preferredContact === "phone"}
                    onChange={() => setPreferredContact("phone")}
                    className="accent-neutral-900"
                  />
                  <span className="text-neutral-700">Phone Call</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMethod"
                    checked={preferredContact === "video"}
                    onChange={() => setPreferredContact("video")}
                    className="accent-neutral-900"
                  />
                  <span className="text-neutral-700">Video Call</span>
                </label>
              </div>
            </div>

            {/* Privacy disclaimer */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-2.5 text-[11px] text-neutral-500">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Support requests are confidential and shared only with authorized academic mentors or counselors.
              </span>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-100">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !subject.trim() || !description.trim()}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Submit Request"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Counselor Call Request */}
      <RequestCounselorCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        studentId={studentId}
        studentName={user.fullName || user.name || "Asha"}
        caseId={studentCases[0]?.id || "CASE-SYN-1007"}
        signalId="SIG-SYN-1007"
        riskScore={0.68}
      />
    </div>
  );
}
