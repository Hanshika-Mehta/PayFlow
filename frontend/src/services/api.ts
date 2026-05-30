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
  createPayment: async (data: PaymentCreateRequest): Promise<PaymentCreateResponse> => {
    const response = await api.post<PaymentCreateResponse>('/payments', data);
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
};

// Export individual functions for convenience
export const createPayment = paymentApi.createPayment;
export const getPayment = paymentApi.getPayment;
export const getPaymentsByUser = paymentApi.getPaymentsByUser;
export const getQueueStatus = paymentApi.getQueueStatus;
export const getWorkerStatus = paymentApi.getWorkerStatus;
export const getMetrics = paymentApi.getMetrics;
export const getPaymentTimeline = paymentApi.getPaymentTimeline;

export default api;

// Made with Bob
