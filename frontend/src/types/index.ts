/**
 * Core TypeScript Data Models for Retail Customer Intelligence Platform.
 */

export interface Transaction {
  date: string;
  invoice: string;
  stock_code: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Customer {
  customer_id: string;
  segment: 'Champions' | 'Loyal Customers' | 'At-Risk' | 'Lost / Churned' | string;
  predicted_clv: number;
  churn_probability: number;
  recency_days: number;
  frequency: number;
  monetary: number;
  tenure_days: number;
  avg_order_value: number;
  transactions?: Transaction[];
  last_updated?: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface DashboardKpis {
  total_customers: number;
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_growth: number;
  revenue_growth: number;
  aov_growth: number;
  repeat_purchase_rate: number;
  customer_retention_rate: number;
  data_freshness: string;
  serving_backend: string;
}

export interface TrajectoryData {
  period: '12m' | '6m' | 'all' | '90d' | '30d' | '7d';
  date_range_label: string;
  labels: string[];
  full_dates: string[];
  revenue: number[];
  orders: number[];
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  revenue_growth: number;
  orders_growth: number;
  aov_growth: number;
  headline_revenue: number;
  headline_growth: number;
  headline_period_text: string;
}

export interface CohortItem {
  count: number;
  percentage: number;
  avg_recency: number;
  avg_frequency: number;
  avg_monetary: number;
}

export interface CohortSummary {
  status: string;
  total_profiles: number;
  cohorts: Record<string, CohortItem>;
  serving_timestamp: string;
}

export interface RetentionMatrixItem {
  cohort: string;
  size: number;
  retention: (number | null)[];
}

export interface RetentionMatrixData {
  months: string[];
  matrix: RetentionMatrixItem[];
  average_m1_retention: number;
  average_m3_retention: number;
  average_m6_retention: number;
}

export interface GeminiExplanation {
  provider: string;
  model: string;
  summary: string;
  notice: string;
  evidence_refs: string[];
  evidence: Record<string, unknown>;
}

export interface PredictionResult {
  inference_status?: 'available' | 'unavailable';
  model_versions?: Record<string, string>;
  trained_data_timestamp?: string | null;
  trained_data_timestamp_status?: string;
  feature_inputs?: Record<string, number>;
  drivers?: { model: string; feature: string; value: number; global_importance: number; explanation: string }[];
  segment: string;
  predicted_clv: number;
  churn_probability: number;
  recency_days: number;
  frequency: number;
  monetary: number;
  tenure_days: number;
  avg_order_value: number;
}

export interface ModelEvaluationMetrics {
  metrics: {
    clv_regression?: {
      robust_cohort_r2: number;
      robust_cohort_mae: number;
      robust_cohort_rmse: number;
    };
    churn_classification?: {
      roc_auc: number;
      f1_score: number;
      accuracy: number;
    };
    cluster_profiles?: Array<{
      cluster: number;
      mean_recency: number;
      mean_frequency: number;
      mean_spend: number;
      score: number;
    }>;
  };
  clv_model?: {
    algorithm: string;
    test_r2: number;
    test_rmse: number;
    test_mae: number;
    features: string[];
    prediction_horizon: string;
  };
  churn_model?: {
    algorithm: string;
    roc_auc: number;
    f1_score: number;
    accuracy: number;
    features: string[];
    threshold: number;
  };
  segmentation_model?: {
    algorithm: string;
    k_clusters: number;
    segments: string[];
    features: string[];
  };
}

export interface SavedScenario {
  id: number;
  name: string;
  recency_days: number;
  frequency: number;
  total_spend: number;
  tenure_days: number;
  predicted_segment: string;
  predicted_clv: number;
  predicted_churn: number;
  notes?: string;
  created_at: string;
}

export interface DatasetUploadResponse {
  filename: string;
  headers: string[];
  total_rows: number;
  preview_rows: string[][];
  suggested_mapping: Record<string, string>;
  expected_fields: string[];
}

export interface DatasetValidationReport {
  status: string;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  missing_customer_ids: number;
  negative_quantities_filtered: number;
  duplicate_invoices: number;
  schema_compliance: string;
  estimated_new_customers: number;
}

export interface DatasetImportHistoryItem {
  id: number;
  filename: string;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  status: string;
  summary?: {
    imported_by: string;
    valid_percentage: number;
    execution_time_sec: number;
    warehouse_destination: string;
  };
  created_at: string;
}

export interface Recommendation {
  id: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  target_segment: string;
  audience_size: number;
  audience_pct: string;
  avg_clv: string;
  avg_recency: string;
  rationale: string;
  suggested_action: string;
  estimated_retention_lift: string;
  potential_recovered_revenue: string;
}

export interface User {
  id: number | null;
  username: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}
