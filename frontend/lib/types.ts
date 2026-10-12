export type UserRole =
  | 'student'
  | 'staff'
  | 'admin'
  | 'superadmin'
  | 'leadership'
  | 'dean'
  | 'counselor'
  | 'faculty';

export interface CampusMembershipItem {
  institution_id: string;
  institution_name?: string | null;
  roles: string[];
  is_active: boolean;
}

export interface AuthMeResponse {
  user_id: string;
  email?: string | null;
  memberships: CampusMembershipItem[];
}

export interface CampusResponse {
  id: string;
  name: string;
  status: string;
  roles: string[];
}

export interface StudentSummary {
  id: string;
  external_ref: string;
  display_name: string;
  cohort_code?: string | null;
  enrollment_status: string;
}

export interface ObservationDTO {
  id: string;
  domain: string;
  metric_key: string;
  value: any;
  unit?: string | null;
  quality_state: string;
  event_at: string;
  available_at?: string | null;
  ingested_at: string;
  source_system: string;
}

export interface FreshnessMetricsDTO {
  total_observations: number;
  domains_represented: string[];
  last_observation_event_at?: string | null;
  last_observation_available_at?: string | null;
  is_stale: boolean;
}

export interface SupportViewResponse {
  student: StudentSummary;
  freshness_metrics: FreshnessMetricsDTO;
  active_signals_count: number;
  active_cases_count: number;
  recent_observations: ObservationDTO[];
  ml_prediction?: MLPredictResponse | null;
}

export interface FinanceObservationDTO {
  id: string;
  fee_support_status: string;
  quality_state: string;
  event_at: string;
  available_at?: string | null;
  ingested_at: string;
  source_system: string;
}

export interface FinanceViewResponse {
  student: StudentSummary;
  finance_observations: FinanceObservationDTO[];
}

export interface EvidenceCardItem {
  feature: string;
  value: any;
  attribution?: number | null;
  direction?: string | null;
}

export interface EvidenceCardDTO {
  card_type: string;
  model_name?: string | null;
  model_version?: string | null;
  prediction_cutoff?: string | null;
  risk_probability?: number | null;
  threshold?: number | null;
  classification?: string | null;
  attributions?: EvidenceCardItem[];
  top_attributions?: EvidenceCardItem[];
  limitations?: string[];
}

export interface SignalDTO {
  id: string;
  institution_id: string;
  student_id: string;
  external_student_ref: string;
  student_display_name: string;
  rule_key: string;
  result: string;
  quality_state: string;
  explanation: Record<string, any>;
  evaluated_at: string;
  reviewed_decision?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_reason_code?: string | null;
  evidence_digest: string;
  evidence_card?: EvidenceCardDTO | null;
}

export interface SignalReviewRequest {
  decision: 'approve' | 'modify' | 'dismiss' | 'request_more_data';
  selected_intervention_key?: string | null;
  reason_code?: string | null;
  rationale?: string | null;
}

export interface SignalReviewResponse {
  signal_id: string;
  review_status: string;
  case_id?: string | null;
  case_state?: string | null;
  reviewed_at: string;
}

export type CaseState =
  | 'NEW'
  | 'TRIAGED'
  | 'UNDER_REVIEW'
  | 'ACTIONABLE'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'FOLLOW_UP_REQUIRED'
  | 'RESOLVED'
  | 'CLOSED';

export interface CaseTaskDTO {
  id: string;
  domain: string;
  generic_label: string;
  state: string;
  assignee_user_id?: string | null;
  due_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  deadline_version: number;
}

export interface CaseEventDTO {
  id: string;
  event_type: string;
  actor_user_id?: string | null;
  actor_kind: string;
  from_state?: string | null;
  to_state?: string | null;
  reason_code?: string | null;
  event_metadata: Record<string, any>;
  created_at: string;
}

export interface FollowUpDTO {
  id: string;
  follow_up_type: string;
  contact_status?: string | null;
  proof_kind: string;
  occurred_at: string;
  recorded_by?: string | null;
  sanitized_note?: string | null;
  proof_ref?: string | null;
  created_at: string;
}

export interface CaseOutcomeDTO {
  id: string;
  outcome_status: string;
  rationale: string;
  evidence_kind: string;
  follow_up_window_start?: string | null;
  follow_up_window_end?: string | null;
  recorded_by?: string | null;
  recorded_at: string;
}

