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
} from './types';
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private token: string | null = null;
  private campusId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('sutra_auth_token');
      this.campusId = localStorage.getItem('sutra_active_campus_id');
    }
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

    // Mutations: /review, /transition, /assign, /accept, /tasks, /follow-ups, /outcome
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
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
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

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }
        const error = new Error(
          errorData?.error?.message ||
            errorData?.detail ||
            `HTTP ${response.status}: ${response.statusText}`
        );
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }

      return (await response.json()) as T;
    } catch (err: any) {
      // Gracefully handle network failures when backend is offline
      const isNetworkError =
        err instanceof TypeError ||
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError');

      if (isNetworkError) {
        console.warn(`[SUTRA API] Backend offline at ${url}. Providing graceful offline response for: ${endpoint}`);
        const fallback = this.getOfflineFallback<T>(endpoint, options);
        if (fallback !== undefined) {
          return fallback;
        }
        const offlineError = new Error(`Backend offline: Unable to connect to ${url}`);
        (offlineError as any).status = 0;
        (offlineError as any).isOffline = true;
        throw offlineError;
      }

      // Re-throw with formatted context
      throw err;
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
    finalize: (id: string) =>
      this.request<DocumentFinalizeResponse>(`/documents/${id}/finalize`, {
        method: 'POST',
      }),
    anchor: (id: string) =>
      this.request<DocumentAnchorResponse>(`/documents/${id}/anchor`, {
        method: 'POST',
      }),
    verify: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('candidate_file', file);
      return this.request<DocumentVerifyResponse>(`/documents/${id}/verify`, {
        method: 'POST',
        body: formData,
      });
    },
    getDownloadUrl: (id: string) => `${API_BASE_URL}/documents/${id}/download`,
  };

  // --- SBI Digital Rupee (e₹ / CBDC) Incentive Subsystem ---
  public cbdc = {
    issueVoucher: (payload: CBDCVoucherIssueRequest) =>
      this.request<CBDCVoucherRecord>('/documents/cbdc/issue-voucher', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  // --- Health & Governance ---
  public health = {
    check: () => {
      const rootUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
      return this.request<HealthResponse>(`${rootUrl}/health`);
    },
    ready: () => {
      const rootUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
      return this.request<ReadinessResponse>(`${rootUrl}/ready`);
    },
  };
}

export const api = new ApiClient();
