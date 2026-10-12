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

export type MLAttribution = EvidenceCardItem;

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

// ==========================================
// Phase 6: Model Performance Dashboard Domain
// ==========================================

export interface ModelDatasetProvenance {
  dataset_label: string;
  partition: string;
  evaluation_date: string;
  sample_size: number;
  unique_students: number;
  raw_rows_examined: number;
  outcome_definition: string;
  class_prevalence: number;
  actual_at_risk_count: number;
  actual_on_track_count: number;
  provenance_type: 'offline_held_out_benchmark' | 'live_production_telemetry';
  provenance_warning?: string | null;
}

export interface ConfusionMatrixDTO {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface OperationalWorkloadDTO {
  total_alerts_fired: number;
  alert_rate_pct: number;
  false_alarms_advisor_burden: number;
  missed_at_risk_students: number;
  successful_proactive_catches: number;
}

export interface ReliabilityBinDTO {
  bin_range: string;
  samples_count: number;
  mean_predicted_prob: number;
  observed_positive_rate: number;
  calibration_gap: number;
}

export interface SubgroupMetricDTO {
  dimension: string;
  subgroup: string;
  sample_size: number;
  confidence_flag: 'STABLE' | 'LOW_CONFIDENCE (<100)';
  positives_count: number;
  negatives_count: number;
  prevalence: number;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  recall: number;
  precision: number;
  specificity: number;
  false_positive_rate: number;
  f1_score: number;
  roc_auc: number;
  pr_auc: number;
  is_suppressed?: boolean;
}

export interface ThresholdIndependentMetricsDTO {
  roc_auc: number;
  pr_auc: number;
  brier_score: number;
  expected_calibration_error_ece: number;
  maximum_calibration_error_mce: number;
}

export interface ThresholdDependentMetricsDTO {
  threshold: number;
  accuracy: number;
  balanced_accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  false_positive_rate: number;
  f1_score: number;
  confusion_matrix: ConfusionMatrixDTO;
  operational_workload: OperationalWorkloadDTO;
}

export interface ROCCurvePointDTO {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface PRCurvePointDTO {
  precision: number;
  recall: number;
  threshold: number;
}

export interface LiveMonitoringTelemetryDTO {
  total_inferences_logged: number;
  average_latency_ms: number;
  active_campus_count: number;
  monitoring_window: string;
  status: 'healthy' | 'degraded' | 'idle';
  telemetry_notice: string;
}

export interface ModelPerformanceResponse {
  model_name: string;
  model_version: string;
  operational_threshold: number;
  evaluation_environment: 'offline_held_out_benchmark' | 'live_production_telemetry';
  dataset_provenance: ModelDatasetProvenance;
  threshold_independent_metrics: ThresholdIndependentMetricsDTO;
  threshold_dependent_metrics: ThresholdDependentMetricsDTO;
  reliability_table: ReliabilityBinDTO[];
  roc_curve_points?: ROCCurvePointDTO[] | null;
  pr_curve_points?: PRCurvePointDTO[] | null;
  subgroup_metrics: SubgroupMetricDTO[];
  live_telemetry?: LiveMonitoringTelemetryDTO | null;
  fairness_disclaimer: string;
  non_causal_disclaimer: string;
  limitations: string[];
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

// ==========================================
// Phase 7: Historical Risk Trends & Monitoring
// ==========================================

export interface HistoricalSnapshotPoint {
  snapshot_id: string;
  snapshot_timestamp: string;
  model_version: string;
  model_name: string;
  prediction_cutoff: string;
  feature_schema_version: string;
  total_prediction_runs: number;
  unique_students_evaluated: number;
  repeated_rescores_count: number;
  at_risk_count?: number | null;
  at_risk_percentage?: number | null;
  on_track_count?: number | null;
  on_track_percentage?: number | null;
  low_risk_count?: number | null;
  moderate_risk_count?: number | null;
  elevated_risk_count?: number | null;
  mean_risk_probability: number;
  is_privacy_suppressed: boolean;
  suppression_reason?: string | null;
  is_comparable: boolean;
  incompatibility_reason?: string | null;
}

export interface CohortRiskTrendResponse {
  campus_id: string;
  cohort_code?: string | null;
  reference_model_version: string;
  reference_cutoff: string;
  total_historical_runs: number;
  total_unique_students: number;
  rescore_frequency: number;
  has_comparable_history: boolean;
  snapshots: HistoricalSnapshotPoint[];
  incompatible_snapshots_detected: number;
  data_gap_notice?: string | null;
  causality_disclaimer: string;
  retention_applied_days?: number | null;
  governance_disclaimers: string[];
}

export interface StudentRiskTrajectoryPoint {
  prediction_id: string;
  timestamp: string;
  model_version: string;
  model_name: string;
  prediction_cutoff: string;
  risk_probability: number;
  threshold: number;
  classification: string;
  score_delta_from_previous?: number | null;
  is_comparable_to_previous: boolean;
  incompatibility_note?: string | null;
}

export interface StudentRiskTrajectoryResponse {
  campus_id: string;
  student_id?: string | null;
  external_student_ref: string;
  total_evaluations: number;
  unique_timestamps_count: number;
  trajectory: StudentRiskTrajectoryPoint[];
  is_stale: boolean;
  causality_notice: string;
}

export interface CohortOutcomeEvaluationPoint {
  cohort_label: string;
  model_version: string;
  evaluation_date: string;
  labeled_sample_size: number;
  ground_truth_status: 'AVAILABLE_HISTORICAL' | 'PENDING_TERM_COMPLETION';
  realized_accuracy?: number | null;
  realized_recall?: number | null;
  realized_precision?: number | null;
  realized_fpr?: number | null;
  realized_roc_auc?: number | null;
  realized_brier?: number | null;
  drift_status: 'STABLE' | 'DEGRADED' | 'LABELS_PENDING';
  drift_warning?: string | null;
}

export interface HistoricalPerformanceMonitoringResponse {
  campus_id: string;
  monitoring_status: string;
  outcome_definition: string;
  total_labeled_cohorts: number;
  evaluations: CohortOutcomeEvaluationPoint[];
  evaluation_protocol_notice: string;
  governance_disclaimers: string[];
}

// ==========================================
// Phase 8: Governed What-If Scenario Types
// ==========================================

export interface SupportedScenarioFeature {
  feature_name: string;
  min_value: number;
  max_value: number;
  feature_type: string;
  label: string;
  unit: string;
  default_value: number;
  description: string;
}

export interface HypotheticalFeatureModification {
  feature: string;
  label: string;
  original_value: number;
  hypothetical_value: number;
  unit: string;
  delta: number;
}

export interface SupportPlanningGuidance {
  title: string;
  why_model_cannot_estimate_causal_interventions: string;
  recommended_educator_actions: string[];
  causal_claim_warning: string;
}

export interface WhatIfScenarioRequest {
  external_student_ref?: string;
  base_features?: Record<string, any>;
  hypothetical_modifications: Record<string, number>;
}

export interface WhatIfScenarioResponse {
  scenario_id: string;
  student_ref: string;
  model_name: string;
  model_version: string;
  prediction_cutoff: string;
  threshold: number;
  baseline_risk_probability: number;
  baseline_classification: 'At_Risk' | 'On_Track';
  baseline_top_attributions: MLAttribution[];
  hypothetical_risk_probability: number;
  hypothetical_classification: 'At_Risk' | 'On_Track';
  hypothetical_top_attributions: MLAttribution[];
  delta_probability: number;
  delta_percentage_points: number;
  tier_transition: string;
  modified_features: HypotheticalFeatureModification[];
  is_hypothetical: boolean;
  is_official_record: boolean;
  ephemeral_notice: string;
  non_causal_disclaimer: string;
  temporal_cutoff_notice: string;
  support_planning_guidance: SupportPlanningGuidance;
}

// ============================================================================
// Phase 3A: Backend Handoff & Integration Readiness Contracts (Proposed Endpoints)
// NOTE: These interfaces define the contracts for endpoints currently in backend
// implementation. The frontend is prepared to consume these upon backend release.
// ============================================================================

// --- 1. Student-Scoped Case Retrieval Contract: GET /api/v1/cases/my-cases ---
export interface StudentCaseSummaryDTO {
  id: string;
  institution_id: string;
  student_id: string;
  title: string;
  state: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  selected_intervention_key?: string | null;
  primary_owner_name?: string | null;
  tasks_count: number;
  open_tasks_count: number;
  created_at: string;
  updated_at: string;
}

export interface StudentMyCasesResponse {
  items: StudentCaseSummaryDTO[];
  total: number;
}

// --- 2. General Support Ticket Contract: POST /api/v1/support/tickets ---
export type SupportTicketCategory =
  | 'counseling'
  | 'academic_mentorship'
  | 'attendance_support'
  | 'learning_resources'
  | 'administrative_guidance';

export interface SupportTicketCreateRequest {
  category: SupportTicketCategory;
  subject: string;
  description: string;
  preferred_contact_method?: 'phone' | 'email' | 'in_person' | 'video';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  campus_id?: string;
}

export interface SupportTicketResponse {
  ticket_id: string;
  reference_number: string;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  status: 'submitted' | 'triaged' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  student_id: string;
  created_at: string;
  updated_at: string;
}

// --- 3. Assessment Persistence Contract: POST /api/v1/assessments/submissions ---
export interface AssessmentSubmissionRequest {
  assessment_type: string;
  overall_score: number;
  dimension_scores: Record<string, number>;
  strengths: string[];
  growth_areas: string[];
  recommended_action: string;
  client_completed_at: string;
}

export interface AssessmentRecordDTO {
  id: string;
  student_id: string;
  assessment_type: string;
  overall_score: number;
  dimension_scores: Record<string, number>;
  strengths: string[];
  growth_areas: string[];
  recommended_action: string;
  persisted_at: string;
}

// --- 4. Case Messaging Contract: POST/GET /api/v1/cases/{case_id}/messages ---
export interface CaseMessageDTO {
  id: string;
  case_id: string;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  text: string;
  created_at: string;
  is_staff: boolean;
}

export interface SendCaseMessageRequest {
  text: string;
}

export interface CaseMessagesListResponse {
  case_id: string;
  messages: CaseMessageDTO[];
  total: number;
}

// ============================================================================
// SUTRA Happiness Index Domain Contracts (Phase 9 / Happiness Pulse)
// ============================================================================

export type HappinessDimensionKey =
  | 'emotional_wellbeing'
  | 'belonging_community'
  | 'academic_experience'
  | 'support_trust'
  | 'safety_respect'
  | 'growth_confidence';

export interface HappinessQuestion {
  id: string;
  dimensionKey: HappinessDimensionKey;
  prompt: string;
  order: number;
}

export interface HappinessPulseSubmissionRequest {
  questionnaire_version: string;
  responses: Record<string, number>; // question_id -> Likert rating 1..5
  reflection?: string;
  submitted_at?: string;
}

export interface HappinessPulseSubmissionResponse {
  submission_id: string;
  status: 'accepted';
  period_id: string;
  timestamp: string;
}

export interface HappinessPulseStatusResponse {
  has_completed_current_period: boolean;
  current_period_id: string;
  last_completed_at?: string | null;
}

export interface HappinessDimensionScoreDTO {
  dimension_key: HappinessDimensionKey;
  dimension_name: string;
  score: number | null; // 0-100 normalized score, or null if insufficient
  previous_score: number | null;
  change_points: number | null;
  response_count: number;
  sufficiency_status: 'sufficient' | 'insufficient' | 'suppressed_privacy';
}

export interface HappinessIndexAggregateResponse {
  reporting_period: string;
  calculation_version: string;
  happiness_index: number | null; // 0-100 composite index
  previous_index: number | null;
  change_points: number | null;
  dimension_scores: Record<HappinessDimensionKey, HappinessDimensionScoreDTO>;
  response_count: number;
  eligible_students_count?: number | null;
  participation_rate?: number | null; // 0-100%
  data_sufficiency_status: 'sufficient' | 'insufficient' | 'suppressed_privacy';
  last_refreshed_at: string;
  is_demo_data?: boolean;
}

export interface HappinessTrendPointDTO {
  period_id: string;
  period_label: string;
  happiness_index: number | null;
  response_count: number;
}

export interface HappinessTrendResponse {
  periods: HappinessTrendPointDTO[];
  is_demo_data?: boolean;
}

// ==========================================
// Leaderboard & Rewards Domain Contracts
// ==========================================

export type ActivityCategory =
  | "wellness_pulse"
  | "micro_challenge"
  | "workshop"
  | "student_development"
  | "learning_activity"
  | "campus_improvement";

export interface EligibleActivityDTO {
  key: string;
  title: string;
  description: string;
  category: ActivityCategory;
  points: number;
  frequency_label: string;
  is_completed_in_period?: boolean;
}

export type PointsTransactionStatus = "credited" | "debited" | "pending" | "cancelled";

export interface PointsTransactionDTO {
  id: string;
  student_id: string;
  activity_or_reward_id: string;
  points: number; // positive for credit, negative for debit
  status: PointsTransactionStatus;
  description: string;
  created_at: string;
}

export interface PointsWalletDTO {
  student_id: string;
  available_balance: number;
  total_earned: number;
  total_redeemed: number;
  points_this_week: number;
  points_this_month: number;
  next_reward_title?: string;
  next_reward_cost?: number;
  next_reward_points_needed?: number;
  updated_at: string;
  is_demo_data?: boolean;
}

export type LeaderboardPeriod = "weekly" | "monthly";

export interface LeaderboardEntryDTO {
  rank: number;
  student_id?: string;
  display_name: string;
  avatar?: string;
  points_in_period: number;
  is_current_user?: boolean;
  activities_count?: number;
}

export interface LeaderboardResponseDTO {
  period: LeaderboardPeriod;
  cycle_label: string;
  entries: LeaderboardEntryDTO[];
  current_user_entry?: LeaderboardEntryDTO | null;
  total_participants: number;
  last_updated_at: string;
  is_demo_data?: boolean;
}

export interface StudentPrivateRankDTO {
  student_id: string;
  period: LeaderboardPeriod;
  cycle_label: string;
  current_rank: number;
  period_points: number;
  total_lifetime_points: number;
  previous_rank?: number | null;
  rank_change?: number | null; // e.g. +2 (improved), -1 (dropped), 0 (held)
  next_reward_name: string;
  points_to_next_reward: number;
  next_reward_target_points: number;
  total_participants_in_period?: number;
  as_of: string;
  is_demo_data?: boolean;
}

export type RewardCategory = "digital" | "merchandise" | "experience";

export type RedemptionStatus =
  | "requested"
  | "approved"
  | "ready_for_collection"
  | "collected"
  | "cancelled";

export interface RewardItemDTO {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  category: RewardCategory;
  stock: number;
  is_available: boolean;
  is_digital: boolean;
  image_url?: string;
  eligibility_notes?: string;
}

export interface RedemptionRecordDTO {
  id: string;
  reward_id: string;
  reward_title: string;
  reward_category: RewardCategory;
  points_spent: number;
  is_digital: boolean;
  student_id: string;
  student_display_name?: string;
  status: RedemptionStatus;
  collection_location?: string;
  redeemed_at: string;
  updated_at?: string;
  notes?: string;
}

export interface ClaimActivityRequestDTO {
  activity_key: string;
  metadata?: Record<string, any>;
}

export interface ClaimActivityResponseDTO {
  success: boolean;
  transaction: PointsTransactionDTO;
  new_balance: number;
  message: string;
}

export interface RedeemRewardRequestDTO {
  reward_id: string;
  notes?: string;
}

export interface RedeemRewardResponseDTO {
  success: boolean;
  redemption: RedemptionRecordDTO;
  transaction: PointsTransactionDTO;
  new_balance: number;
  message: string;
}

export interface UpdateRedemptionStatusRequestDTO {
  status: RedemptionStatus;
  notes?: string;
}