export interface CaseDetailDTO {
  id: string;
  institution_id: string;
  student_id: string;
  external_student_ref: string;
  student_display_name: string;
  originating_signal_id: string;
  selected_intervention_key: string;
  state: CaseState | string;
  primary_owner_user_id?: string | null;
  due_at?: string | null;
  accepted_at?: string | null;
  is_escalated: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  tasks: CaseTaskDTO[];
  events: CaseEventDTO[];
  follow_ups: FollowUpDTO[];
  outcome?: CaseOutcomeDTO | null;
}

export interface CaseTransitionRequest {
  to_state: string;
  reason_code?: string | null;
  metadata?: Record<string, any>;
  expected_version?: number | null;
}

export interface CaseAssignmentRequest {
  primary_owner_user_id: string;
  due_at?: string | null;
  reason_code?: string | null;
  expected_version?: number | null;
}

export interface AcceptAssignmentRequest {
  acceptance_note?: string | null;
}

export interface CreateTaskRequest {
  domain: string;
  generic_label: string;
  assignee_user_id?: string | null;
  due_at?: string | null;
  restricted_details?: Record<string, any> | null;
}

export interface FollowUpRequest {
  follow_up_type: string;
  contact_status?: string | null;
  proof_kind: string;
  occurred_at: string;
  note?: string | null;
  proof_ref?: string | null;
}

export interface OutcomeRequest {
  outcome_status: 'helped' | 'not_helped' | 'mixed' | 'unknown';
  rationale: string;
  evidence_kind?: 'staff_review' | 'student_feedback' | 'academic_record' | 'service_record' | 'insufficient_evidence';
  follow_up_window_end?: string | null;
}

export interface InterventionItem {
  id?: string | null;
  intervention_key: string;
  display_label: string;
  domain: string;
  recipient_role: string;
  required_purpose_key: string;
  requires_human_approval: boolean;
  description?: string | null;
  sla_hours?: number | null;
}

export interface MLModelInfo {
  model_name: string;
  model_version: string;
  status: string;
  threshold: number;
  cutoff_days: number;
  features: string[];
  candidate_model?: Record<string, any> | null;
  decision_threshold?: number | null;
  active_policy_key?: string | null;
  artifact_path?: string | null;
}

export interface MLPredictRequest {
  external_student_ref: string;
  cutoff_days?: number;
  features: Record<string, any>;
}

export interface MLPredictResponse {
  external_student_ref: string;
  risk_probability: number;
  threshold: number;
  classification: 'At_Risk' | 'On_Track';
  evidence_card: EvidenceCardDTO;
  processed_at?: string;
  is_synthetic_fallback?: boolean;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface ReadinessResponse {
  status: string;
  database: string;
  timestamp: string;
}

export interface FeatureReadinessItem {
  feature_name: string;
  category: string;
  status: 'available' | 'missing' | 'stale' | 'underivable_from_source' | string;
  observed_value?: any;
  source_domain?: string | null;
  derivation_note: string;
}

export interface ObservationTelemetryAudit {
  total_observations: number;
  domains_present: string[];
  quality_state_counts: Record<string, number>;
  last_event_at?: string | null;
  last_available_at?: string | null;
  is_stale: boolean;
  unsupported_sources: string[];
}

export interface StudentReadinessResponse {
  student: StudentSummary;
  model_name: string;
  model_version: string;
  target_cutoff: string;
  is_ready_for_inference: boolean;
  applicability_status: string;
  applicability_rationale: string;
  features_total_required: number;
  features_available_count: number;
  features_missing_count: number;
  features_underivable_count: number;
  features_stale_count: number;
  features: FeatureReadinessItem[];
  telemetry_audit: ObservationTelemetryAudit;
  governance_disclaimer: string;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    status_code: number;
    details?: any;
    request_id?: string;
  };
}

// ==========================================
// Phase 6: Bounded AI Orchestration Types
// ==========================================

export interface AICandidateInterventionItem {
  intervention_key: string;
  display_label: string;
  domain: string;
  recipient_role: string;
  confidence: number;
  evidence_grounding: string;
  caveats: string;
}

export interface AIExecutionMetadata {
  model_name: string;
  provider: string;
  latency_ms: number;
  is_mock: boolean;
  timestamp: string;
}

export interface AIReviewBriefRequest {
  signal_id: string;
}

export interface AIStructuredReviewBriefResponse {
  target_student_ref: string;
  signal_id: string;
  summary: string;
  observed_facts: string[];
  model_predictions: string[];
  uncertainties: string[];
  review_questions: string[];
  candidate_interventions: AICandidateInterventionItem[];
  limitations: string[];
  metadata: AIExecutionMetadata;
}

export interface AISummarizeEvidenceRequest {
  student_id: string;
  signal_id?: string | null;
}

