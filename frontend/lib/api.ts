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
} from './types';

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

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
