import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  ListOrdered,
  Users,
  Server,
  Database,
  Zap,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { createPayment, getDashboardStats, getQueueContents, getPayment } from '../services/api';
import type { Payment } from '../types/payment';

type FlowKey = 'api' | 'queue' | 'worker' | 'database' | 'success';

const FLOW_STEPS = [
  { key: 'api' as FlowKey, label: '1. API', sub: 'Payment Created', Icon: Server, iconBg: '#dbeafe', iconColor: '#2563eb' },
  { key: 'queue' as FlowKey, label: '2. Redis Queue', sub: 'Message Enqueued', Icon: Database, iconBg: '#fee2e2', iconColor: '#dc2626', badge: '2', badgeBg: '#fef3c7', badgeColor: '#b45309' },
  { key: 'worker' as FlowKey, label: '3. Worker', sub: 'Processing Payment', Icon: Zap, iconBg: '#f3e8ff', iconColor: '#7c3aed', badge: 'Active', badgeBg: '#dcfce7', badgeColor: '#15803d' },
  { key: 'database' as FlowKey, label: '4. Database', sub: 'Updating Status', Icon: Database, iconBg: '#dcfce7', iconColor: '#16a34a' },
  { key: 'success' as FlowKey, label: '5. Status', sub: 'Payment Successful', Icon: CheckCircle2, iconBg: '#dcfce7', iconColor: '#16a34a' },
];