export interface AISummarizeEvidenceResponse {
  target_student_ref: string;
  summary: string;
  observed_facts: string[];
  uncertainties: string[];
  limitations: string[];
  metadata: AIExecutionMetadata;
}

export interface AISuggestInterventionsRequest {
  student_id: string;
  signal_id?: string | null;
  max_suggestions?: number | null;
}

export interface AISuggestInterventionsResponse {
  target_student_ref: string;
  candidate_interventions: AICandidateInterventionItem[];
  metadata: AIExecutionMetadata;
}

export interface AIServiceStatusResponse {
  enabled: boolean;
  provider: string;
  model_name: string;
  timeout_seconds: number;
  governance_invariants: string[];
}

// ==========================================
// Counselor Subsystem & Onboarding Domain
// ==========================================

export type CounselorOnboardingStatus =
  | 'NOT_STARTED'
  | 'INCOMPLETE'
  | 'PENDING_VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface CounselorProfileDTO {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  designation: string;
  department: string;
  specializations: string[];
  campus_id: string;
  campus_name: string;
  qualification: string;
  certifications: string[];
  registration_number?: string;
  credentials_verified: boolean;
  contact_methods: ('phone' | 'in_person' | 'video')[];
  availability_schedule: string;
  availability_status: 'available' | 'in_session' | 'away';
  preferred_notification: string;
  assigned_cohorts: string[];
  onboarding_status: CounselorOnboardingStatus;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CounselorOnboardingRequest {
  full_name: string;
  email: string;
  phone?: string;
  designation: string;
  department: string;
  specializations: string[];
  campus_id: string;
  qualification: string;
  certifications: string[];
  registration_number?: string;
  contact_methods: ('phone' | 'in_person' | 'video')[];
  availability_schedule: string;
  preferred_notification: string;
  assigned_cohorts: string[];
}

export interface AuthorityContactItem {
  id: string;
  service_name: string;
  contact_name: string;
  designation: string;
  department: string;
  escalation_category:
    | 'academic_support'
    | 'student_welfare'
    | 'counseling_supervisor'
    | 'institutional_emergency'
    | 'campus_medical';
  contact_number: string;
  contact_email: string;
  communication_method: 'phone' | 'email' | 'portal';
  availability: string;
  verified: boolean;
  is_emergency: boolean;
}

export interface EscalationRequest {
  case_id?: string;
  student_id: string;
  authority_contact_id: string;
  escalation_category: string;
  reason: string;
  notes: string;
  communication_method: 'phone' | 'email' | 'portal';
  urgent: boolean;
}

export interface EscalationRecordDTO {
  id: string;
  case_id?: string;
  student_id: string;
  student_name: string;
  authority_contact_id: string;
  authority_name: string;
  escalation_category: string;
  initiated_by_user_id: string;
  initiator_name: string;
  timestamp: string;
  reason: string;
  communication_method: string;
  status:
    | 'initiated'
    | 'contact_attempted'
    | 'contact_confirmed'
    | 'follow_up_required'
    | 'resolved';
  follow_up_notes?: string;
}

