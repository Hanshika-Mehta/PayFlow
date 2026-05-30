import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, Search, Filter, ChevronRight } from 'lucide-react';
import { getRecentPayments } from '../services/api';

type FilterType = 'all' | 'SUCCESS' | 'PROCESSING' | 'FAILED' | 'PENDING';

const STATUS_CONFIG = {
  SUCCESS: { icon: CheckCircle2, badgeClass: 'badge-green', label: 'Success' },
  PROCESSING: { icon: Clock, badgeClass: 'badge-blue', label: 'Processing' },
  FAILED: { icon: XCircle, badgeClass: 'badge-red', label: 'Failed' },
  PENDING: { icon: Clock, badgeClass: 'badge-amber', label: 'Pending' },
};

const Payments = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch payments on mount and refresh every 3 seconds
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await getRecentPayments(50);
        setPayments(response.payments || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching payments:', error);
        setLoading(false);
      }
    };

    fetchPayments();
    const interval = setInterval(fetchPayments, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = payments.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.id.toLowerCase().includes(search.toLowerCase()) && !p.user_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedPayment = payments.find((p) => p.id === selected);

  // Calculate filter counts
  const filterCounts = {
    all: payments.length,
    SUCCESS: payments.filter(p => p.status === 'SUCCESS').length,
    PROCESSING: payments.filter(p => p.status === 'PROCESSING').length,
    FAILED: payments.filter(p => p.status === 'FAILED').length,
    PENDING: payments.filter(p => p.status === 'PENDING').length,
  };

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'SUCCESS', label: 'Success' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'FAILED', label: 'Failed' },
    { key: 'PENDING', label: 'Pending' },
  ];

  const calculateDuration = (created: string, updated: string) => {
    const diff = new Date(updated).getTime() - new Date(created).getTime();
    return `${(diff / 1000).toFixed(1)}s`;
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Payments</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Complete payment ledger and transaction history</p>
      </div>

      {/* ── Controls & Filter Bar ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e2e8f0', borderRadius: 8, padding: 3 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: filter === f.key ? '#ffffff' : 'transparent',
                color: filter === f.key ? '#0f172a' : '#64748b',
                boxShadow: filter === f.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {f.label}
              <span style={{ marginLeft: 6, fontSize: 11, color: filter === f.key ? '#2563eb' : '#94a3b8' }}>{filterCounts[f.key]}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8' }} />
            <input
              className="form-input"
              type="text"
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            background: '#ffffff',
            fontSize: 12,
            fontWeight: 500,
            color: '#475569',
            cursor: 'pointer'
          }}>
            <Filter style={{ width: 14, height: 14 }} />
            Filters
          </button>
        </div>
      </div>

      {/* ── Main Layout Split ───────────────────── */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Table list */}
        <div className="card" style={{ flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: '#94a3b8' }}>
              Loading payments...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', background: '#f8fafc' }}>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', padding: '12px 20px' }}>Payment ID</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', padding: '12px 20px' }}>User</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', padding: '12px 20px', textAlign: 'right' }}>Amount</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', padding: '12px 20px' }}>Status</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', padding: '12px 20px' }}>Duration</th>
                  <th style={{ padding: '12px 20px' }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG];
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: selected === p.id ? '#eff6ff' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (selected !== p.id) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (selected !== p.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#334155' }}>{p.id}</code>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 12, color: '#475569' }}>{p.user_id}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        ₹{parseFloat(p.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`badge ${cfg.badgeClass}`}>
                          <Icon style={{ width: 12, height: 12 }} />
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 12, color: '#64748b' }}>
                        {p.status === 'SUCCESS' || p.status === 'FAILED' ? calculateDuration(p.created_at, p.updated_at) : '—'}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <ChevronRight style={{ width: 16, height: 16, color: '#cbd5e1' }} />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: '#94a3b8' }}>
                      No payments found matching the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Details Side Panel */}
        {selectedPayment && (
          <div className="card animate-slide-up" style={{ width: 340, padding: 24, position: 'sticky', top: 24 }}>
            <h3 className="section-title" style={{ marginBottom: 16 }}>Payment Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DetailRow label="Payment ID" value={selectedPayment.id} mono />
              <DetailRow label="User ID" value={selectedPayment.user_id} />
              <DetailRow label="Amount" value={`₹${parseFloat(selectedPayment.amount).toLocaleString()}`} />
              <DetailRow label="Status" value={selectedPayment.status} badge />
              <DetailRow label="Duration" value={selectedPayment.status === 'SUCCESS' || selectedPayment.status === 'FAILED' ? calculateDuration(selectedPayment.created_at, selectedPayment.updated_at) : '—'} />
              <DetailRow label="Created" value={new Date(selectedPayment.created_at).toLocaleTimeString()} />
              <DetailRow label="Retries" value={selectedPayment.retry_count.toString()} />
            </div>

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
              <h4 style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Mini Flow Path</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {['API', 'Queue', 'Worker', 'DB', 'Done'].map((s, i) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                          selectedPayment.status === 'SUCCESS' || i < 3
                            ? '#dcfce7'
                            : selectedPayment.status === 'FAILED' && i === 3
                            ? '#fee2e2'
                            : '#f1f5f9',
                        color:
                          selectedPayment.status === 'SUCCESS' || i < 3
                            ? '#15803d'
                            : selectedPayment.status === 'FAILED' && i === 3
                            ? '#dc2626'
                            : '#64748b',
                        border:
                          selectedPayment.status === 'SUCCESS' || i < 3
                            ? '1px solid #bbf7d0'
                            : selectedPayment.status === 'FAILED' && i === 3
                            ? '1px solid #fecaca'
                            : '1px solid #e2e8f0',
                      }}
                    >
                      {s[0]}
                    </div>
                    {i < 4 && <ChevronRight style={{ width: 12, height: 12, color: '#cbd5e1' }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: boolean }) => {
  let badgeClass = '';
  if (badge) {
    if (value === 'SUCCESS') badgeClass = 'badge-green';
    else if (value === 'FAILED') badgeClass = 'badge-red';
    else if (value === 'PROCESSING') badgeClass = 'badge-blue';
    else badgeClass = 'badge-amber';
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
      {badge ? (
        <span className={`badge ${badgeClass}`}>{value}</span>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 500, color: '#334155', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>
          {value}
        </span>
      )}
    </div>
  );
};

export default Payments;

// Made with Bob
