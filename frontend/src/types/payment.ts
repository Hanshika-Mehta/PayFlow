export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: PaymentStatus;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface PaymentCreateRequest {
  user_id: string;
  amount: number;
}

export interface PaymentCreateResponse {
  payment_id: string;
  status: PaymentStatus;
}

export interface PaymentEvent {
  payment_id: string;
  event_type: string;
  timestamp: string;
  status: PaymentStatus;
}

export interface QueueStatus {
  queue_length: number;
  pending_payments: string[];
  throughput: number;
}

export interface WorkerStatus {
  worker_id: string;
  status: 'idle' | 'processing' | 'error';
  current_job: string | null;
  jobs_completed: number;
  success_rate: number;
}

export interface SystemMetrics {
  total_payments: number;
  success_rate: number;
  avg_latency_ms: number;
  queue_depth: number;
  active_workers: number;
}

export interface PaymentTimeline {
  payment_id: string;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  state: PaymentStatus;
  timestamp: string;
  duration_ms?: number;
}

// Made with Bob
