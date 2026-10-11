// SUTRA Canonical TypeScript Definitions (Reconciled with FastAPI OpenAPI Contract)

export type UserRole = 'superadmin' | 'leadership' | 'dean' | 'counselor' | 'faculty';

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
  attributions: EvidenceCardItem[];
  limitations: string[];
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

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    status_code: number;
    details?: any;
    request_id?: string;
  };
}