export interface CounselorCallRequestDTO {
  id: string;
  student_id: string;
  student_name: string;
  external_student_ref: string;
  case_id?: string;
  signal_id?: string;
  risk_score: number;
  preferred_contact_method: 'phone' | 'in_person' | 'video';
  preferred_time_slot: 'morning' | 'afternoon' | 'flexible';
  student_notes?: string;
  status:
    | 'requested'
    | 'awaiting_assignment'
    | 'assigned'
    | 'contact_attempted'
    | 'contact_completed'
    | 'closed';
  assigned_counselor_id?: string;
  assigned_counselor_name?: string;
  contact_attempt_count: number;
  last_attempt_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCallRequestInput {
  student_id: string;
  case_id?: string;
  signal_id?: string;
  risk_score?: number;
  preferred_contact_method: 'phone' | 'in_person' | 'video';
  preferred_time_slot: 'morning' | 'afternoon' | 'flexible';
  student_notes?: string;
}

// --- Document Integrity & Blockchain Anchoring Subsystem ---
export interface DocumentDTO {
  id: string;
  institution_id: string;
  document_ref: string;
  title: string;
  doc_type: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  sha256_hash: string;
  status: 'draft' | 'finalized' | 'anchored' | 'anchor_failed';
  created_by: string;
  finalized_by?: string | null;
  finalized_at?: string | null;
  chain_id: number;
  contract_address?: string | null;
  tx_hash?: string | null;
  block_number?: number | null;
  anchored_at?: string | null;
  anchoring_mode: 'simulated' | 'onchain';
  last_verified_at?: string | null;
  verification_status?: 'verified_match' | 'mismatch' | 'unverified' | null;
  explorer_url?: string | null;
  metadata_payload?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DocumentCreateRequest {
  title: string;
  doc_type?: string;
  student_ref?: string;
  student_name?: string;
  content_text?: string;
  metadata_payload?: Record<string, any>;
}

export interface DocumentFinalizeResponse {
  id: string;
  document_ref: string;
  sha256_hash: string;
  status: string;
  finalized_at: string;
  message: string;
}

export interface DocumentAnchorResponse {
  id: string;
  document_ref: string;
  sha256_hash: string;
  status: string;
  chain_id: number;
  contract_address?: string | null;
  tx_hash?: string | null;
  explorer_url?: string | null;
  anchoring_mode: 'simulated' | 'onchain';
  anchored_at: string;
  message: string;
}

export interface DocumentVerifyResponse {
  id: string;
  document_ref: string;
  anchored_hash: string;
  candidate_hash: string;
  is_match: boolean;
  verification_status: 'verified_match' | 'mismatch';
  verified_at: string;
  chain_id: number;
  contract_address?: string | null;
  tx_hash?: string | null;
  explorer_url?: string | null;
  anchoring_mode: string;
  legal_disclaimer: string;
}

export interface DocumentListResponse {
  documents: DocumentDTO[];
  total: number;
  network: string;
}

// --- SBI Digital Rupee (e₹ / CBDC) Incentive Subsystem ---
export interface CBDCVoucherIssueRequest {
  student_ref: string;
  amount_inr: number;
  purpose_code: string;
  milestone_ref: string;
  campus_id: string;
}

export interface CBDCVoucherRecord {
  voucher_id: string;
  student_ref: string;
  amount_inr: number;
  currency: string;
  purpose_code: string;
  milestone_ref: string;
  campus_id: string;
  status: 'SIMULATED_ISSUED' | 'SIMULATED_REDEEMED' | 'PENDING_PSP_CLEARING';
  is_simulated: boolean;
  disclaimer: string;
  issued_at: string;
  redeemed_at?: string | null;
  transaction_reference?: string | null;
}

// --- Cohort Risk Analytics (Phase 5) ---
export interface GranularRiskTiers {
  low_risk: number;
  moderate_risk: number;
  elevated_risk: number;
}

export interface RiskDistributionDTO {
  at_risk_count: number | null;
  at_risk_percentage: number | null;
  on_track_count: number | null;
  on_track_percentage: number | null;
  unevaluated_count: number;
  threshold: number;
  granular_tiers?: GranularRiskTiers | null;
  is_privacy_suppressed: boolean;
  suppression_reason?: string | null;
}

export interface CohortBreakdownItem {
  cohort_code: string;
  total_students: number;
  evaluated_count: number;
  at_risk_count?: number | null;
  at_risk_percentage?: number | null;
  on_track_count?: number | null;
  on_track_percentage?: number | null;
  is_privacy_suppressed: boolean;
  suppression_reason?: string | null;
}

export interface MultiTierTrendPoint {
  date_key: string;
  label: string;
  prediction_runs: number;
  signals_detected: number;
  cases_opened: number;
  confirmed_outcomes: number;
}

export interface CohortAnalyticsSummaryResponse {
  campus_id: string;
  as_of_at: string;
  timeframe: string;
  cohort_filter?: string | null;
  total_students_in_scope: number;
  evaluated_students_count: number;
  total_prediction_runs: number;
  coverage_percentage: number;
  risk_distribution: RiskDistributionDTO;
  cohort_breakdown: CohortBreakdownItem[];
  trend_timeline: MultiTierTrendPoint[];
  case_lifecycle_distribution: { state: string; count: number; is_terminal: boolean }[];
  intervention_distribution: { key: string; label: string; count: number; percentage: number }[];
  governance_disclaimers: string[];
}

export interface CounselorCalendarEvent {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  category: 'math' | 'art' | 'physics' | 'sport' | 'academic' | 'wellbeing' | 'career' | 'attendance';
  dayOfWeek: number; // 1 (Mon) to 7 (Sun)
  dateStr?: string;
  startTime: string; // e.g. "07:00"
  endTime: string; // e.g. "07:40"
  durationLabel: string; // e.g. "7:00am - 7:40am"
  status: 'confirmed' | 'pending' | 'completed';
  color: 'lavender' | 'sky' | 'peach' | 'mint' | 'rose';
  locationOrMode?: string;
  notes?: string;
  hasAttachment?: boolean;
  attachmentTitle?: string;
}
