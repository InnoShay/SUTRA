"use client";

import React, { useState } from "react";
import { useSkillHub } from "@/lib/store";
import {
  UserCheck,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  Phone,
  Mail,
  Building,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  HeartHandshake,
} from "lucide-react";

interface CounselorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CounselorOnboardingModal({
  isOpen,
  onClose,
}: CounselorOnboardingModalProps) {
  const {
    counselorProfile,
    submitCounselorOnboarding,
    approveCounselorOnboarding,
    authorityContacts,
    activeRole,
    activeCampusName,
    user,
  } = useSkillHub();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState(counselorProfile?.full_name || user.fullName || "Dr. Meera Nambiar");
  const [email, setEmail] = useState(counselorProfile?.email || user.email || "counselor@sutra.edu");
  const [phone, setPhone] = useState(counselorProfile?.phone || "+91 98765 43210");
  const [designation, setDesignation] = useState(counselorProfile?.designation || "Senior Student Counselor");
  const [department, setDepartment] = useState(counselorProfile?.department || "Student Wellbeing & Counseling Services");
  const [specializations, setSpecializations] = useState<string[]>(
    counselorProfile?.specializations?.length
      ? counselorProfile.specializations
      : ["Academic Stress Management", "Transition Counseling", "Cognitive Behavioral Support"]
  );
  const [qualification, setQualification] = useState(counselorProfile?.qualification || "Ph.D. in Clinical Psychology (NIMHANS)");
  const [certifications, setCertifications] = useState<string[]>(
    counselorProfile?.certifications?.length
      ? counselorProfile.certifications
      : ["Certified Counseling Psychologist (RCI)", "Trauma-Informed Student Care"]
  );
  const [registrationNumber, setRegistrationNumber] = useState(counselorProfile?.registration_number || "RCI-CRR-2018-94812");
  const [contactMethods, setContactMethods] = useState<("phone" | "in_person" | "video")[]>(
    counselorProfile?.contact_methods || ["phone", "in_person"]
  );
  const [availabilitySchedule, setAvailabilitySchedule] = useState(
    counselorProfile?.availability_schedule || "Mon - Fri, 09:30 AM - 05:30 PM"
  );
  const [preferredNotification, setPreferredNotification] = useState(
    counselorProfile?.preferred_notification || "email_and_sms"
  );
  const [assignedCohorts, setAssignedCohorts] = useState<string[]>(
    counselorProfile?.assigned_cohorts?.length
      ? counselorProfile.assigned_cohorts
      : ["Cohort CS-Y2 (Computer Science)", "Cohort EC-Y2 (Electronics)"]
  );

  const isAdmin = activeRole === "dean" || activeRole === "superadmin" || activeRole === "leadership";

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep((prev) => (prev + 1) as any);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitCounselorOnboarding({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        department: department.trim(),
        specializations,
        campus_id: counselorProfile?.campus_id || "00000000-0000-0000-0000-000000000001",
        qualification: qualification.trim(),
        certifications,
        registration_number: registrationNumber.trim(),
        contact_methods: contactMethods,
        availability_schedule: availabilitySchedule.trim(),
        preferred_notification: preferredNotification,
        assigned_cohorts: assignedCohorts,
      });
      setCurrentStep(5); // Completion Screen
    } catch (err) {
      console.error("Failed to submit onboarding:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="counselor-onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="counselor-onboarding-title"
                className="text-base font-bold text-neutral-900 font-heading"
              >
                Institutional Counselor Onboarding
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Role credentialing, availability parameters &amp; emergency escalation protocols
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator (Steps 1 to 4) */}
        {currentStep <= 4 && (
          <div className="px-6 py-3 bg-white border-b border-neutral-100 flex items-center justify-between text-xs">
            {[
              { num: 1, label: "Professional Info" },
              { num: 2, label: "Credentials" },
              { num: 3, label: "Preferences" },
              { num: 4, label: "Emergency & Escalation" },
            ].map((step) => (
              <div
                key={step.num}
                className={`flex items-center gap-2 ${
                  currentStep === step.num
                    ? "text-neutral-900 font-bold"
                    : currentStep > step.num
                    ? "text-emerald-600 font-semibold"
                    : "text-neutral-400 font-medium"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep === step.num
                      ? "bg-neutral-900 text-white"
                      : currentStep > step.num
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {currentStep > step.num ? "✓" : step.num}
                </span>
                <span className="hidden sm:inline text-[11px]">{step.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: Professional Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-neutral-100 pb-2">
                <h4 className="text-sm font-bold text-neutral-900">
                  Section 1: Professional Identity &amp; Appointment
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Institutional appointment details within the campus student wellbeing division
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Full Name &amp; Title
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
                    placeholder="e.g. Dr. Meera Nambiar"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
                    placeholder="counselor@sutra.edu"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Contact Phone (Institutional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
                    placeholder="Senior Student Counselor"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Department / Counseling Unit
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
                  placeholder="Student Wellbeing & Counseling Services"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Campus Assignment
                </label>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 font-medium">
                  {activeCampusName}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Professional Credentials */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-b border-neutral-100 pb-2">
                <h4 className="text-sm font-bold text-neutral-900">
                  Section 2: Academic &amp; Clinical Credentials
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Qualifications and statutory licenses subject to institutional verification
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Highest Clinical Qualification
                </label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
                  placeholder="e.g. Ph.D. in Clinical Psychology / M.Phil Clinical Psychology"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Professional Registration / License Number
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
                  placeholder="e.g. RCI-CRR-2018-94812"
                />
              </div>

              {/* Verification Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <span className="font-semibold">Verification Notice:</span> Credentials submitted here
                  are queued for review by the Dean of Student Welfare. Accounts do not receive
                  privileged access to sensitive student records until verified.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Working Preferences */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-b border-neutral-100 pb-2">
                <h4 className="text-sm font-bold text-neutral-900">
                  Section 3: Availability &amp; Consultation Preferences
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Operating schedule, contact modes, and student outreach availability
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Availability Schedule
                </label>
                <input
                  type="text"
                  value={availabilitySchedule}
                  onChange={(e) => setAvailabilitySchedule(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 bg-neutral-50/50"
                  placeholder="Mon - Fri, 09:30 AM - 05:30 PM"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                  Authorized Contact Modes
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "phone", label: "Phone Outreach" },
                    { key: "in_person", label: "In-Person Clinic" },
                    { key: "video", label: "Video Consultation" },
                  ].map((mode) => {
                    const isSelected = contactMethods.includes(mode.key as any);
                    return (
                      <button
                        type="button"
                        key={mode.key}
                        onClick={() => {
                          if (isSelected) {
                            setContactMethods(contactMethods.filter((m) => m !== mode.key));
                          } else {
                            setContactMethods([...contactMethods, mode.key as any]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                          isSelected
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                            : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Assigned Student Cohorts
                </label>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700">
                  {assignedCohorts.join(", ")}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Emergency and Escalation Configuration */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="border-b border-neutral-100 pb-2">
                <h4 className="text-sm font-bold text-neutral-900">
                  Section 4: Institution-Approved Escalation Contacts
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Designated institutional authorities accessible for case coordination and emergency triage
                </p>
              </div>

              <div className="space-y-2">
                {authorityContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900">
                          {contact.service_name}
                        </span>
                        {contact.is_emergency && (
                          <span className="text-[11px] font-mono text-rose-600 font-semibold">
                            • Emergency 24/7
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {contact.contact_name} • {contact.designation}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {contact.contact_number} • {contact.contact_email}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Completion Confirmation Screen */}
          {currentStep === 5 && (
            <div className="py-6 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-neutral-900">
                  Counselor Onboarding Active
                </h4>
                <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                  Your professional counselor profile has been registered on the SUTRA platform.
                  Permissions are calibrated for student wellbeing triage, closed-loop case notes,
                  and authority escalation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Counselor Name</span>
                  <span className="font-semibold text-neutral-800">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Onboarding Status</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    APPROVED
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Credentials Verification</span>
                  <span className="font-semibold text-emerald-700">Verified (RCI Registered)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Department</span>
                  <span className="font-semibold text-neutral-800">{department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Emergency Protocols</span>
                  <span className="font-semibold text-neutral-800">Enabled (4 Authorities)</span>
                </div>
              </div>

              <div className="pt-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm transition-all"
                >
                  Go to Counselor Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {currentStep <= 4 && (
          <div className="p-4 sm:p-5 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/40">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-full border border-neutral-200/80 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 flex items-center gap-1.5 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-neutral-200/80 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSubmitting ? "Submitting..." : "Complete Onboarding"}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CounselorOnboardingModal;
