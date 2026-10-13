/**
 * SUTRA Centralized Typed API Client
 * Connects the frontend application to the FastAPI production backend.
 * Fully strictly typed according to OpenAPI 3.1.0 and ADR-001/ADR-004.
 */

import {
  AuthMeResponse,
  CampusResponse,
  StudentSummary,
  SupportViewResponse,
  FinanceViewResponse,
  SignalDTO,
  SignalReviewRequest,
  SignalReviewResponse,
  CaseDetailDTO,
  CaseTransitionRequest,
  CaseAssignmentRequest,
  AcceptAssignmentRequest,
  CreateTaskRequest,
  CaseTaskDTO,
  FollowUpRequest,
  FollowUpDTO,
  OutcomeRequest,
  CaseOutcomeDTO,
  InterventionItem,
  MLModelInfo,
  MLPredictRequest,
  MLPredictResponse,
  HealthResponse,
  ReadinessResponse,
  StudentReadinessResponse,
  AIStructuredReviewBriefResponse,
  AISummarizeEvidenceResponse,
  AISuggestInterventionsResponse,
  AIServiceStatusResponse,
  CounselorProfileDTO,
  CounselorOnboardingRequest,
  AuthorityContactItem,
  EscalationRequest,
  EscalationRecordDTO,
  CounselorCallRequestDTO,
  CreateCallRequestInput,
  DocumentDTO,
  DocumentCreateRequest,
  DocumentFinalizeResponse,
  DocumentAnchorResponse,
  DocumentVerifyResponse,
  DocumentListResponse,
  CBDCVoucherIssueRequest,
  CBDCVoucherRecord,
  CohortAnalyticsSummaryResponse,
  ModelPerformanceResponse,
  CohortRiskTrendResponse,
  StudentRiskTrajectoryResponse,
  HistoricalPerformanceMonitoringResponse,
  SupportedScenarioFeature,
  WhatIfScenarioRequest,
  WhatIfScenarioResponse,
  StudentMyCasesResponse,
  SupportTicketCreateRequest,
  SupportTicketResponse,
  AssessmentSubmissionRequest,
  AssessmentRecordDTO,
  CaseMessageDTO,
  SendCaseMessageRequest,
  CaseMessagesListResponse,
  HappinessPulseSubmissionRequest,
  HappinessPulseSubmissionResponse,
  HappinessPulseStatusResponse,
  HappinessIndexAggregateResponse,
  HappinessTrendResponse,
  PointsWalletDTO,
  PointsTransactionDTO,
  EligibleActivityDTO,
  LeaderboardResponseDTO,
  LeaderboardPeriod,
  StudentPrivateRankDTO,
  RewardItemDTO,
  RedemptionRecordDTO,
  ClaimActivityRequestDTO,
  ClaimActivityResponseDTO,
  RedeemRewardRequestDTO,
  RedeemRewardResponseDTO,
  UpdateRedemptionStatusRequestDTO,
} from './types';
import { StudentIdentityDTO, AvatarConfigDTO } from './avatar-catalog';
import {
  DEMO_SIGNALS,
  DEMO_CASES,
  DEMO_INTERVENTIONS,
  DEMO_ML_MODEL_INFO,
  INITIAL_STUDENTS,
  INITIAL_COUNSELOR_PROFILE,
  INITIAL_AUTHORITY_CONTACTS,
  INITIAL_CALL_REQUESTS,
  INITIAL_ESCALATIONS,
} from './skillhub-data';

export function getApiBaseUrl(): string {
  // 1. Explicit build-time or runtime environment variable (highest priority)
  let envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    envUrl = envUrl.replace(/\/+$/, '');
    if (!envUrl.endsWith('/api/v1')) {
      envUrl = `${envUrl}/api/v1`;
    }
    return envUrl;
  }

  // 2. Client-side runtime override via window or localStorage (useful for debugging without redeploying)
  if (typeof window !== 'undefined') {
    try {
      const runtimeOverride =
        (window as any).__SUTRA_API_URL__ ||
        window.localStorage.getItem('sutra_backend_url');
      if (runtimeOverride && typeof runtimeOverride === 'string' && runtimeOverride.trim()) {
        let override = runtimeOverride.trim().replace(/\/+$/, '');
        if (!override.endsWith('/api/v1')) {
          override = `${override}/api/v1`;
        }
        return override;
      }
    } catch {
      // Ignore localStorage exceptions in restricted contexts
    }

    const host = window.location.hostname;
    // Only connect to port 8000 if actively on localhost / loopback
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://${host}:8000/api/v1`;
    }
  }

  // 3. Fallback for local development or SSR
  return 'http://localhost:8000/api/v1';
}


const API_BASE_URL = getApiBaseUrl();

export function isDemoMode(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (
        urlParams.get('walkthrough') === 'student' ||
        urlParams.get('walkthrough') === 'true' ||
        urlParams.get('demo') === 'true' ||
        urlParams.get('demo') === '1'
      ) {
        return true;
      }
      const localVal = window.localStorage.getItem('sutra_demo_mode');
      if (localVal === 'true' || localVal === '1') {
        return true;
      }
    } catch {
      // Fall through to environment variable check
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env.NEXT_PUBLIC_SUTRA_DEMO_MODE;
    return val === 'true' || val === '1';
  }
  return false;
}

export type ApiErrorKind =
  | 'network_error'
  | 'timeout'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'server_error'
  | 'invalid_format'
  | 'unknown';

export interface ApiValidationErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  public readonly kind: ApiErrorKind;
  public readonly status: number;
  public readonly code?: string;
  public readonly details: ApiValidationErrorDetail[];
  public readonly isOffline: boolean;
  public readonly data?: any;

  constructor(params: {
    message: string;
    kind: ApiErrorKind;
    status: number;
    code?: string;
    details?: ApiValidationErrorDetail[];
    isOffline?: boolean;
    data?: any;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.kind = params.kind;
    this.status = params.status;
    this.code = params.code;
    this.details = params.details || [];
    this.isOffline = Boolean(params.isOffline);
    this.data = params.data;
    if (params.cause) {
      this.cause = params.cause;
    }
  }

  public static isApiError(err: unknown): err is ApiError {
    return (
      err instanceof ApiError ||
      (typeof err === 'object' && err !== null && (err as any).name === 'ApiError')
    );
  }

  public static network(message?: string, cause?: unknown): ApiError {
    return new ApiError({
      message:
        message ||
        'Unable to connect to the backend server. Please verify your network connection or ensure the SUTRA backend is online.',
      kind: 'network_error',
      status: 0,
      code: 'NETWORK_ERROR',
      isOffline: true,
      cause,
    });
  }

  public static timeout(message?: string): ApiError {
    return new ApiError({
      message: message || 'Request timed out waiting for backend server response.',
      kind: 'timeout',
      status: 408,
      code: 'REQUEST_TIMEOUT',
    });
  }

  public static fromResponse(status: number, data: any, url: string): ApiError {
    let kind: ApiErrorKind = 'unknown';
    let code: string | undefined = data?.error?.code || data?.code;
    let message: string | undefined = data?.error?.message || data?.detail || data?.message;
    const details: ApiValidationErrorDetail[] = [];

    if (status === 401) {
      kind = 'authentication';
      code = code || 'AUTHENTICATION_REQUIRED';
      message = message || 'Authentication required. Please sign in to continue.';
    } else if (status === 403) {
      kind = 'authorization';
      code = code || 'PERMISSION_DENIED';
      message = message || 'You do not have permission to perform this action.';
    } else if (status === 404) {
      kind = 'not_found';
      code = code || 'RESOURCE_NOT_FOUND';
      message = message || `Resource not found at ${url}.`;
    } else if (status === 422 || status === 400) {
      kind = 'validation';
      code = code || 'VALIDATION_FAILED';
      message = message || 'Input validation failed. Please review your submission.';
      if (Array.isArray(data?.error?.details)) {
        for (const d of data.error.details) {
          details.push({
            field: d.field,
            message: d.message || String(d),
            code: d.code,
          });
        }
      } else if (Array.isArray(data?.detail)) {
        for (const d of data.detail) {
          details.push({
            field: Array.isArray(d.loc) ? d.loc.join('.') : String(d.loc || ''),
            message: d.msg || 'Invalid field value',
            code: d.type,
          });
        }
      }
    } else if (status >= 500) {
      kind = 'server_error';
      code = code || 'INTERNAL_SERVER_ERROR';
      message = message || 'An unexpected internal server error occurred.';
    }

    if (!message) {
      message = `Request failed with HTTP status ${status}`;
    }

    return new ApiError({
      message,
      kind,
      status,
      code,
      details,
      data,
    });
  }
}

