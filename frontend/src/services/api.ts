import axios from 'axios';
import type {
  Payment,
  PaymentCreateRequest,
  PaymentCreateResponse,
  QueueStatus,
  WorkerStatus,
  SystemMetrics,
  PaymentTimeline,
} from '../types/payment';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const paymentApi = {
  // Create a new payment
  createPayment: async (data: PaymentCreateRequest, idempotencyKey?: string): Promise<PaymentCreateResponse> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const response = await api.post<PaymentCreateResponse>('/payments', data, { headers });
    return response.data;
  },

  // Get payment by ID
  getPayment: async (paymentId: string): Promise<Payment> => {
    const response = await api.get<Payment>(`/payments/${paymentId}`);
    return response.data;
  },

  // Get payments by user
  getPaymentsByUser: async (userId: string): Promise<Payment[]> => {
    const response = await api.get<Payment[]>(`/payments/user/${userId}`);
    return response.data;
  },

  // Get queue status
  getQueueStatus: async (): Promise<QueueStatus> => {
    const response = await api.get<QueueStatus>('/api/queue/status');
    return response.data;
  },

  // Get worker status
  getWorkerStatus: async (): Promise<WorkerStatus> => {
    const response = await api.get<WorkerStatus>('/api/worker/status');
    return response.data;
  },

  // Get system metrics
  getMetrics: async (): Promise<SystemMetrics> => {
    const response = await api.get<SystemMetrics>('/api/metrics');
    return response.data;
  },

  // Get payment timeline
  getPaymentTimeline: async (paymentId: string): Promise<PaymentTimeline> => {
    const response = await api.get<PaymentTimeline>(`/api/payments/${paymentId}/timeline`);
    return response.data;
  },

  // Get dashboard stats
  getDashboardStats: async (): Promise<any> => {
    const response = await api.get('/api/dashboard/stats');
    return response.data;
  },

  // Get queue contents
  getQueueContents: async (): Promise<any> => {
    const response = await api.get('/api/queue/contents');
    return response.data;
  },

  // Get recent payments
  getRecentPayments: async (limit: number = 10): Promise<any> => {
    const response = await api.get(`/api/payments/recent?limit=${limit}`);
    return response.data;
  },

  // Week 4: Idempotency endpoints
  getIdempotencyStats: async (): Promise<any> => {
    const response = await api.get('/monitoring/idempotency-stats');
    return response.data;
  },

  getIdempotencyKeys: async (limit: number = 50): Promise<any> => {
    const response = await api.get(`/monitoring/idempotency-keys?limit=${limit}`);
    return response.data;
  },

  deleteIdempotencyKey: async (key: string): Promise<any> => {
    const response = await api.delete(`/monitoring/idempotency-keys/${key}`);
    return response.data;
  },

  // Week 4: Rate limiting endpoints
  getRateLimitStats: async (): Promise<any> => {
    const response = await api.get('/monitoring/rate-limit-stats');
    return response.data;
  },

  getRateLimitUsers: async (limit: number = 50): Promise<any> => {
    const response = await api.get(`/monitoring/rate-limit-users?limit=${limit}`);
    return response.data;
  },

  getRateLimitIps: async (limit: number = 50): Promise<any> => {
    const response = await api.get(`/monitoring/rate-limit-ips?limit=${limit}`);
    return response.data;
  },

  resetRateLimit: async (identifier: string, limitType: 'user' | 'ip' = 'user'): Promise<any> => {
    const response = await api.delete(`/monitoring/rate-limit-reset/${identifier}?limit_type=${limitType}`);
    return response.data;
  },

  // Week 4: Combined summary
  getWeek4Summary: async (): Promise<any> => {
    const response = await api.get('/monitoring/week4-summary');
    return response.data;
  },
};

// Export individual functions for convenience
export const createPayment = paymentApi.createPayment;
export const getPayment = paymentApi.getPayment;
export const getPaymentsByUser = paymentApi.getPaymentsByUser;
export const getQueueStatus = paymentApi.getQueueStatus;
export const getWorkerStatus = paymentApi.getWorkerStatus;
export const getMetrics = paymentApi.getMetrics;
export const getPaymentTimeline = paymentApi.getPaymentTimeline;
export const getDashboardStats = paymentApi.getDashboardStats;
export const getQueueContents = paymentApi.getQueueContents;
export const getRecentPayments = paymentApi.getRecentPayments;

// Week 4: Idempotency exports
export const getIdempotencyStats = paymentApi.getIdempotencyStats;
export const getIdempotencyKeys = paymentApi.getIdempotencyKeys;
export const deleteIdempotencyKey = paymentApi.deleteIdempotencyKey;

// Week 4: Rate limiting exports
export const getRateLimitStats = paymentApi.getRateLimitStats;
export const getRateLimitUsers = paymentApi.getRateLimitUsers;
export const getRateLimitIps = paymentApi.getRateLimitIps;
export const resetRateLimit = paymentApi.resetRateLimit;

// Week 4: Combined exports
export const getWeek4Summary = paymentApi.getWeek4Summary;

export default api;

// Made with Bob
