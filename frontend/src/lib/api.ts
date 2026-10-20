/**
 * Centralized API Client for Retail Customer Intelligence Platform.
 * Supports token injection, normalized error handling, and fully typed responses.
 */

import {
  Customer,
  CustomerListResponse,
  DashboardKpis,
  TrajectoryData,
  CohortSummary,
  RetentionMatrixData,
  PredictionResult,
  ModelEvaluationMetrics,
  SavedScenario,
  DatasetUploadResponse,
  DatasetValidationReport,
  DatasetImportHistoryItem,
  Recommendation,
  User,
} from '../types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly endpoint: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem('retail_auth_token') : null;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('retail_auth_token', token);
      } else {
        localStorage.removeItem('retail_auth_token');
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const url = endpoint.startsWith('/api/') ? endpoint : `${API_BASE}${endpoint}`;
    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      throw new ApiError('Unable to reach the API. Please retry.', 0, url, error);
    }
    let text: string;
    try { text = await res.text(); }
    catch (error) { throw new ApiError('Unable to read the API response. Please retry.', res.status, url, error); }
    let body: any;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    if (!res.ok) {
      const message = typeof body?.error === 'string' ? body.error : typeof body?.message === 'string' ? body.message :
        res.status === 404 ? 'This service is unavailable on the connected backend.' : `API request failed (HTTP ${res.status}).`;
      throw new ApiError(message, res.status, url, body);
    }
    if (body === null && res.status !== 204) throw new ApiError('The API returned an invalid JSON response.', res.status, url);
    return body as T;
  }

  // Only compatible, non-mutating operations may retry a missing v1 route.
  private async compatible<T>(endpoint: string, legacy: string, options: RequestInit = {}): Promise<T> {
    try { return await this.request<T>(endpoint, options); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      return this.request<T>(legacy, options);
    }
  }

  // --- Auth ---
  async login(username: string, password: string): Promise<{ token: string; user: User; message: string }> {
    const res = await this.request<{ token: string; user: User; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async register(username: string, email: string, password: string): Promise<{ token: string; user: User; message: string }> {
    const res = await this.request<{ token: string; user: User; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async getCurrentUser(): Promise<{ authenticated: boolean; user: User }> {
    return this.request<{ authenticated: boolean; user: User }>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  // --- Dashboard ---
  async getKpis(): Promise<DashboardKpis> {
    return this.request<DashboardKpis>('/dashboard/kpis');
  }

  async getTrajectory(period: string = '12m'): Promise<TrajectoryData> {
    return this.request<TrajectoryData>(`/api/analytics/revenue-orders?period=${encodeURIComponent(period)}`);
  }

  // --- Customers & Customer 360 ---
  async getCustomers(params: {
    page?: number;
    limit?: number;
    search?: string;
    segment?: string;
    sort_by?: string;
    sort_order?: string;
  } = {}): Promise<CustomerListResponse> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.limit) q.set('limit', params.limit.toString());
    if (params.search) q.set('search', params.search);
    if (params.segment) q.set('segment', params.segment);
    if (params.sort_by) q.set('sort_by', params.sort_by);
    if (params.sort_order) q.set('sort_order', params.sort_order);
    return this.request<CustomerListResponse>(`/customers?${q.toString()}`);
  }

  async getCustomer(id: string): Promise<Customer> {
    return this.compatible<Customer>(`/customers/${encodeURIComponent(id)}`, `/api/customer/${encodeURIComponent(id)}`);
  }

  // --- Analytics & Cohorts ---
  async getCohorts(): Promise<CohortSummary> {
    return this.compatible<CohortSummary>('/analytics/cohorts', '/api/analytics/cohorts');
  }

  async getRetentionMatrix(): Promise<RetentionMatrixData> {
    return this.request<RetentionMatrixData>('/analytics/retention-matrix');
  }

  // --- ML Predictions ---
  async getModelMetrics(): Promise<ModelEvaluationMetrics> {
    const result = await this.compatible<ModelEvaluationMetrics | ModelEvaluationMetrics['metrics']>('/predictions/metrics', '/api/metrics');
    return 'metrics' in result ? result as ModelEvaluationMetrics : { metrics: result };
  }

  async predictCustomer(recency_days: number, frequency: number, total_spend: number, tenure_days: number = 300): Promise<PredictionResult> {
    return this.compatible<PredictionResult>('/predictions/predict', '/api/predict', {
      method: 'POST',
      body: JSON.stringify({ recency_days, frequency, total_spend, tenure_days }),
    });
  }

  // --- What-If Simulator & Scenarios ---
  async getScenarios(): Promise<{ scenarios: SavedScenario[]; count: number }> {
    return this.request<{ scenarios: SavedScenario[]; count: number }>('/simulator/scenarios');
  }

  async saveScenario(scenario: {
    name: string;
    recency_days: number;
    frequency: number;
    total_spend: number;
    tenure_days: number;
    predicted_segment: string;
    predicted_clv: number;
    predicted_churn: number;
    notes?: string;
  }): Promise<{ message: string; scenario: SavedScenario }> {
    return this.request<{ message: string; scenario: SavedScenario }>('/simulator/scenarios', {
      method: 'POST',
      body: JSON.stringify(scenario),
    });
  }

  async deleteScenario(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/simulator/scenarios/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Datasets & CSV Ingestion ---
  async uploadDataset(file: File): Promise<DatasetUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<DatasetUploadResponse>('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async validateDataset(filename: string, total_rows: number): Promise<DatasetValidationReport> {
    return this.request<DatasetValidationReport>('/datasets/validate', {
      method: 'POST',
      body: JSON.stringify({ filename, total_rows }),
    });
  }

  async commitDatasetImport(filename: string, total_rows: number, valid_rows: number, rejected_rows: number): Promise<{ message: string; import_id: number; summary: any }> {
    return this.request('/datasets/import', {
      method: 'POST',
      body: JSON.stringify({ filename, total_rows, valid_rows, rejected_rows }),
    });
  }

  async getDatasetHistory(): Promise<{ imports: DatasetImportHistoryItem[]; count: number }> {
    return this.request<{ imports: DatasetImportHistoryItem[]; count: number }>('/datasets/history');
  }

  // --- Recommendations & Reports ---
  async getRecommendations(): Promise<{ recommendations: Recommendation[]; total_recommendations: number }> {
    return this.request<{ recommendations: Recommendation[]; total_recommendations: number }>('/recommendations');
  }

  async getReports(): Promise<{ reports: any[] }> {
    return this.request<{ reports: any[] }>('/reports');
  }
}

export const api = new ApiClient();
