"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import {
  PhoneCall,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  HeartHandshake,
  MessageSquare,
  Shield,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface RequestCounselorCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  studentName?: string;
  caseId?: string;
  signalId?: string;
  riskScore?: number;
}

export function RequestCounselorCallModal({
  isOpen,
  onClose,
  studentId = "SYN-1007",
  studentName = "Asha (synthetic)",
  caseId = "CASE-SYN-1007",
  signalId = "SIG-SYN-1007",
  riskScore = 0.68,
}: RequestCounselorCallModalProps) {
  const { requestCounselorCall, callRequests } = useSkillHub();

  const [preferredMethod, setPreferredMethod] = useState<"phone" | "in_person" | "video">("phone");
  const [preferredTime, setPreferredTime] = useState<"morning" | "afternoon" | "flexible">("afternoon");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if an active call request already exists for this student
  const existingRequest = callRequests.find(
    (r) => r.student_id === studentId && r.status !== "closed"
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await requestCounselorCall({
        student_id: studentId,
        case_id: caseId,
        signal_id: signalId,
        risk_score: riskScore,
        preferred_contact_method: preferredMethod,
        preferred_time_slot: preferredTime,
        student_notes: notes.trim(),
      });
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Failed to submit counselor call request:", err);
      setErrorMessage(err.message || "Failed to submit request to backend. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-counselor-call-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="request-counselor-call-title"
                className="text-base font-bold text-neutral-900 font-heading"
              >
                Request a Counselor Consultation
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Confidential student support &amp; academic wellbeing guidance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSubmitted ? (
          /* Confirmation Success Screen */
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-neutral-900">
                Call Request Submitted Successfully
              </h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Your request has been routed to the Student Wellbeing &amp; Counseling unit.
                An assigned counselor will reach out to you via your preferred channel during the
                selected time window.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-left text-xs space-y-2">
              <div className="flex justify-between items-center text-neutral-600">
                <span className="text-neutral-400 font-medium">Status</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Awaiting Counselor Outreach
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span className="text-neutral-400 font-medium">Channel</span>
                <span className="font-semibold capitalize text-neutral-800">
                  {preferredMethod.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span className="text-neutral-400 font-medium">Time Window</span>
                <span className="font-semibold capitalize text-neutral-800">
                  {preferredTime} Slot
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDone}
                className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : existingRequest ? (
          /* Existing Request Already Active */
          <div className="p-6 sm:p-8 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-neutral-900">
                Counselor Request in Progress
              </h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                You already have an active counselor consultation request submitted on{" "}
                <span className="font-medium text-neutral-700">
                  {new Date(existingRequest.created_at).toLocaleDateString()}
                </span>
                . Our counseling team is actively processing your queue.
              </p>
            </div>
            <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">Request ID</span>
                <span className="font-mono text-neutral-700 font-semibold">{existingRequest.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Current Status</span>
                <span className="capitalize font-semibold text-indigo-700">
                  {existingRequest.status.replace("_", " ")}
                </span>
              </div>
              {existingRequest.assigned_counselor_name && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Assigned Counselor</span>
                  <span className="font-semibold text-neutral-800">
                    {existingRequest.assigned_counselor_name}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-semibold transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          /* Request Form */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Context Note */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-3">
              <Shield className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                <span className="font-semibold text-neutral-800">Voluntary &amp; Confidential:</span>{" "}
                Consultations are provided by certified campus psychologists. Academic standing is never
                adversely impacted by seeking support.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Preferred Communication Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 block">
                Preferred Contact Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "phone", label: "Phone Call", desc: "Voice check-in" },
                  { id: "in_person", label: "In-Person", desc: "Campus clinic" },
                  { id: "video", label: "Video Meet", desc: "Secure link" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPreferredMethod(m.id as any)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      preferredMethod === m.id
                        ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                        : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/80"
                    }`}
                  >
                    <div className="text-xs font-bold">{m.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        preferredMethod === m.id ? "text-neutral-300" : "text-neutral-400"
                      }`}
                    >
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Time Window */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 block">
                Suitable Contact Window
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "morning", label: "Morning", time: "09:00 - 12:00" },
                  { id: "afternoon", label: "Afternoon", time: "13:00 - 16:30" },
                  { id: "flexible", label: "Flexible", time: "Any available" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPreferredTime(t.id as any)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      preferredTime === t.id
                        ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                        : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/80"
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        preferredTime === t.id ? "text-neutral-300" : "text-neutral-400"
                      }`}
                    >
                      {t.time}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Topic or Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 block">
                What would you like to discuss? (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Guidance on balancing course workload, lab attendance hurdles, or personal wellness..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200/80 text-xs text-neutral-900 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-all resize-none placeholder:text-neutral-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-neutral-200/80 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Submit Call Request"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default RequestCounselorCallModal;