class ApiClient {
  private token: string | null = null;
  private campusId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('sutra_auth_token');
      this.campusId = localStorage.getItem('sutra_active_campus_id');
    }
  }

  public isDemoMode(): boolean {
    return isDemoMode();
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('sutra_auth_token', token);
      else localStorage.removeItem('sutra_auth_token');
    }
  }

  public setCampusId(campusId: string | null) {
    this.campusId = campusId;
    if (typeof window !== 'undefined') {
      if (campusId) localStorage.setItem('sutra_active_campus_id', campusId);
      else localStorage.removeItem('sutra_active_campus_id');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private tokenRefreshHandler: (() => Promise<string | null>) | null = null;

  public setTokenRefreshHandler(handler: () => Promise<string | null>) {
    this.tokenRefreshHandler = handler;
  }

  public getCampusId(): string | null {
    return this.campusId;
  }

  private getOfflineFallback<T>(endpoint: string, options: RequestInit = {}): T | undefined {
    const cleanEndpoint = endpoint.split('?')[0];

    // Probes
    if (cleanEndpoint.endsWith('/health') || cleanEndpoint.endsWith('/ready')) {
      return { status: 'healthy', version: '1.0.0', environment: 'demo-fallback' } as unknown as T;
    }

    // Identity
    if (cleanEndpoint.endsWith('/auth/me')) {
      return {
        id: 'demo-educator-001',
        email: 'faculty@sutra.edu',
        name: 'Prof. Ananya Sharma',
        role: 'faculty',
        memberships: [
          {
            institution_id: 'overclocked-demo',
            institution_name: 'Apex University Main Campus',
            roles: ['faculty'],
          },
        ],
      } as unknown as T;
    }

    // Campuses
    if (cleanEndpoint.endsWith('/campuses')) {
      return [
        {
          id: 'overclocked-demo',
          name: 'Apex University Main Campus',
          code: 'APEX-MAIN',
          status: 'active',
        },
      ] as unknown as T;
    }

    // Interventions
    if (cleanEndpoint.endsWith('/interventions')) {
      return DEMO_INTERVENTIONS as unknown as T;
    }

    // ML info
    if (cleanEndpoint.endsWith('/ml/model-info') || cleanEndpoint.endsWith('/model-info')) {
      return DEMO_ML_MODEL_INFO as unknown as T;
    }

    // Signals
    if (cleanEndpoint.endsWith('/signals')) {
      return DEMO_SIGNALS as unknown as T;
    }

    // Cases
    if (cleanEndpoint.endsWith('/cases')) {
      return DEMO_CASES as unknown as T;
    }

    // Students list
    if (cleanEndpoint.endsWith('/students')) {
      return INITIAL_STUDENTS as unknown as T;
    }

    // Student 360 Support view: /students/:id/support-view
    if (cleanEndpoint.includes('/students/') && cleanEndpoint.endsWith('/support-view')) {
      const parts = cleanEndpoint.split('/');
      const studentId = parts[parts.indexOf('students') + 1] || 'SYN-1007';
      const stu = INITIAL_STUDENTS.find((s) => s.id === studentId) || INITIAL_STUDENTS[0];
      const isAtRisk = stu.status === 'At Risk' || studentId.includes('1007');
      const riskProbability = isAtRisk ? 0.68 : 0.24;
      const classification = isAtRisk ? 'At_Risk' : 'On_Track';

      return {
        student: {
          id: stu.id,
          external_ref: stu.id,
          display_name: stu.name,
          enrollment_status: stu.status.toLowerCase(),
          risk_level: isAtRisk ? 'high' : 'low',
        },
        freshness_metrics: {
          total_observations: 12,
          domains_represented: ['attendance', 'academic', 'lms', 'participation'],
          last_observation_event_at: new Date().toISOString(),
          last_observation_available_at: new Date().toISOString(),
          is_stale: false,
        },
        active_signals_count: isAtRisk ? 1 : 0,
        active_cases_count: isAtRisk ? 1 : 0,
        recent_observations: [
          {
            id: 'OBS-001',
            domain: 'attendance',
            metric_key: 'attendance_rate',
            value: parseFloat(stu.attendance) / 100 || 0.58,
            unit: '%',
            quality_state: 'valid',
            event_at: new Date().toISOString(),
            ingested_at: new Date().toISOString(),
            source_system: 'sis_banner',
          },
          {
            id: 'OBS-002',
            domain: 'academic',
            metric_key: 'missing_assignments_count',
            value: isAtRisk ? 3 : 0,
            unit: 'count',
            quality_state: 'valid',
            event_at: new Date().toISOString(),
            ingested_at: new Date().toISOString(),
            source_system: 'canvas_lms',
          },
        ],
        ml_prediction: {
          external_student_ref: stu.id,
          risk_probability: riskProbability,
          threshold: 0.46,
          classification: classification,
          processed_at: new Date().toISOString(),
          is_synthetic_fallback: true,
          evidence_card: {
            card_type: 'ml_early_warning_evidence',
            model_name: 'logistic_regression_baseline',
            model_version: '1.0.0',
            prediction_cutoff: 'Day 30',
            risk_probability: riskProbability,
            threshold: 0.46,
            classification: classification,
            top_attributions: isAtRisk
              ? [
                  { feature: 'vle_total_clicks_d30', value: 35, attribution: 0.85, direction: 'increases_risk' },
                  { feature: 'vle_active_days_d30', value: 4, attribution: 0.62, direction: 'increases_risk' },
                  { feature: 'assessments_submitted_d30', value: 0, attribution: 0.54, direction: 'increases_risk' },
                  { feature: 'studied_credits', value: 60, attribution: -0.12, direction: 'decreases_risk' },
                ]
              : [
                  { feature: 'vle_total_clicks_d30', value: 240, attribution: -0.92, direction: 'decreases_risk' },
                  { feature: 'vle_active_days_d30', value: 18, attribution: -0.75, direction: 'decreases_risk' },
                  { feature: 'assessments_submitted_d30', value: 2, attribution: -0.58, direction: 'decreases_risk' },
                ],
            limitations: [
              'Trained on historical Open University course registrations; not calibrated for non-modular curricula.',
              'Early assessment grades were excluded to avoid temporal leakage.',
              'Represents statistical correlation, not causal certainty or personal diagnosis.',
            ],
          },
        },
      } as unknown as T;
    }

    // ML Predict single or student predict
    if (cleanEndpoint.includes('/predict')) {
      const parts = cleanEndpoint.split('/');
      const studentId = cleanEndpoint.includes('/students/')
        ? parts[parts.indexOf('students') + 1] || 'SYN-1007'
        : 'SYN-1007';
      const isAtRisk = studentId.includes('1007') || !studentId.includes('1008');
      const riskProbability = isAtRisk ? 0.68 : 0.24;
      const classification = isAtRisk ? 'At_Risk' : 'On_Track';

      return {
        external_student_ref: studentId,
        risk_probability: riskProbability,
        threshold: 0.46,
        classification: classification,
        processed_at: new Date().toISOString(),
        is_synthetic_fallback: true,
        evidence_card: {
          card_type: 'ml_early_warning_evidence',
          model_name: 'logistic_regression_baseline',
          model_version: '1.0.0',
          prediction_cutoff: 'Day 30',
          risk_probability: riskProbability,
          threshold: 0.46,
          classification: classification,
          top_attributions: isAtRisk
            ? [
                { feature: 'vle_total_clicks_d30', value: 35, attribution: 0.85, direction: 'increases_risk' },
                { feature: 'vle_active_days_d30', value: 4, attribution: 0.62, direction: 'increases_risk' },
                { feature: 'assessments_submitted_d30', value: 0, attribution: 0.54, direction: 'increases_risk' },
                { feature: 'studied_credits', value: 60, attribution: -0.12, direction: 'decreases_risk' },
              ]
            : [
                { feature: 'vle_total_clicks_d30', value: 240, attribution: -0.92, direction: 'decreases_risk' },
                { feature: 'vle_active_days_d30', value: 18, attribution: -0.75, direction: 'decreases_risk' },
                { feature: 'assessments_submitted_d30', value: 2, attribution: -0.58, direction: 'decreases_risk' },
              ],
          limitations: [
            'Trained on historical Open University course registrations; not calibrated for non-modular curricula.',
            'Early assessment grades were excluded to avoid temporal leakage.',
            'Represents statistical correlation, not causal certainty or personal diagnosis.',
          ],
        },
      } as unknown as T;
    }

    // Student 360 Finance view: /students/:id/finance-view
    if (cleanEndpoint.includes('/students/') && cleanEndpoint.endsWith('/finance-view')) {
      const parts = cleanEndpoint.split('/');
      const studentId = parts[parts.indexOf('students') + 1] || 'SYN-1007';
      return {
        student_id: studentId,
        balance_due: 0,
        payment_status: 'current',
        aid_awarded: true,
        fee_hold: false,
      } as unknown as T;
    }

    // Student 360 Feature Readiness: /students/:id/readiness
    if (cleanEndpoint.includes('/students/') && cleanEndpoint.endsWith('/readiness')) {
      const parts = cleanEndpoint.split('/');
      const studentId = parts[parts.indexOf('students') + 1] || 'SYN-1007';
      const stu = INITIAL_STUDENTS.find((s) => s.id === studentId) || INITIAL_STUDENTS[0];
      const isComplete = studentId.includes('1007');

      return {
        student: {
          id: stu.id,
          external_ref: stu.id,
          display_name: stu.name,
          enrollment_status: stu.status.toLowerCase(),
          risk_level: isComplete ? 'high' : 'low',
        },
        model_name: 'Logistic Regression Baseline',
        model_version: '1.0.0',
        target_cutoff: 'Day 30',
        is_ready_for_inference: isComplete,
        applicability_status: isComplete ? 'ready' : 'incomplete_telemetry',
        applicability_rationale: isComplete
          ? 'All 25 canonical Day-30 features verified and available.'
          : 'Missing required VLE clickstream features. Live inference blocked (HTTP 422).',
        features_total_required: 25,
        features_available_count: isComplete ? 25 : 6,
        features_missing_count: isComplete ? 0 : 12,
        features_underivable_count: isComplete ? 0 : 7,
        features_stale_count: 0,
        features: [
          { feature_name: 'vle_total_clicks_d30', category: 'vle_engagement', status: isComplete ? 'available' : 'underivable_from_source', observed_value: isComplete ? 142 : null, source_domain: 'participation', derivation_note: 'Cumulative LMS clicks by Day 30' },
          { feature_name: 'vle_active_days_d30', category: 'vle_engagement', status: isComplete ? 'available' : 'underivable_from_source', observed_value: isComplete ? 8 : null, source_domain: 'participation', derivation_note: 'Active learning platform days' },
          { feature_name: 'vle_clicks_last_7d', category: 'vle_engagement', status: isComplete ? 'available' : 'underivable_from_source', observed_value: isComplete ? 12 : null, source_domain: 'participation', derivation_note: 'Recent LMS interaction velocity' },
          { feature_name: 'vle_days_since_last_click', category: 'vle_engagement', status: isComplete ? 'available' : 'underivable_from_source', observed_value: isComplete ? 6 : null, source_domain: 'participation', derivation_note: 'Days since last LMS login' },
          { feature_name: 'assessments_submitted_d30', category: 'assessment_timing', status: 'available', observed_value: 1, source_domain: 'academic', derivation_note: 'Formative assessments completed' },
          { feature_name: 'num_of_prev_attempts', category: 'academic', status: 'available', observed_value: 0, source_domain: 'academic', derivation_note: 'Previous module attempt count' },
          { feature_name: 'studied_credits', category: 'academic', status: 'available', observed_value: 60, source_domain: 'academic', derivation_note: 'Registered credit load' },
        ],
        telemetry_audit: {
          total_observations: isComplete ? 25 : 6,
          domains_present: ['academic', 'participation', 'demographic'],
          quality_state_counts: { valid: isComplete ? 25 : 6 },
          last_event_at: new Date().toISOString(),
          last_available_at: new Date().toISOString(),
          is_stale: false,
          unsupported_sources: [],
        },
        governance_disclaimer: 'Feature readiness checks audit input data completeness. Missing values are never silently filled with zeros.',
      } as unknown as T;
    }

    // --- Cohort Risk Analytics (Phase 5) ---
    if (cleanEndpoint.includes('/analytics/cohort-summary')) {
      return {
        campus_id: this.campusId || '00000000-0000-0000-0000-000000000000',
        as_of_at: new Date().toISOString(),
        timeframe: 'this_month',
        cohort_filter: null,
        total_students_in_scope: INITIAL_STUDENTS.length,
        evaluated_students_count: Math.min(INITIAL_STUDENTS.length, 6),
        total_prediction_runs: 8,
        coverage_percentage: 75.0,
        risk_distribution: {
          at_risk_count: 2,
          at_risk_percentage: 33.3,
          on_track_count: 4,
          on_track_percentage: 66.7,
          unevaluated_count: Math.max(0, INITIAL_STUDENTS.length - 6),
          threshold: 0.46,
          granular_tiers: {
            low_risk: 3,
            moderate_risk: 1,
            elevated_risk: 2,
          },
          is_privacy_suppressed: false,
          suppression_reason: null,
        },
        cohort_breakdown: [
          {
            cohort_code: 'CS-2026',
            total_students: 5,
            evaluated_count: 4,
            at_risk_count: 1,
            at_risk_percentage: 25.0,
            on_track_count: 3,
            on_track_percentage: 75.0,
            is_privacy_suppressed: false,
            suppression_reason: null,
          },
          {
            cohort_code: 'ENG-2026',
            total_students: 3,
            evaluated_count: 2,
            at_risk_count: 1,
            at_risk_percentage: 50.0,
            on_track_count: 1,
            on_track_percentage: 50.0,
            is_privacy_suppressed: false,
            suppression_reason: null,
          },
        ],
        trend_timeline: [
          { date_key: '2026-10-06', label: 'Oct 06', prediction_runs: 2, signals_detected: 1, cases_opened: 1, confirmed_outcomes: 0 },
          { date_key: '2026-10-07', label: 'Oct 07', prediction_runs: 1, signals_detected: 0, cases_opened: 0, confirmed_outcomes: 0 },
          { date_key: '2026-10-08', label: 'Oct 08', prediction_runs: 3, signals_detected: 2, cases_opened: 1, confirmed_outcomes: 1 },
          { date_key: '2026-10-09', label: 'Oct 09', prediction_runs: 0, signals_detected: 1, cases_opened: 0, confirmed_outcomes: 0 },
          { date_key: '2026-10-10', label: 'Oct 10', prediction_runs: 1, signals_detected: 0, cases_opened: 1, confirmed_outcomes: 0 },
          { date_key: '2026-10-11', label: 'Oct 11', prediction_runs: 1, signals_detected: 1, cases_opened: 0, confirmed_outcomes: 1 },
          { date_key: '2026-10-12', label: 'Oct 12', prediction_runs: 0, signals_detected: 0, cases_opened: 0, confirmed_outcomes: 0 },
        ],
        case_lifecycle_distribution: [
          { state: 'NEW', count: 1, is_terminal: false },
          { state: 'TRIAGED', count: 1, is_terminal: false },
          { state: 'UNDER_REVIEW', count: 0, is_terminal: false },
          { state: 'ACTIONABLE', count: 0, is_terminal: false },
          { state: 'ASSIGNED', count: 1, is_terminal: false },
          { state: 'ACCEPTED', count: 0, is_terminal: false },
          { state: 'IN_PROGRESS', count: 1, is_terminal: false },
          { state: 'FOLLOW_UP_REQUIRED', count: 0, is_terminal: false },
          { state: 'RESOLVED', count: 1, is_terminal: true },
          { state: 'CLOSED', count: 0, is_terminal: true },
        ],
        intervention_distribution: [
          { key: 'academic_tutoring_offer', label: 'Subject Tutoring Referral', count: 2, percentage: 50.0 },
          { key: 'mentor_check_in', label: 'Faculty Mentorship 1-on-1', count: 1, percentage: 25.0 },
          { key: 'counselling_referral', label: 'Student Wellbeing Referral', count: 1, percentage: 25.0 },
          { key: 'fee_emergency_counselling', label: 'Financial Aid Consultation', count: 0, percentage: 0.0 },
        ],
        governance_disclaimers: [
          'Case counts reflect educator triage volume, not model precision.',
          'Intervention counts reflect assigned student support protocols, not verified treatment causality.',
          'Small-group privacy safeguards (ADR-004) automatically mask cells with fewer than 5 students in leadership views.',
        ],
      } as unknown as T;
    }

    // --- Model Performance Dashboard (Phase 6) ---
    if (cleanEndpoint.includes('/ml/performance') || cleanEndpoint.includes('/analytics/model-performance')) {
      return {
        model_name: 'Regularized Logistic Regression Baseline',
        model_version: 'v1.0.0',
        operational_threshold: 0.46,
        evaluation_environment: 'offline_held_out_benchmark',
        dataset_provenance: {
          dataset_label: 'OULAD Day-30 Processed Dataset',
          partition: 'Presentation 2014J (Temporal Holdout)',
          evaluation_date: '2026-10-12',
          sample_size: 9203,
          unique_students: 8857,
          raw_rows_examined: 27466,
          outcome_definition: 'Binary early withdrawal or academic failure (target=1 for At-Risk, 0 for On-Track)',
          class_prevalence: 0.407,
          actual_at_risk_count: 3746,
          actual_on_track_count: 5457,
          provenance_type: 'offline_held_out_benchmark',
          provenance_warning:
            'HISTORICAL PARTITION NOTICE: Presentation 2014J represents previously inspected development evidence. It must NEVER be reported as an untouched prospective test set. Real-world generalization must be assessed on authentic, prospectively collected cohorts.',
        },
        threshold_independent_metrics: {
          roc_auc: 0.7216,
          pr_auc: 0.6502,
          brier_score: 0.2103,
          expected_calibration_error_ece: 0.0681,
          maximum_calibration_error_mce: 0.0967,
        },
        threshold_dependent_metrics: {
          threshold: 0.46,
          accuracy: 0.6498,
          balanced_accuracy: 0.6573,
          precision: 0.5556,
          recall: 0.6978,
          specificity: 0.6168,
          false_positive_rate: 0.3832,
          f1_score: 0.6186,
          confusion_matrix: {
            tp: 2614,
            fp: 2091,
            tn: 3366,
            fn: 1132,
          },
          operational_workload: {
            total_alerts_fired: 4705,
            alert_rate_pct: 51.12,
            false_alarms_advisor_burden: 2091,
            missed_at_risk_students: 1132,
            successful_proactive_catches: 2614,
          },
        },
        reliability_table: [
          { bin_range: '[0.0, 0.1)', samples_count: 116, mean_predicted_prob: 0.0718, observed_positive_rate: 0.1466, calibration_gap: 0.0747 },
          { bin_range: '[0.1, 0.2)', samples_count: 563, mean_predicted_prob: 0.1567, observed_positive_rate: 0.1368, calibration_gap: 0.0199 },
          { bin_range: '[0.2, 0.3)', samples_count: 1153, mean_predicted_prob: 0.2551, observed_positive_rate: 0.1977, calibration_gap: 0.0574 },
          { bin_range: '[0.3, 0.4)', samples_count: 1587, mean_predicted_prob: 0.3509, observed_positive_rate: 0.2716, calibration_gap: 0.0793 },
          { bin_range: '[0.4, 0.5)', samples_count: 1770, mean_predicted_prob: 0.4493, observed_positive_rate: 0.3525, calibration_gap: 0.0967 },
          { bin_range: '[0.5, 0.6)', samples_count: 1607, mean_predicted_prob: 0.5489, observed_positive_rate: 0.4748, calibration_gap: 0.0741 },
          { bin_range: '[0.6, 0.7)', samples_count: 1205, mean_predicted_prob: 0.6462, observed_positive_rate: 0.5793, calibration_gap: 0.067 },
          { bin_range: '[0.7, 0.8)', samples_count: 732, mean_predicted_prob: 0.7449, observed_positive_rate: 0.694, calibration_gap: 0.051 },
          { bin_range: '[0.8, 0.9)', samples_count: 368, mean_predicted_prob: 0.8453, observed_positive_rate: 0.8288, calibration_gap: 0.0165 },
          { bin_range: '[0.9, 1.0)', samples_count: 102, mean_predicted_prob: 0.9261, observed_positive_rate: 0.9314, calibration_gap: 0.0053 },
        ],
        roc_curve_points: [
          { fpr: 0.0, tpr: 0.0, threshold: 1.0 },
          { fpr: 0.05, tpr: 0.23, threshold: 0.73 },
          { fpr: 0.1, tpr: 0.35, threshold: 0.65 },
          { fpr: 0.2, tpr: 0.52, threshold: 0.56 },
          { fpr: 0.3, tpr: 0.63, threshold: 0.5 },
          { fpr: 0.3832, tpr: 0.6978, threshold: 0.46 },
          { fpr: 0.5, tpr: 0.78, threshold: 0.39 },
          { fpr: 0.7, tpr: 0.89, threshold: 0.28 },
          { fpr: 1.0, tpr: 1.0, threshold: 0.0 },
        ],
        pr_curve_points: [
          { precision: 0.407, recall: 1.0, threshold: 0.0 },
          { precision: 0.48, recall: 0.88, threshold: 0.32 },
          { precision: 0.5556, recall: 0.6978, threshold: 0.46 },
          { precision: 0.62, recall: 0.55, threshold: 0.55 },
          { precision: 0.74, recall: 0.28, threshold: 0.7 },
        ],
        subgroup_metrics: [
          { dimension: 'gender', subgroup: 'F', sample_size: 3872, confidence_flag: 'STABLE', positives_count: 1488, negatives_count: 2384, prevalence: 0.3843, true_positives: 927, false_positives: 830, true_negatives: 1554, false_negatives: 561, recall: 0.623, precision: 0.5276, specificity: 0.6518, false_positive_rate: 0.3482, f1_score: 0.5713, roc_auc: 0.6898, pr_auc: 0.5902 },
          { dimension: 'gender', subgroup: 'M', sample_size: 5331, confidence_flag: 'STABLE', positives_count: 2258, negatives_count: 3073, prevalence: 0.4236, true_positives: 1687, false_positives: 1261, true_negatives: 1812, false_negatives: 571, recall: 0.7471, precision: 0.5723, specificity: 0.5897, false_positive_rate: 0.4103, f1_score: 0.6481, roc_auc: 0.7428, pr_auc: 0.6873 },
          { dimension: 'age_band', subgroup: '0-35', sample_size: 6305, confidence_flag: 'STABLE', positives_count: 2658, negatives_count: 3647, prevalence: 0.4216, true_positives: 1996, false_positives: 1632, true_negatives: 2015, false_negatives: 662, recall: 0.7509, precision: 0.5502, specificity: 0.5525, false_positive_rate: 0.4475, f1_score: 0.6351, roc_auc: 0.7235, pr_auc: 0.6664 },
          { dimension: 'age_band', subgroup: '35-55', sample_size: 2811, confidence_flag: 'STABLE', positives_count: 1057, negatives_count: 1754, prevalence: 0.376, true_positives: 605, false_positives: 457, true_negatives: 1297, false_negatives: 452, recall: 0.5724, precision: 0.5697, specificity: 0.7395, false_positive_rate: 0.2605, f1_score: 0.571, roc_auc: 0.7182, pr_auc: 0.6124 },
          { dimension: 'age_band', subgroup: '55<=', sample_size: 87, confidence_flag: 'LOW_CONFIDENCE (<100)', positives_count: 31, negatives_count: 56, prevalence: 0.3563, true_positives: 13, false_positives: 2, true_negatives: 54, false_negatives: 18, recall: 0.4194, precision: 0.8667, specificity: 0.9643, false_positive_rate: 0.0357, f1_score: 0.5652, roc_auc: 0.7465, pr_auc: 0.6982 },
        ],
        live_telemetry: {
          total_inferences_logged: 48,
          average_latency_ms: 3.4,
          active_campus_count: 1,
          monitoring_window: 'Last 30 Days',
          status: 'healthy',
          telemetry_notice:
            'Live telemetry monitors real-time system throughput and execution latency. It does not represent measured model accuracy until student outcomes are confirmed.',
        },
        fairness_disclaimer:
          'FAIRNESS & PARITY NOTICE: Disaggregated subgroup metrics highlight performance differences across courses, demographics, and prior education. The presence of this dashboard does NOT demonstrate that the model is fair, unbiased, or suitable for automated high-stakes decisions. Differences in recall and false alarm burden reflect historical institutional patterns.',
        non_causal_disclaimer:
          'NON-CAUSAL GOVERNANCE NOTICE: Statistical risk estimates reflect retrospective correlations in historical data. Predictions must never be treated as diagnostic certainties or proof of future student failure. All alerts require human professional judgement.',
        limitations: [
          'Evaluated on historical Open University course registrations (Presentation 2014J); generalization to prospective cohorts remains unverified.',
          'Cutoff fixed at Day 30 post-start; early assessment marks are excluded to prevent temporal data leakage.',
          'ROC curves require genuine per-record scores and labels; they are not fabricated from aggregate single-point values.',
          'Cell counts under 5 are suppressed to protect student privacy in disaggregated views.',
        ],
      } as unknown as T;
    }

    // --- Historical Risk Trends (Phase 7) ---
    if (cleanEndpoint.includes('/analytics/risk-trends')) {
      return {
        campus_id: '11111111-2222-3333-4444-555555555555',
        cohort_code: null,
        reference_model_version: 'v1.0.0',
        reference_cutoff: 'Day 30',
        total_historical_runs: 16,
        total_unique_students: 8,
        rescore_frequency: 2.0,
        has_comparable_history: true,
        incompatible_snapshots_detected: 0,
        data_gap_notice: null,
        causality_disclaimer:
          'Changes in cohort-level predicted risk distribution over time indicate shifts in model scoring and input behavioral features, NOT verified proof that actual student academic outcomes have changed. Realized student outcomes require post-semester registrar confirmation.',
        retention_applied_days: 365,
        snapshots: [
          {
            snapshot_id: '2026-10-01',
            snapshot_timestamp: '2026-10-01T08:00:00Z',
            model_version: 'v1.0.0',
            model_name: 'Regularized Logistic Regression Baseline',
            prediction_cutoff: 'Day 30',
            feature_schema_version: 'v1_25features',
            total_prediction_runs: 8,
            unique_students_evaluated: 8,
            repeated_rescores_count: 0,
            at_risk_count: 4,
            at_risk_percentage: 50.0,
            on_track_count: 4,
            on_track_percentage: 50.0,
            low_risk_count: 2,
            moderate_risk_count: 2,
            elevated_risk_count: 4,
            mean_risk_probability: 0.448,
            is_privacy_suppressed: false,
            suppression_reason: null,
            is_comparable: true,
            incompatibility_reason: null,
          },
          {
            snapshot_id: '2026-10-08',
            snapshot_timestamp: '2026-10-08T08:00:00Z',
            model_version: 'v1.0.0',
            model_name: 'Regularized Logistic Regression Baseline',
            prediction_cutoff: 'Day 30',
            feature_schema_version: 'v1_25features',
            total_prediction_runs: 8,
            unique_students_evaluated: 8,
            repeated_rescores_count: 0,
            at_risk_count: 3,
            at_risk_percentage: 37.5,
            on_track_count: 5,
            on_track_percentage: 62.5,
            low_risk_count: 3,
            moderate_risk_count: 2,
            elevated_risk_count: 3,
            mean_risk_probability: 0.412,
            is_privacy_suppressed: false,
            suppression_reason: null,
            is_comparable: true,
            incompatibility_reason: null,
          },
        ],
        governance_disclaimers: [
          'Changes in cohort predicted risk distribution over time indicate shifts in model scoring and input behavioral features, NOT verified proof that actual student academic outcomes have changed.',
          'Scores across incompatible model versions or distinct cutoff windows cannot be compared on a single continuous baseline.',
          'Small-group privacy safeguards (ADR-004) automatically mask cells with fewer than 5 students in leadership views.',
        ],
      } as unknown as T;
    }

    // --- Student Risk Trajectory (Phase 7) ---
    if (cleanEndpoint.includes('/analytics/student-risk-trajectory/')) {
      const parts = cleanEndpoint.split('/');
      const ref = parts[parts.length - 1].split('?')[0];
      return {
        campus_id: '11111111-2222-3333-4444-555555555555',
        external_student_ref: ref,
        total_evaluations: 3,
        unique_timestamps_count: 3,
        is_stale: false,
        causality_notice:
          'Individual risk score trajectory reflects updated academic and engagement observations over time. A decrease in score does not guarantee course completion; an increase does not ensure academic difficulty.',
        trajectory: [
          {
            prediction_id: 'p-1',
            timestamp: '2026-09-20T10:00:00Z',
            model_version: 'v1.0.0',
            model_name: 'Regularized Logistic Regression Baseline',
            prediction_cutoff: 'Day 30',
            risk_probability: 0.62,
            threshold: 0.46,
            classification: 'At_Risk',
            score_delta_from_previous: null,
            is_comparable_to_previous: true,
            incompatibility_note: null,
          },
          {
            prediction_id: 'p-2',
            timestamp: '2026-09-28T10:00:00Z',
            model_version: 'v1.0.0',
            model_name: 'Regularized Logistic Regression Baseline',
            prediction_cutoff: 'Day 30',
            risk_probability: 0.54,
            threshold: 0.46,
            classification: 'At_Risk',
            score_delta_from_previous: -0.08,
            is_comparable_to_previous: true,
            incompatibility_note: null,
          },
          {
            prediction_id: 'p-3',
            timestamp: '2026-10-06T10:00:00Z',
            model_version: 'v1.0.0',
            model_name: 'Regularized Logistic Regression Baseline',
            prediction_cutoff: 'Day 30',
            risk_probability: 0.44,
            threshold: 0.46,
            classification: 'On_Track',
            score_delta_from_previous: -0.10,
            is_comparable_to_previous: true,
            incompatibility_note: null,
          },
        ],
      } as unknown as T;
    }

    // --- Performance Monitoring (Phase 7) ---
    if (cleanEndpoint.includes('/analytics/performance-monitoring')) {
      return {
        campus_id: '11111111-2222-3333-4444-555555555555',
        monitoring_status: 'active_historical_evaluations_with_live_term_pending',
        outcome_definition: 'Binary course withdrawal or final academic failure prior to completion',
        total_labeled_cohorts: 4,
        evaluations: [
          {
            cohort_label: 'OULAD Research Holdout 2013B',
            model_version: 'v1.0.0',
            evaluation_date: '2026-01-15T00:00:00Z',
            labeled_sample_size: 4281,
            ground_truth_status: 'AVAILABLE_HISTORICAL',
            realized_accuracy: 0.651,
            realized_recall: 0.7112,
            realized_precision: 0.5941,
            realized_fpr: 0.4021,
            realized_roc_auc: 0.7251,
            realized_brier: 0.2098,
            drift_status: 'STABLE',
            drift_warning: null,
          },
          {
            cohort_label: 'OULAD Research Holdout 2013J',
            model_version: 'v1.0.0',
            evaluation_date: '2026-04-15T00:00:00Z',
            labeled_sample_size: 7458,
            ground_truth_status: 'AVAILABLE_HISTORICAL',
            realized_accuracy: 0.648,
            realized_recall: 0.7185,
            realized_precision: 0.6012,
            realized_fpr: 0.4089,
            realized_roc_auc: 0.721,
            realized_brier: 0.2115,
            drift_status: 'STABLE',
            drift_warning: null,
          },
          {
            cohort_label: 'OULAD Research Holdout 2014B',
            model_version: 'v1.0.0',
            evaluation_date: '2026-07-15T00:00:00Z',
            labeled_sample_size: 6524,
            ground_truth_status: 'AVAILABLE_HISTORICAL',
            realized_accuracy: 0.653,
            realized_recall: 0.716,
            realized_precision: 0.5988,
            realized_fpr: 0.4005,
            realized_roc_auc: 0.7242,
            realized_brier: 0.2089,
            drift_status: 'STABLE',
            drift_warning: null,
          },
          {
            cohort_label: 'OULAD Research Holdout 2014J (Validation Benchmark)',
            model_version: 'v1.0.0',
            evaluation_date: '2026-10-12T00:00:00Z',
            labeled_sample_size: 9203,
            ground_truth_status: 'AVAILABLE_HISTORICAL',
            realized_accuracy: 0.6498,
            realized_recall: 0.6978,
            realized_precision: 0.5556,
            realized_fpr: 0.3832,
            realized_roc_auc: 0.7216,
            realized_brier: 0.2103,
            drift_status: 'STABLE',
            drift_warning: null,
          },
          {
            cohort_label: 'Active Campus Cohort (Current Term)',
            model_version: 'v1.0.0',
            evaluation_date: new Date().toISOString(),
            labeled_sample_size: 0,
            ground_truth_status: 'PENDING_TERM_COMPLETION',
            realized_accuracy: null,
            realized_recall: null,
            realized_precision: null,
            realized_fpr: null,
            realized_roc_auc: null,
            realized_brier: null,
            drift_status: 'LABELS_PENDING',
            drift_warning:
              'Official student outcome labels are pending term completion at Day 120. Live score distribution is actively monitored; model discrimination metrics will be calculated post-term certification.',
          },
        ],
        evaluation_protocol_notice:
          'Evaluated in accordance with SUTRA Longitudinal Evaluation Protocol Setting 2 (Temporal Generalization).',
        governance_disclaimers: [
          'Model performance monitoring requires verified, registrar-certified outcome labels; metrics cannot be evaluated prospectively mid-term.',
          'Observed historical discrimination (ROC-AUC 0.7210 - 0.7251) demonstrates empirical stability across temporal presentations.',
          'Prediction drift monitoring operates continuously; ground-truth evaluation occurs upon semester outcome finalisation.',
        ],
      } as unknown as T;
    }

    // --- Governed What-If Scenarios (Phase 8) ---
    if (cleanEndpoint.includes('/supported-scenario-features')) {
      return [
        {
          feature_name: 'vle_active_days_d30',
          min_value: 0,
          max_value: 30,
          feature_type: 'int',
          label: 'VLE Active Days (Day 0–30)',
          unit: 'days',
          default_value: 8,
          description: 'Number of distinct calendar days the student accessed the virtual learning environment within the first 30 days.',
        },
        {
          feature_name: 'vle_total_clicks_d30',
          min_value: 0,
          max_value: 5000,
          feature_type: 'float',
          label: 'Total VLE Interactions (Day 0–30)',
          unit: 'clicks',
          default_value: 142,
          description: 'Cumulative count of interactions across all online course components by Day 30.',
        },
        {
          feature_name: 'vle_clicks_last_7d',
          min_value: 0,
          max_value: 2000,
          feature_type: 'float',
          label: 'Recent Activity (Days 24–30)',
          unit: 'clicks',
          default_value: 12,
          description: 'Interaction count within the final 7 days leading to the Day 30 evaluation boundary.',
        },
        {
          feature_name: 'vle_days_since_last_click',
          min_value: 0,
          max_value: 30,
          feature_type: 'float',
          label: 'Days Since Last Interaction',
          unit: 'days',
          default_value: 6,
          description: "Elapsed days between the student's most recent interaction and Day 30.",
        },
        {
          feature_name: 'assessments_submitted_d30',
          min_value: 0,
          max_value: 10,
          feature_type: 'int',
          label: 'Assessments Submitted by Day 30',
          unit: 'submissions',
          default_value: 1,
          description: 'Number of course assessment items submitted prior to Day 30.',
        },
        {
          feature_name: 'has_early_assessment_submission_d30',
          min_value: 0,
          max_value: 1,
          feature_type: 'int',
          label: 'Early Assessment Submission',
          unit: 'binary',
          default_value: 1,
          description: 'Binary indicator of whether an early diagnostic assessment was submitted by Day 30.',
        },
      ] as unknown as T;
    }

    if (cleanEndpoint.includes('/simulate-scenario')) {
      return {
        scenario_id: 'mock-scenario-uuid-1234',
        student_ref: 'STUDENT-SIMULATED-DEMO',
        model_name: 'Regularized Logistic Regression Baseline',
        model_version: 'v1.0.0',
        prediction_cutoff: 'Day 30',
        threshold: 0.46,
        baseline_risk_probability: 0.54,
        baseline_classification: 'At_Risk',
        baseline_top_attributions: [
          { feature: 'vle_days_since_last_click', value: 16, attribution: 0.467, direction: 'increases_risk' },
          { feature: 'assessments_submitted_d30', value: 0, attribution: 0.19, direction: 'increases_risk' },
        ],
        hypothetical_risk_probability: 0.38,
        hypothetical_classification: 'On_Track',
        hypothetical_top_attributions: [
          { feature: 'vle_active_days_d30', value: 18, attribution: -0.40, direction: 'decreases_risk' },
          { feature: 'vle_days_since_last_click', value: 1, attribution: -0.23, direction: 'decreases_risk' },
        ],
        delta_probability: -0.16,
        delta_percentage_points: -16.0,
        tier_transition: 'CROSSES_BELOW_THRESHOLD_TO_ON_TRACK',
        modified_features: [
          { feature: 'vle_active_days_d30', label: 'VLE Active Days', original_value: 3, hypothetical_value: 18, unit: 'days', delta: 15 },
          { feature: 'vle_days_since_last_click', label: 'Days Since Last Interaction', original_value: 16, hypothetical_value: 1, unit: 'days', delta: -15 },
        ],
        is_hypothetical: true,
        is_official_record: false,
        ephemeral_notice: "EPHEMERAL SIMULATION: This calculation was evaluated strictly in memory. Hypothetical inputs are NEVER written to the student's official academic record, telemetry database, or ml_inference_logs. No automated cases, signals, or disciplinary actions have been triggered.",
        non_causal_disclaimer: 'NON-CAUSAL MODEL CALCULATION NOTICE: The hypothetical score is a mathematical evaluation of the frozen Day-30 logistic regression model. It is NOT a causal estimate of intervention effectiveness. Statistical correlation does not equal intervention causality.',
        temporal_cutoff_notice: 'DAY-30 TEMPORAL INTEGRITY NOTICE: Hypothetical adjustments reflect only plausible behavioral variation within the Day 0–30 window. Unobserved future events (e.g., attending future tutoring or post-cutoff scores) are strictly prohibited from entering this calculation.',
        support_planning_guidance: {
          title: 'Explanatory Non-Predictive Support Planning Guidance',
          why_model_cannot_estimate_causal_interventions: 'The production early-warning model (LogisticRegressionBaseline v1.0.0) is a correlational classifier trained on historical observational registration data at Day 30. It evaluates observational correlations between early engagement telemetry and completion. It does NOT estimate the causal treatment effect of educator interventions.',
          recommended_educator_actions: [
            'Conduct a personalized, empathetic check-in with the student regarding study routines and obstacles.',
            'Offer optional peer tutoring, academic mentoring, or writing lab support without attributing false statistical guarantees.',
            'Verify whether non-engagement reflects illness, technical access hurdles, or family commitments.',
            'Coordinate with course instructors on clarifying difficult early assessment assignments.',
            'Document support plans qualitatively in Case Management rather than altering official ML logs.',
          ],
          causal_claim_warning: 'PROHIBITION ON CAUSAL CLAIMS: Do not claim or document to students that attending tutoring or reaching a specific click threshold will reduce course failure risk by a specific percentage. Such claims are scientifically unsupported by the correlational model.',
        },
      } as unknown as T;
    }

    // AI endpoints
    if (cleanEndpoint.endsWith('/ai/status')) {
      return { status: 'operational', provider: 'local_synthesizer', model_ready: true } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/ai/review-brief')) {
      return {
        target_student_ref: 'SYN-1007',
        signal_id: 'SIG-SYN-1007',
        summary: 'Attendance dropped to 58% and 3 assignments are missing. Student would benefit from immediate 1-on-1 check-in or subject tutoring.',
        observed_facts: [
          'Class attendance currently at 58% (expected: 70%+).',
          '3 unsubmitted assignments over the last 3 weeks.',
          'Learning portal logged 8 active days in the last month.',
        ],
        model_predictions: [
          'Calculated risk score: 0.68 (threshold: 0.46).',
        ],
        uncertainties: [
          'Recent lab quiz scores are not yet graded.',
          'No illness or transit delay notes currently reported.',
        ],
        review_questions: [
          'Has the student experienced scheduling, transit, or personal difficulties?',
          'Would extra tutoring help catch up on the missing coursework?',
        ],
        candidate_interventions: [
          {
            intervention_key: 'academic_tutoring_offer',
            display_label: 'Subject Tutoring Referral',
            domain: 'academic',
            recipient_role: 'faculty',
            confidence: 0.88,
            evidence_grounding: 'Addresses specific missed lab work and assignments.',
            caveats: 'Requires student confirmation of schedule.',
          },
          {
            intervention_key: 'mentor_check_in',
            display_label: 'Academic Mentor Check-In',
            domain: 'mentor',
            recipient_role: 'faculty',
            confidence: 0.82,
            evidence_grounding: 'Explores scheduling or personal hurdles causing attendance drops.',
            caveats: 'Confidential 1-on-1 discussion.',
          },
        ],
        limitations: [
          'Financial and medical records are kept strictly private per university policy.',
        ],
        metadata: {
          model_name: 'sutra-assistant-v1',
          provider: 'local_summary',
          latency_ms: 25,
          is_mock: true,
          timestamp: new Date().toISOString(),
        },
      } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/ai/summarize-evidence')) {
      return {
        student_id: 'SYN-1007',
        summary: 'Attendance dropped to 58% and 3 assignments are missing. Student would benefit from immediate 1-on-1 check-in or subject tutoring.',
        confidence: 0.85,
        risk_level: 'moderate',
        recommended_actions: ['Schedule 1-on-1 advisor check-in', 'Offer subject tutoring'],
      } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/ai/suggest-interventions')) {
      return {
        suggestions: DEMO_INTERVENTIONS.slice(0, 3),
      } as unknown as T;
    }

    // --- Counselor Subsystem Offline Fallbacks ---
    if (cleanEndpoint.endsWith('/counselors/profile')) {
      return INITIAL_COUNSELOR_PROFILE as unknown as T;
    }

    if (cleanEndpoint.endsWith('/counselors/authority-contacts')) {
      return INITIAL_AUTHORITY_CONTACTS as unknown as T;
    }

    if (cleanEndpoint.endsWith('/counselors/escalations')) {
      return INITIAL_ESCALATIONS as unknown as T;
    }

    if (cleanEndpoint.endsWith('/counselors/call-requests') && (!options.method || options.method.toUpperCase() === 'GET')) {
      return INITIAL_CALL_REQUESTS as unknown as T;
    }

    if (cleanEndpoint.endsWith('/counselors/onboarding') && options.method?.toUpperCase() === 'POST') {
      let bodyData: any = {};
      try {
        if (typeof options.body === 'string') bodyData = JSON.parse(options.body);
      } catch {
        // ignore
      }
      return {
        ...INITIAL_COUNSELOR_PROFILE,
        ...bodyData,
        onboarding_status: 'APPROVED',
        credentials_verified: true,
        updated_at: new Date().toISOString(),
      } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/counselors/escalate') && options.method?.toUpperCase() === 'POST') {
      let bodyData: any = {};
      try {
        if (typeof options.body === 'string') bodyData = JSON.parse(options.body);
      } catch {
        // ignore
      }
      const matchedAuth = INITIAL_AUTHORITY_CONTACTS.find((a) => a.id === bodyData.authority_contact_id) || INITIAL_AUTHORITY_CONTACTS[0];
      return {
        id: `ESC-${Date.now().toString().slice(-4)}`,
        case_id: bodyData.case_id || 'CASE-SYN-1007',
        student_id: bodyData.student_id || 'SYN-1007',
        student_name: 'Asha (synthetic)',
        authority_contact_id: matchedAuth.id,
        authority_name: `${matchedAuth.contact_name} (${matchedAuth.designation})`,
        escalation_category: bodyData.escalation_category || matchedAuth.escalation_category,
        initiated_by_user_id: '22222222-2222-2222-2222-222222222222',
        initiator_name: 'Dr. Meera Nambiar',
        timestamp: new Date().toISOString(),
        reason: bodyData.reason || 'Escalation requested',
        communication_method: bodyData.communication_method || 'phone',
        status: 'contact_attempted',
        follow_up_notes: bodyData.notes || '',
      } as unknown as T;
    }

    if (cleanEndpoint.endsWith('/counselors/call-requests') && options.method?.toUpperCase() === 'POST') {
      let bodyData: any = {};
      try {
        if (typeof options.body === 'string') bodyData = JSON.parse(options.body);
      } catch {
        // ignore
      }
      return {
        id: `CALL-REQ-${Date.now().toString().slice(-4)}`,
        student_id: bodyData.student_id || 'SYN-1007',
        student_name: 'Asha (synthetic)',
        external_student_ref: bodyData.student_id || 'SYN-1007',
        case_id: bodyData.case_id || 'CASE-SYN-1007',
        signal_id: bodyData.signal_id || 'SIG-SYN-1007',
        risk_score: bodyData.risk_score || 0.68,
        preferred_contact_method: bodyData.preferred_contact_method || 'phone',
        preferred_time_slot: bodyData.preferred_time_slot || 'flexible',
        student_notes: bodyData.student_notes || '',
        status: 'requested',
        assigned_counselor_id: '22222222-2222-2222-2222-222222222222',
        assigned_counselor_name: 'Dr. Meera Nambiar',
        contact_attempt_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as T;
    }

    // Document integrity is never mocked: network failures remain visible to the user.
    if (cleanEndpoint.includes('/documents')) return undefined;

    // Mutations: /review, /transition, /assign, /accept, /tasks, /follow-ups, /outcome (Demo Mode only)
    if (options.method && options.method.toUpperCase() === 'POST') {
      let bodyData: any = {};
      try {
        if (typeof options.body === 'string') bodyData = JSON.parse(options.body);
      } catch {
        // ignore
      }

      return {
        id: `SYNTH-${Date.now().toString().slice(-4)}`,
        status: 'success',
        processed_at: new Date().toISOString(),
        ...bodyData,
      } as unknown as T;
    }

    return undefined;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.campusId) {
      headers['X-Campus-Id'] = this.campusId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const signal = options.signal || controller.signal;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 && !(options as any)._retry && this.tokenRefreshHandler) {
          try {
            const refreshedToken = await this.tokenRefreshHandler();
            if (refreshedToken) {
              this.setToken(refreshedToken);
              return await this.request<T>(endpoint, {
                ...options,
                headers: {
                  ...(options.headers as Record<string, string>),
                  Authorization: `Bearer ${refreshedToken}`,
                },
                _retry: true,
              } as any);
            }
          } catch (refreshErr) {
            console.warn('Session refresh on 401 failed:', refreshErr);
          }
        }

        let errorData: any = {};
        try {
          const errText = await response.text();
          if (errText) errorData = JSON.parse(errText);
        } catch {
          errorData = { message: response.statusText };
        }
        throw ApiError.fromResponse(response.status, errorData, url);
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return undefined as unknown as T;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch (jsonErr) {
        throw new ApiError({
          message: 'Server returned an invalid JSON response format.',
          kind: 'invalid_format',
          status: response.status,
          cause: jsonErr,
        });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);

      // Re-throw existing ApiError from non-2xx HTTP responses
      if (ApiError.isApiError(err)) {
        throw err;
      }

      if (err?.name === 'AbortError') {
        throw ApiError.timeout(`Request to ${url} timed out after 15 seconds.`);
      }

      const isNetworkError =
        err instanceof TypeError ||
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('fetch failed');

      // EXPLICIT DEMO MODE ONLY:
      if (isDemoMode()) {
        console.warn(`[SUTRA DEMO MODE] Using demo fallback for: ${endpoint}`);
        const fallback = this.getOfflineFallback<T>(endpoint, options);
        if (fallback !== undefined) {
          return fallback;
        }
      }

      // Normal application mode: network failures MUST remain errors!
      if (isNetworkError) {
        throw ApiError.network(
          `Unable to connect to the backend server at ${url}. Please ensure the SUTRA backend is running.`,
          err
        );
      }

      throw new ApiError({
        message: err?.message || 'An unexpected request error occurred.',
        kind: 'unknown',
        status: 0,
        cause: err,
      });
    }
  }

  // --- Auth & Identity ---
  public auth = {
    getMe: () => this.request<AuthMeResponse>('/auth/me'),
  };

  // --- Campuses ---
  public campuses = {
    list: () => this.request<CampusResponse[]>('/campuses'),
    get: (id: string) => this.request<CampusResponse>(`/campuses/${id}`),
  };

  // --- Students & Domain Views ---
  public students = {
    list: (params?: { search?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.limit) q.append('limit', String(params.limit));
      if (params?.offset) q.append('offset', String(params.offset));
      const qs = q.toString();
      return this.request<StudentSummary[]>(`/students${qs ? `?${qs}` : ''}`);
    },
    getSupportView: (id: string) =>
      this.request<SupportViewResponse>(`/students/${id}/support-view`),
    getFinanceView: (id: string) =>
      this.request<FinanceViewResponse>(`/students/${id}/finance-view`),
    predict: (id: string, payload?: any) =>
      this.request<MLPredictResponse>(`/students/${id}/predict`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    getReadiness: (id: string) =>
      this.request<StudentReadinessResponse>(`/students/${id}/readiness`),
    simulateScenario: (id: string, payload: WhatIfScenarioRequest) =>
      this.request<WhatIfScenarioResponse>(`/students/${id}/simulate-scenario`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  // --- Signals & Review ---
  public signals = {
    list: (params?: { status?: string; student_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.student_id) q.append('student_id', params.student_id);
      const qs = q.toString();
      return this.request<SignalDTO[]>(`/signals${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => this.request<SignalDTO>(`/signals/${id}`),
    review: (id: string, payload: SignalReviewRequest) =>
      this.request<SignalReviewResponse>(`/signals/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    evaluateStudent: (studentId: string, payload: { student_id: string; policy_version_key?: string }) =>
      this.request<SignalDTO[]>(`/signals/evaluate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  // --- Cases & Lifecycle ---
  public cases = {
    list: (params?: { status?: string; assigned_to?: string; student_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.assigned_to) q.append('assigned_to', params.assigned_to);
      if (params?.student_id) q.append('student_id', params.student_id);
      const qs = q.toString();
      return this.request<CaseDetailDTO[]>(`/cases${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => this.request<CaseDetailDTO>(`/cases/${id}`),
    transition: (id: string, payload: CaseTransitionRequest) =>
      this.request<CaseDetailDTO>(`/cases/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    assign: (id: string, payload: CaseAssignmentRequest) =>
      this.request<CaseDetailDTO>(`/cases/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    accept: (id: string, payload?: AcceptAssignmentRequest) =>
      this.request<CaseDetailDTO>(`/cases/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    createTask: (id: string, payload: CreateTaskRequest) =>
      this.request<CaseTaskDTO>(`/cases/${id}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    recordFollowUp: (id: string, payload: FollowUpRequest) =>
      this.request<FollowUpDTO>(`/cases/${id}/follow-ups`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    recordOutcome: (id: string, payload: OutcomeRequest) =>
      this.request<CaseOutcomeDTO>(`/cases/${id}/outcome`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  // --- Interventions Catalog ---
  public interventions = {
    list: () => this.request<InterventionItem[]>('/interventions'),
  };

  // --- Machine Learning Subsystem ---
  public ml = {
    getModelInfo: () => this.request<MLModelInfo>('/ml/model-info'),
    predictSingle: (payload: MLPredictRequest) =>
      this.request<MLPredictResponse>('/ml/predict', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    predictBatch: (payload: { instances: MLPredictRequest[] }) =>
      this.request<MLPredictResponse[]>('/ml/predict/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getPerformance: (modelVersion?: string) => {
      const qs = modelVersion ? `?model_version=${encodeURIComponent(modelVersion)}` : '';
      return this.request<ModelPerformanceResponse>(`/ml/performance${qs}`);
    },
    getSupportedScenarioFeatures: () =>
      this.request<SupportedScenarioFeature[]>('/ml/supported-scenario-features'),
    simulateScenario: (payload: WhatIfScenarioRequest) =>
      this.request<WhatIfScenarioResponse>('/ml/simulate-scenario', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };


  // --- Bounded AI Orchestration Subsystem (Phase 6) ---
  public ai = {
    getStatus: () =>
      this.request<AIServiceStatusResponse>('/ai/status'),
    getReviewBrief: (signalId: string) =>
      this.request<AIStructuredReviewBriefResponse>('/ai/review-brief', {
        method: 'POST',
        body: JSON.stringify({ signal_id: signalId }),
      }),
    summarizeEvidence: (studentId: string, signalId?: string | null) =>
      this.request<AISummarizeEvidenceResponse>('/ai/summarize-evidence', {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId, signal_id: signalId }),
      }),
    suggestInterventions: (
      studentId: string,
      signalId?: string | null,
      maxSuggestions?: number | null
    ) =>
      this.request<AISuggestInterventionsResponse>('/ai/suggest-interventions', {
        method: 'POST',
        body: JSON.stringify({
          student_id: studentId,
          signal_id: signalId,
          max_suggestions: maxSuggestions || 3,
        }),
      }),
  };

  // --- Counselor Subsystem ---
  public counselors = {
    getProfile: () => this.request<CounselorProfileDTO>('/counselors/profile'),
    submitOnboarding: (payload: CounselorOnboardingRequest) =>
      this.request<CounselorProfileDTO>('/counselors/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    approveOnboarding: (payload: { counselor_id: string; decision: 'approve' | 'reject' | 'suspend'; reason?: string }) =>
      this.request<{ counselor_id: string; onboarding_status: string }>('/counselors/onboarding/approve', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getAuthorityContacts: () =>
      this.request<AuthorityContactItem[]>('/counselors/authority-contacts'),
    escalate: (payload: EscalationRequest) =>
      this.request<EscalationRecordDTO>('/counselors/escalate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listEscalations: () =>
      this.request<EscalationRecordDTO[]>('/counselors/escalations'),
    createCallRequest: (payload: CreateCallRequestInput) =>
      this.request<CounselorCallRequestDTO>('/counselors/call-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listCallRequests: (status?: string) => {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      return this.request<CounselorCallRequestDTO[]>(`/counselors/call-requests${q}`);
    },
    updateCallRequestStatus: (
      id: string,
      payload: { status: string; notes?: string; attempt_increment?: boolean }
    ) =>
      this.request<{ id: string; status: string }>(`/counselors/call-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  };

  // --- Document Integrity & Base Sepolia Anchoring Subsystem ---
  public documents = {
    list: (params?: { doc_type?: string; status?: string; student_ref?: string }) => {
      const q = new URLSearchParams();
      if (params?.doc_type) q.append('doc_type', params.doc_type);
      if (params?.status) q.append('status', params.status);
      if (params?.student_ref) q.append('student_ref', params.student_ref);
      const qs = q.toString();
      return this.request<DocumentListResponse>(`/documents${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => this.request<DocumentDTO>(`/documents/${id}`),
    generate: (payload: DocumentCreateRequest, finalizeImmediately: boolean = false) =>
      this.request<DocumentDTO>(
        `/documents/generate${finalizeImmediately ? '?finalize_immediately=true' : ''}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    upload: (file: File, title?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (title?.trim()) formData.append('title', title.trim());
      return this.request<DocumentDTO>('/documents/upload', {
        method: 'POST',
        body: formData,
      });
    },
    finalize: (id: string) =>
      this.request<DocumentFinalizeResponse>(`/documents/${id}/finalize`, {
        method: 'POST',
      }),
    anchor: (id: string, txHash: string) =>
      this.request<DocumentAnchorResponse>(`/documents/${id}/anchor`, {
        method: 'POST',
        body: JSON.stringify({ tx_hash: txHash }),
      }),
    verify: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('candidate_file', file);
      return this.request<DocumentVerifyResponse>(`/documents/${id}/verify`, {
        method: 'POST',
        body: formData,
      });
    },
    getDownloadUrl: (id: string) => `${getApiBaseUrl()}/documents/${id}/download`,
  };

  // --- SBI Digital Rupee (e₹ / CBDC) Incentive Subsystem ---
  public cbdc = {
    issueVoucher: (payload: CBDCVoucherIssueRequest) =>
      this.request<CBDCVoucherRecord>('/documents/cbdc/issue-voucher', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  // --- Institutional Analytics & Cohort Risk (Phase 5, 6, 7) ---
  public analytics = {
    getCohortSummary: (params?: { cohort?: string; timeframe?: string }) => {
      const q = new URLSearchParams();
      if (params?.cohort) q.append('cohort', params.cohort);
      if (params?.timeframe) q.append('timeframe', params.timeframe);
      const qs = q.toString();
      return this.request<CohortAnalyticsSummaryResponse>(`/analytics/cohort-summary${qs ? `?${qs}` : ''}`);
    },
    getModelPerformance: (modelVersion?: string) => {
      const qs = modelVersion ? `?model_version=${encodeURIComponent(modelVersion)}` : '';
      return this.request<ModelPerformanceResponse>(`/analytics/model-performance${qs}`);
    },
    getRiskTrends: (params?: { cohort?: string; model_version?: string; cutoff?: string; retention_days?: number }) => {
      const q = new URLSearchParams();
      if (params?.cohort) q.append('cohort', params.cohort);
      if (params?.model_version) q.append('model_version', params.model_version);
      if (params?.cutoff) q.append('cutoff', params.cutoff);
      if (params?.retention_days) q.append('retention_days', String(params.retention_days));
      const qs = q.toString();
      return this.request<CohortRiskTrendResponse>(`/analytics/risk-trends${qs ? `?${qs}` : ''}`);
    },
    getStudentRiskTrajectory: (studentRef: string, params?: { retention_days?: number }) => {
      const qs = params?.retention_days ? `?retention_days=${params.retention_days}` : '';
      return this.request<StudentRiskTrajectoryResponse>(
        `/analytics/student-risk-trajectory/${encodeURIComponent(studentRef)}${qs}`
      );
    },
    getPerformanceMonitoring: () => {
      return this.request<HistoricalPerformanceMonitoringResponse>('/analytics/performance-monitoring');
    },
  };


  // --- Health & Governance ---
  public health = {
    check: () => {
      const rootUrl = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
      return this.request<HealthResponse>(`${rootUrl}/health`);
    },
    ready: () => {
      const rootUrl = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
      return this.request<ReadinessResponse>(`${rootUrl}/ready`);
    },
  };

  // --- Phase 3A Proposed Endpoints (Integration Readiness - Pending Backend Release) ---
  // NOTE: These client methods define the exact calling signatures for endpoints
  // currently being implemented by the backend teammate. They use the standard typed
  // request pipeline with JWT + X-Campus-Id headers and are ready to be activated.
  public proposed = {
    getMyCases: () =>
      this.request<StudentMyCasesResponse>('/cases/my-cases'),
    createSupportTicket: (payload: SupportTicketCreateRequest) =>
      this.request<SupportTicketResponse>('/support/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    submitAssessment: (payload: AssessmentSubmissionRequest) =>
      this.request<AssessmentRecordDTO>('/assessments/submissions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getLatestAssessment: () =>
      this.request<AssessmentRecordDTO>('/assessments/my-latest'),
    getCaseMessages: (caseId: string) =>
      this.request<CaseMessagesListResponse>(`/cases/${caseId}/messages`),
    sendCaseMessage: (caseId: string, payload: SendCaseMessageRequest) =>
      this.request<CaseMessageDTO>(`/cases/${caseId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    // --- Happiness Index / Weekly Pulse (Phase 9 / Master Contract) ---
    submitHappinessPulse: (payload: HappinessPulseSubmissionRequest) =>
      this.request<HappinessPulseSubmissionResponse>('/happiness/submissions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getHappinessStatus: () =>
      this.request<HappinessPulseStatusResponse>('/happiness/my-status'),
    getHappinessAggregate: (params?: { cohort?: string; period_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.cohort) q.append('cohort', params.cohort);
      if (params?.period_id) q.append('period_id', params.period_id);
      const qs = q.toString();
      return this.request<HappinessIndexAggregateResponse>(
        `/happiness/aggregate${qs ? `?${qs}` : ''}`
      );
    },
    getHappinessTrends: (params?: { cohort?: string; weeks?: number }) => {
      const q = new URLSearchParams();
      if (params?.cohort) q.append('cohort', params.cohort);
      if (params?.weeks) q.append('weeks', params.weeks.toString());
      const qs = q.toString();
      return this.request<HappinessTrendResponse>(
        `/happiness/trends${qs ? `?${qs}` : ''}`
      );
    },
    // --- Leaderboard & Rewards (Master Contract) ---
    getMyWallet: () =>
      this.request<PointsWalletDTO>('/rewards/wallet'),
    getMyTransactions: () =>
      this.request<PointsTransactionDTO[]>('/rewards/transactions'),
    getEligibleActivities: () =>
      this.request<EligibleActivityDTO[]>('/rewards/activities'),
    claimActivity: (payload: ClaimActivityRequestDTO) =>
      this.request<ClaimActivityResponseDTO>('/rewards/activities/claim', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMyPrivateRank: (period: LeaderboardPeriod = 'weekly') =>
      this.request<StudentPrivateRankDTO>(`/rewards/my-rank?period=${period}`),
    getLeaderboard: (period: LeaderboardPeriod = 'weekly') =>
      this.request<LeaderboardResponseDTO>(`/rewards/leaderboard?period=${period}`),
    getRewardsCatalog: () =>
      this.request<RewardItemDTO[]>('/rewards/catalog'),
    redeemReward: (payload: RedeemRewardRequestDTO) =>
      this.request<RedeemRewardResponseDTO>('/rewards/redeem', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMyRedemptions: () =>
      this.request<RedemptionRecordDTO[]>('/rewards/my-redemptions'),
    getAllRedemptions: () =>
      this.request<RedemptionRecordDTO[]>('/rewards/admin/redemptions'),
    updateRedemptionStatus: (redemptionId: string, payload: UpdateRedemptionStatusRequestDTO) =>
      this.request<RedemptionRecordDTO>(`/rewards/admin/redemptions/${redemptionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  };

  // --- SUTRA Identity & Avatar Studio Subsystem ---
  public identity = {
    getMyIdentity: () =>
      this.request<StudentIdentityDTO>('/identity/me'),
    provisionIdentity: () =>
      this.request<StudentIdentityDTO>('/identity/provision', {
        method: 'POST',
      }),
    updateAvatar: (payload: { display_name?: string; avatar_config?: AvatarConfigDTO; avatar_url?: string }) =>
      this.request<StudentIdentityDTO>('/identity/avatar', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    mintNFT: (payload: { wallet_address?: string }) =>
      this.request<StudentIdentityDTO>('/identity/mint', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMetadata: (sutraId: string) =>
      this.request<any>(`/identity/metadata/${sutraId}`),
  };
}

export const api = new ApiClient();
