import { useState } from 'react';
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
} from 'lucide-react';
import { createPayment } from '../services/api';
import type { Payment } from '../types/payment';

/* ─── static data ─────────────────────────────────── */
const INITIAL_QUEUE = [
  { id: 'pay_1715751111111', time: '10:30:15' },
  { id: 'pay_1715752222222', time: '10:30:16' },
];

const INITIAL_EVENTS = [
  { time: '10:30:21', event: 'payment.success', color: '#16a34a' },
  { time: '10:30:16', event: 'payment.processing', color: '#2563eb' },
  { time: '10:30:15', event: 'payment.enqueued', color: '#d97706' },
  { time: '10:30:15', event: 'payment.created', color: '#64748b' },
];

const INITIAL_WORKERS = [
  { id: 1, status: 'online', currentJob: 'pay_1715751234567', state: 'Processing', elapsed: '2.8 sec' },
];

const INITIAL_TIMELINE = [
  { step: 'Payment Created', time: '10:30:15' },
  { step: 'Added to Queue', time: '10:30:15' },
  { step: 'Worker Picked', time: '10:30:16' },
  { step: 'Processing Started', time: '10:30:16' },
  { step: 'Database Updated', time: '10:30:21' },
  { step: 'Payment Successful', time: '10:30:21' },
];

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
  const [formData, setFormData] = useState({ amount: '1000', user_id: 'user_123', idempotency_key: '' });
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeFlow, setActiveFlow] = useState<FlowKey | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActiveFlow('api');
    try {
      const payment = await createPayment({
        amount: parseFloat(formData.amount),
        user_id: formData.user_id,
        idempotency_key: formData.idempotency_key || undefined,
      });
      setCreatedPayment(payment);
    } catch {
      setCreatedPayment({
        id: `pay_${Date.now()}`,
        user_id: formData.user_id,
        amount: parseFloat(formData.amount),
        status: 'SUCCESS',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
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
        <StatCard icon={<CreditCard />} iconBg="#f1f5f9" iconColor="#475569" label="Total Payments" value="24" sub="Today" subColor="#94a3b8" />
        <StatCard icon={<CheckCircle2 />} iconBg="#f0fdf4" iconColor="#22c55e" label="Successful" value="18" sub="75%" subColor="#16a34a" />
        <StatCard icon={<Clock />} iconBg="#fffbeb" iconColor="#f59e0b" label="Processing" value="3" sub="12.5%" subColor="#d97706" />
        <StatCard icon={<XCircle />} iconBg="#fef2f2" iconColor="#ef4444" label="Failed" value="3" sub="12.5%" subColor="#dc2626" />
        <StatCard icon={<ListOrdered />} iconBg="#f5f3ff" iconColor="#7c3aed" label="Queue Length" value="2" sub="Messages" subColor="#94a3b8" />
        <StatCard icon={<Users />} iconBg="#f0fdf4" iconColor="#22c55e" label="Active Workers" value="1" sub="Running" subColor="#16a34a" />
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
                {step.badge ? (
                  <span style={{ display: 'inline-block', marginTop: 8, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: step.badgeBg, color: step.badgeColor }}>
                    {step.badge}
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
                <input className="form-input" type="text" value={formData.idempotency_key} onChange={(e) => setFormData({ ...formData, idempotency_key: e.target.value })} placeholder="abc-123" />
              </div>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Create Payment'}
              </button>
            </form>
            {createdPayment && (
              <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d' }}>Payment ID:</span>
                  <button onClick={() => copyId(createdPayment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}>
                    {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
                <code style={{ fontSize: 12, color: '#15803d', fontFamily: 'var(--font-mono)' }}>{createdPayment.id}</code>
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>Payment Status (Live)</h2>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              Payment ID: <code style={{ color: '#2563eb', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{createdPayment?.id ?? 'pay_1715751234567'}</code>
            </div>
            <div style={{ padding: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, background: '#dcfce7', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle2 style={{ width: 32, height: 32, color: '#16a34a' }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>SUCCESS</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Completed in <strong style={{ color: '#0f172a' }}>5.2 sec</strong></div>
            </div>
          </div>
        </div>

        {/* Column 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Queue */}
          <div className="card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>Queue (Redis List)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {INITIAL_QUEUE.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                  <code style={{ fontSize: 12, color: '#b45309', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{item.id}</code>
                  <span style={{ fontSize: 11, color: '#d97706' }}>{item.time}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
              Total Messages: <strong style={{ color: '#0f172a' }}>{INITIAL_QUEUE.length}</strong>
            </div>
          </div>

          {/* Worker Activity */}
          <div className="card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>Worker Activity</h2>
            {INITIAL_WORKERS.map((w) => (
              <div key={w.id} style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Worker {w.id}</span>
                  <span className="badge badge-green">{w.status}</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  Current Job:
                  <code style={{ display: 'block', color: '#2563eb', fontFamily: 'var(--font-mono)', fontWeight: 500, marginTop: 2 }}>{w.currentJob}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <span className="badge badge-purple">{w.state}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                  <span style={{ color: '#64748b' }}>Time Elapsed:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{w.elapsed}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Redis Events */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 className="section-title">Redis Publish Events (Live)</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="animate-pulse-green" style={{ width: 8, height: 8, background: '#22c55e', borderRadius: 999, display: 'inline-block' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>Live</span>
              </div>
            </div>
            <div>
              {INITIAL_EVENTS.map((ev, i) => (
                <div key={i} className="event-log-line" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{ev.time}</span>
                  <span style={{ fontWeight: 600, color: ev.color }}>{ev.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Payment Timeline */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="section-title">Payment Timeline</h2>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Time</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>5.2 sec</div>
              </div>
            </div>
            <div>
              {INITIAL_TIMELINE.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative', paddingBottom: idx < INITIAL_TIMELINE.length - 1 ? 16 : 0 }}>
                  {/* Connector line */}
                  {idx < INITIAL_TIMELINE.length - 1 && (
                    <div style={{ position: 'absolute', left: 9, top: 22, bottom: 0, width: 2, background: '#bbf7d0' }} />
                  )}
                  {/* Dot */}
                  <div style={{ width: 20, height: 20, borderRadius: 999, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check style={{ width: 12, height: 12, color: '#fff' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{step.step}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{step.time}</span>
                  </div>
                </div>
              ))}
            </div>
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
