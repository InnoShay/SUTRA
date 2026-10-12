"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import { AuthorityContactItem } from "@/lib/types";

interface ContactAuthorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
  studentId?: string;
  studentName?: string;
}

export function ContactAuthorityModal({
  isOpen,
  onClose,
  caseId = "CASE-SYN-1007",
  studentId = "SYN-1007",
  studentName = "Asha (synthetic)",
}: ContactAuthorityModalProps) {
  const { authorityContacts, escalateCaseToAuthority } = useSkillHub();

  const [selectedAuthorityId, setSelectedAuthorityId] = useState<string>(
    authorityContacts[0]?.id || "AUTH-01"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("counseling_supervisor");
  const [communicationMethod, setCommunicationMethod] = useState<"phone" | "email" | "portal">("phone");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<any | null>(null);

  if (!isOpen) return null;

  const selectedAuthority =
    authorityContacts.find((a) => a.id === selectedAuthorityId) || authorityContacts[0];

  const handleSelectAuthority = (auth: AuthorityContactItem) => {
    setSelectedAuthorityId(auth.id);
    setSelectedCategory(auth.escalation_category);
    setCommunicationMethod(auth.communication_method);
    if (auth.is_emergency) setIsUrgent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      const rec = await escalateCaseToAuthority({
        case_id: caseId,
        student_id: studentId,
        authority_contact_id: selectedAuthority.id,
        escalation_category: selectedCategory,
        reason: reason.trim(),
        notes: notes.trim(),
        communication_method: communicationMethod,
        urgent: isUrgent,
      });
      setSubmittedRecord(rec);

      if (communicationMethod === "phone" && selectedAuthority.contact_number) {
        const cleanNumber = selectedAuthority.contact_number.replace(/\s+/g, "");
        window.open(`tel:${cleanNumber}`, "_self");
      } else if (communicationMethod === "email" && selectedAuthority.contact_email) {
        window.open(
          `mailto:${selectedAuthority.contact_email}?subject=SUTRA%20Escalation%20Case%20${caseId}&body=${encodeURIComponent(
            reason
          )}`,
          "_self"
        );
      }
    } catch (err) {
      console.error("Failed to escalate to authority:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-authority-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (No SVGs) */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-100 bg-neutral-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h3
                id="contact-authority-title"
                className="text-base font-bold text-neutral-900 font-heading"
              >
                Contact Institutional Authority &amp; Escalate
              </h3>
              {isUrgent && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  High Priority
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Targeted institutional coordination for {studentName} ({studentId})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-700 transition-colors flex items-center justify-center text-sm font-semibold cursor-pointer"
            title="Close dialog"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {submittedRecord ? (
          /* Confirmation Screen */
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-neutral-900">
                Escalation Recorded &amp; Outreach Initiated
              </h4>
              <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                The institutional authority contact action has been registered in the case audit log.
                Your communication interface has been opened for{" "}
                <span className="font-semibold text-neutral-800">
                  {selectedAuthority.contact_name}
                </span>
                .
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-neutral-400">Escalation ID</span>
                <span className="font-mono text-neutral-800 font-semibold">{submittedRecord.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Target Authority</span>
                <span className="font-semibold text-neutral-800">{selectedAuthority.service_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Contact Person</span>
                <span className="font-semibold text-neutral-800">{selectedAuthority.contact_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Communication Mode</span>
                <span className="font-semibold capitalize text-neutral-800">
                  {communicationMethod} ({selectedAuthority.contact_number})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Audit Status</span>
                <span className="font-semibold text-neutral-900 bg-neutral-200 px-2 py-0.5 rounded-full">
                  Contact Attempted
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full max-w-md mx-auto py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
              >
                Close &amp; Return to Case
              </button>
            </div>
          </div>
        ) : (
          /* Escalation Form */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
            {/* Step 1: Select Verified Authority */}
            <div>
              <label className="text-xs font-semibold text-neutral-800 block mb-2">
                1. Select Institution-Approved Authority
              </label>
              <div className="space-y-2">
                {authorityContacts.map((auth) => {
                  const isSelected = auth.id === selectedAuthorityId;
                  return (
                    <div
                      key={auth.id}
                      onClick={() => handleSelectAuthority(auth)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-neutral-50/90 border-2 border-neutral-900 shadow-xs"
                          : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/80"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 truncate">{auth.service_name}</span>
                          {auth.is_emergency && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-600 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              24/7 Emergency
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 text-neutral-600 font-medium">
                          {auth.contact_name} • {auth.designation}
                        </p>
                        <p className="text-[11px] font-mono mt-0.5 text-neutral-500">
                          {auth.contact_number} • {auth.availability}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {isSelected ? (
                          <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                            Selected
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-neutral-500">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Communication Mode */}
            <div>
              <label className="text-xs font-semibold text-neutral-800 block mb-1.5">
                2. Communication Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "phone", label: "Direct Phone Call", desc: selectedAuthority.contact_number },
                  { id: "email", label: "Official Email", desc: selectedAuthority.contact_email },
                  { id: "portal", label: "Campus Support Log", desc: "Internal Record" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setCommunicationMethod(mode.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      communicationMethod === mode.id
                        ? "bg-neutral-50 border-2 border-neutral-900 text-neutral-900 shadow-xs"
                        : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/80"
                    }`}
                  >
                    <div className="text-xs font-bold text-neutral-900">{mode.label}</div>
                    <div className="text-[10px] truncate mt-0.5 text-neutral-500 font-mono">
                      {mode.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Substantive Reason for Escalation */}
            <div>
              <label className="text-xs font-semibold text-neutral-800 block mb-1">
                3. Substantive Escalation Rationale (Mandatory)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detail specific academic or wellbeing indicators necessitating authority coordination (e.g., student attendance drop below Day-30 threshold, academic probation risk, medical crisis)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200/80 text-xs text-neutral-900 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-all resize-none"
                required
              />
            </div>

            {/* Additional Case Notes */}
            <div>
              <label className="text-xs font-semibold text-neutral-800 block mb-1">
                4. Sanitized Case Notes / Follow-up Requirements (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Administration review requested before committee session..."
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200/80 text-xs text-neutral-900 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-all"
              />
            </div>

            {/* Emergency Checkbox */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/70 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900">
                Mark as Urgent Emergency Escalation
              </span>
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900"
              />
            </div>

            {/* Modal Actions */}
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
                disabled={isSubmitting || !reason.trim()}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isUrgent
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-neutral-900 hover:bg-neutral-800 text-white"
                }`}
              >
                <span>
                  {isSubmitting
                    ? "Recording..."
                    : communicationMethod === "phone"
                    ? `Initiate Call (${selectedAuthority.contact_number})`
                    : "Record Escalation"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ContactAuthorityModal;
