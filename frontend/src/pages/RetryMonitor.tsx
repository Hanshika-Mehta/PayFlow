import { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface RetryItem {
  id: string;
  attempt: number;
  maxAttempts: number;
  error: string;
  countdown: number;
  status: 'retrying' | 'waiting' | 'succeeded' | 'exhausted';
  backoffDelay: number;
}

const INITIAL_RETRIES: RetryItem[] = [
  { id: 'pay_1715751111111', attempt: 2, maxAttempts: 3, error: 'Gateway Timeout', countdown: 4, status: 'waiting', backoffDelay: 4 },
  { id: 'pay_1715752222222', attempt: 1, maxAttempts: 3, error: 'Connection Refused', countdown: 2, status: 'waiting', backoffDelay: 2 },
  { id: 'pay_1715753333333', attempt: 3, maxAttempts: 3, error: 'Service Unavailable', countdown: 0, status: 'exhausted', backoffDelay: 8 },
];

const BACKOFF_SEQUENCE = [1, 2, 4, 8, 16];

const RetryMonitor = () => {
  const [retries, setRetries] = useState(INITIAL_RETRIES);
  const [totalRetries, setTotalRetries] = useState(12);
  const recoveryRate = 83;

  // Simulate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setRetries((prev) =>
        prev.map((r) => {
          if (r.status === 'waiting' && r.countdown > 0) {
            return { ...r, countdown: r.countdown - 1 };
          }
          if (r.status === 'waiting' && r.countdown <= 0) {
            // Simulate retry
            if (Math.random() > 0.4) {
              return { ...r, status: 'succeeded' as const };
            }
            if (r.attempt >= r.maxAttempts) {
              return { ...r, status: 'exhausted' as const };
            }
            const nextAttempt = r.attempt + 1;
            const delay = BACKOFF_SEQUENCE[nextAttempt - 1] || 16;
            return { ...r, attempt: nextAttempt, countdown: delay, backoffDelay: delay, status: 'waiting' as const };
          }
          return r;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addRetry = () => {
    const id = `pay_${Date.now()}`;
    const errors = ['Gateway Timeout', 'Connection Refused', 'Service Unavailable', 'Rate Limited', 'Internal Error'];
    setRetries((prev) => [
      {
        id,
        attempt: 1,
        maxAttempts: 3,
        error: errors[Math.floor(Math.random() * errors.length)],
        countdown: 1,
        status: 'waiting' as const,
        backoffDelay: 1,
      },
      ...prev,
    ]);
    setTotalRetries((t) => t + 1);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Retry Monitor</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Exponential backoff and retry visualization</p>
        </div>
        <button
          onClick={addRetry}
          style={{
            padding: '8px 16px',
            background: '#fef2f2',
            color: '#ef4444',
            border: '1px solid #fee2e2',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
        >
          Simulate Failure
        </button>
      </div>

      {/* ── Stats Cards ─────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Active Retries</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {retries.filter((r) => r.status === 'waiting').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Retries</div>
          <div className="stat-value">{totalRetries}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Recovery Rate</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{recoveryRate}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Exhausted</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {retries.filter((r) => r.status === 'exhausted').length}
          </div>
        </div>
      </div>

      {/* ── Main Layout Split ───────────────────── */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Retry Queue card list */}
        <div className="card" style={{ flex: 2, minWidth: 320, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <RotateCcw style={{ width: 16, height: 16, color: '#64748b' }} />
            <h2 className="section-title">Retry Queue</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {retries.map((r, index) => (
              <div
                key={r.id + r.attempt + index}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  borderBottom: index < retries.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                {/* Status bubble */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    r.status === 'succeeded' ? '#dcfce7' :
                    r.status === 'exhausted' ? '#fee2e2' :
                    '#fffbeb',
                  border:
                    r.status === 'succeeded' ? '1px solid #bbf7d0' :
                    r.status === 'exhausted' ? '1px solid #fecaca' :
                    '1px solid #fde68a',
                  flexShrink: 0,
                }}>
                  {r.status === 'succeeded' ? (
                    <CheckCircle2 style={{ width: 18, height: 18, color: '#15803d' }} />
                  ) : r.status === 'exhausted' ? (
                    <XCircle style={{ width: 18, height: 18, color: '#dc2626' }} />
                  ) : (
                    <RotateCcw
                      className={r.countdown <= 1 ? 'animate-spin-slow' : ''}
                      style={{ width: 18, height: 18, color: '#d97706' }}
                    />
                  )}
                </div>

                {/* ID and Error info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#334155' }}>{r.id}</code>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, color: '#dc2626', fontSize: 11, fontWeight: 500 }}>
                    <AlertTriangle style={{ width: 12, height: 12 }} />
                    {r.error}
                  </div>
                </div>

                {/* Attempt counter */}
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{r.attempt} / {r.maxAttempts}</p>
                  <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>attempt</p>
                </div>

                {/* Countdown progress loader */}
                <div style={{ width: 90, textAlign: 'center' }}>
                  {r.status === 'waiting' ? (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{r.countdown}s</p>
                      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            background: '#d97706',
                            borderRadius: 999,
                            width: `${(r.countdown / r.backoffDelay) * 100}%`,
                            transition: 'width 1s linear'
                          }}
                        />
                      </div>
                    </div>
                  ) : r.status === 'succeeded' ? (
                    <span className="badge badge-green">Recovered</span>
                  ) : (
                    <span className="badge badge-red">Failed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Backoff Panel explanation */}
        <div className="card" style={{ flex: 1, padding: 24, minWidth: 280, alignSelf: 'start', position: 'sticky', top: 24 }}>
          <h2 className="section-title" style={{ marginBottom: 8 }}>Exponential Backoff</h2>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
            Each retry waits exponentially longer to avoid overwhelming a failing downstream transaction processor.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BACKOFF_SEQUENCE.map((delay, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', width: 64 }}>Attempt {i + 1}</span>
                <div style={{ flex: 1, height: 20, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'linear-gradient(to right, #2563eb, #60a5fa)',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'end',
                      paddingRight: 8,
                      width: `${(delay / 16) * 100}%`,
                      transition: 'width 0.4s ease'
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#ffffff' }}>{delay}s</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock style={{ width: 14, height: 14, color: '#94a3b8' }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Formula: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#2563eb' }}>2^(attempt-1) sec</code>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetryMonitor;