/* ─── component ───────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ amount: '1000', user_id: 'user_123', idempotency_key: '' });
  const [createdPaymentId, setCreatedPaymentId] = useState<string | null>(null);
  const [createdPaymentStatus, setCreatedPaymentStatus] = useState<string | null>(null);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeFlow, setActiveFlow] = useState<FlowKey | null>(null);
  
  // Real-time data states
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [queueData, setQueueData] = useState<any>(null);

  // Fetch dashboard stats on mount and every 3 seconds
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getDashboardStats();
        setDashboardStats(stats);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch queue contents
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const queue = await getQueueContents();
        setQueueData(queue);
      } catch (error) {
        console.error('Error fetching queue:', error);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  // Poll for payment status updates
  useEffect(() => {
    if (!createdPaymentId) return;

    const pollPayment = async () => {
      try {
        const payment = await getPayment(createdPaymentId);
        setCurrentPayment(payment);
        setCreatedPaymentStatus(payment.status);
      } catch (error) {
        console.error('Error polling payment:', error);
      }
    };

    pollPayment();
    const interval = setInterval(pollPayment, 2000);
    return () => clearInterval(interval);
  }, [createdPaymentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActiveFlow('api');
    try {
      const response = await createPayment({
        amount: parseFloat(formData.amount),
        user_id: formData.user_id,
      }, formData.idempotency_key || undefined); // Pass idempotency key as second parameter
      setCreatedPaymentId(response.payment_id);
      setCreatedPaymentStatus(response.status);
    } catch (error) {
      console.error('Payment creation failed:', error);
      setCreatedPaymentId(null);
      setCreatedPaymentStatus(null);
    }
    setTimeout(() => setActiveFlow('queue'), 600);
    setTimeout(() => setActiveFlow('worker'), 1200);
    setTimeout(() => setActiveFlow('database'), 1800);
    setTimeout(() => setActiveFlow('success'), 2400);
    setTimeout(() => { setActiveFlow(null); setIsSubmitting(false); }, 3200);
  };

  const copyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Use real data or fallback to defaults
  const stats = dashboardStats || {
    total_payments: 0,
    successful: 0,
    success_rate: 0,
    processing: 0,
    processing_rate: 0,
    failed: 0,
    failed_rate: 0,
    queue_length: 0,
    active_workers: 0
  };

  const queueItems = queueData?.items || [];
  const queueLength = queueData?.queue_length || 0;
  
  // Show only top 5 items on dashboard
  const displayedQueueItems = queueItems.slice(0, 5);
  const hasMoreItems = queueItems.length > 5;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Live Payment Processing Monitor</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#f0fdf4', borderRadius: 999, border: '1px solid #bbf7d0' }}>
            <span className="animate-pulse-green" style={{ width: 8, height: 8, background: '#22c55e', borderRadius: 999, display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>System Healthy</span>
          </div>
          <button onClick={() => document.getElementById('payment-form')?.scrollIntoView({ behavior: 'smooth' })} className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }}>
            Create Payment
          </button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard icon={<CreditCard />} iconBg="#f1f5f9" iconColor="#475569" label="Total Payments" value={stats.total_payments.toString()} sub="Today" subColor="#94a3b8" />
        <StatCard icon={<CheckCircle2 />} iconBg="#f0fdf4" iconColor="#22c55e" label="Successful" value={stats.successful.toString()} sub={`${stats.success_rate}%`} subColor="#16a34a" />
        <StatCard icon={<Clock />} iconBg="#fffbeb" iconColor="#f59e0b" label="Processing" value={stats.processing.toString()} sub={`${stats.processing_rate}%`} subColor="#d97706" />
        <StatCard icon={<XCircle />} iconBg="#fef2f2" iconColor="#ef4444" label="Failed" value={stats.failed.toString()} sub={`${stats.failed_rate}%`} subColor="#dc2626" />
        <StatCard icon={<ListOrdered />} iconBg="#f5f3ff" iconColor="#7c3aed" label="Queue Length" value={queueLength.toString()} sub="Messages" subColor="#94a3b8" />
        <StatCard icon={<Users />} iconBg="#f0fdf4" iconColor="#22c55e" label="Active Workers" value={stats.active_workers.toString()} sub="Running" subColor="#16a34a" />
      </div>

      {/* ── Live Payment Flow ───────────────────── */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 className="section-title" style={{ marginBottom: 20 }}>Payment Flow (Live)</h2>
        <div className="flow-row">
          {FLOW_STEPS.map((step, idx) => (
            <div key={step.key} style={{ display: 'contents' }}>
              <div className={`flow-card ${activeFlow === step.key ? 'active' : ''}`}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>{step.label}</div>
                <div style={{ width: 44, height: 44, background: step.iconBg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <step.Icon style={{ width: 22, height: 22, color: step.iconColor }} />
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{step.sub}</div>
                {step.key === 'queue' ? (
                  <span style={{ display: 'inline-block', marginTop: 8, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: step.badgeBg, color: step.badgeColor }}>
                    {queueLength}
                  </span>
                ) : step.key === 'worker' ? (
                  <span style={{ display: 'inline-block', marginTop: 8, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: step.badgeBg, color: step.badgeColor }}>
                    Active
                  </span>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e' }} />
                  </div>
                )}
              </div>
              {idx < FLOW_STEPS.length - 1 && (
                <div className="flow-connector">
                  <ChevronRight style={{ width: 14, height: 14, color: '#cbd5e1', position: 'relative', zIndex: 1 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 3-Column Grid ───────────────────────── */}
      <div className="content-grid">
        {/* Column 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Create Payment */}
          <div id="payment-form" className="card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ marginBottom: 16 }}>Create Payment</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Amount (₹)</label>
                <input className="form-input" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">User ID</label>
                <input className="form-input" type="text" value={formData.user_id} onChange={(e) => setFormData({ ...formData, user_id: e.target.value })} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Idempotency Key <span style={{ color: '#cbd5e1', fontWeight: 400, textTransform: 'none' }}>(Optional)</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.idempotency_key}
                    onChange={(e) => setFormData({ ...formData, idempotency_key: e.target.value })}
                    placeholder="test-key-123"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, idempotency_key: `test-${Date.now()}` })}
                    style={{
                      padding: '8px 16px',
                      background: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Generate
                  </button>
                </div>
                <div style={{ marginTop: 8, padding: 10, background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 6 }}>
                  <p style={{ fontSize: 11, color: '#6b21a8', fontWeight: 600, marginBottom: 4 }}>
                    🔒 How to test idempotency:
                  </p>
                  <ol style={{ fontSize: 10, color: '#7c3aed', marginLeft: 16, lineHeight: 1.5 }}>
                    <li>Click "Generate" or enter a key (e.g., "test-key-123")</li>
                    <li>Click "Create Payment" - note the payment ID</li>
                    <li>Click "Create Payment" again with the SAME key</li>
                    <li>You'll get the SAME payment ID (cached response)</li>
                  </ol>
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Create Payment'}
              </button>
            </form>
            {createdPaymentId && (
              <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d' }}>Payment ID:</span>
                  <button onClick={() => copyId(createdPaymentId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}>
                    {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
                <code style={{ fontSize: 12, color: '#15803d', fontFamily: 'var(--font-mono)' }}>{createdPaymentId}</code>
                <div style={{ marginTop: 8, fontSize: 11, color: '#15803d' }}>
                  Status: <strong>{createdPaymentStatus}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>Payment Status (Live)</h2>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              Payment ID: <code style={{ color: '#2563eb', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{createdPaymentId ?? 'N/A'}</code>
            </div>
            {currentPayment ? (
              <div style={{ padding: 20, background: currentPayment.status === 'SUCCESS' ? '#f0fdf4' : currentPayment.status === 'FAILED' ? '#fef2f2' : '#fffbeb', border: `1px solid ${currentPayment.status === 'SUCCESS' ? '#bbf7d0' : currentPayment.status === 'FAILED' ? '#fecaca' : '#fde68a'}`, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, background: currentPayment.status === 'SUCCESS' ? '#dcfce7' : currentPayment.status === 'FAILED' ? '#fee2e2' : '#fef3c7', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  {currentPayment.status === 'SUCCESS' ? <CheckCircle2 style={{ width: 32, height: 32, color: '#16a34a' }} /> : currentPayment.status === 'FAILED' ? <XCircle style={{ width: 32, height: 32, color: '#dc2626' }} /> : <Clock style={{ width: 32, height: 32, color: '#d97706' }} />}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: currentPayment.status === 'SUCCESS' ? '#16a34a' : currentPayment.status === 'FAILED' ? '#dc2626' : '#d97706', marginBottom: 4 }}>{currentPayment.status}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Amount: <strong style={{ color: '#0f172a' }}>₹{currentPayment.amount}</strong></div>
              </div>
            ) : (
              <div style={{ padding: 20, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Create a payment to see status
              </div>
            )}
          </div>
        </div>

        {/* Column 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Queue */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 className="section-title">Queue (Redis List)</h2>
              {hasMoreItems && (
                <button
                  onClick={() => navigate('/queue-monitor')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  View All
                  <ExternalLink style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayedQueueItems.length > 0 ? displayedQueueItems.map((item: any) => (
                <div key={item.payment_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                  <code style={{ fontSize: 12, color: '#b45309', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{item.payment_id}</code>
                  <span style={{ fontSize: 11, color: '#d97706' }}>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}</span>
                </div>
              )) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Queue is empty
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Total Messages: <strong style={{ color: '#0f172a' }}>{queueLength}</strong></span>
              {hasMoreItems && (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Showing top 5 of {queueLength}
                </span>
              )}
            </div>
          </div>

          {/* Worker Activity */}
          <div className="card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>Worker Activity</h2>
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Worker 1</span>
                <span className="badge badge-green">online</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                Status: <strong style={{ color: '#0f172a' }}>Listening for jobs</strong>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                Note: Real-time worker metrics require WebSocket connection
              </div>
            </div>
          </div>

          {/* Redis Events */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 className="section-title">Redis Publish Events</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Polling</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
              Live event streaming requires WebSocket/SSE connection. Check the Events page for simulated live feed.
            </div>
          </div>
        </div>

        {/* Column 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Payment Timeline */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="section-title">Payment Timeline</h2>
            </div>
            {currentPayment ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative', paddingBottom: 16 }}>
                  <div style={{ position: 'absolute', left: 9, top: 22, bottom: 0, width: 2, background: '#bbf7d0' }} />
                  <div style={{ width: 20, height: 20, borderRadius: 999, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check style={{ width: 12, height: 12, color: '#fff' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>Payment Created</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{new Date(currentPayment.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 999, background: currentPayment.status === 'SUCCESS' ? '#22c55e' : currentPayment.status === 'FAILED' ? '#ef4444' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {currentPayment.status === 'SUCCESS' || currentPayment.status === 'FAILED' ? <Check style={{ width: 12, height: 12, color: '#fff' }} /> : <Clock style={{ width: 12, height: 12, color: '#fff' }} />}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>Status: {currentPayment.status}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{new Date(currentPayment.updated_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 14, color: '#94a3b8' }}>
                Create a payment to see timeline
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: '#cbd5e1', paddingBottom: 16 }}>
        PayFlow — Distributed Payment Processing System 💙
      </div>
    </div>
  );
};

/* ─── Stat Card ───────────────────────────────────── */
const StatCard = ({ icon, iconBg, iconColor, label, value, sub, subColor }: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  subColor: string;
}) => (
  <div className="stat-card card-hover">
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
      <div className="stat-label">{label}</div>
      <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-sub" style={{ color: subColor }}>{sub}</div>
  </div>
);

export default Dashboard;

// Made with Bob
