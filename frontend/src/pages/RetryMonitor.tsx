import { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import api from '../services/api';

interface RetryStats {
  total_payments_with_retries: number;
  retry_count_distribution: Record<string, number>;
  pending_retry: number;
  ready_for_retry: number;
  average_retry_count: number;
  error_type_distribution: Record<string, number>;
  recent_failures: Array<{
    payment_id: string;
    user_id: string;
    amount: number;
    retry_count: number;
    error_type: string;
    last_error: string;
    next_retry_at: string | null;
    updated_at: string;
  }>;
  recent_recoveries: Array<{
    payment_id: string;
    user_id: string;
    amount: number;
    retry_count: number;
    recovered_at: string;
    created_at: string;
  }>;
  total_recoveries: number;
}

const BACKOFF_SEQUENCE = [1, 2, 4, 8, 16];

const RetryMonitor = () => {
  const [stats, setStats] = useState<RetryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch retry stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/monitoring/retry-stats');
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch retry statistics');
      console.error('Error fetching retry stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculateCountdown = (nextRetryAt: string | null): number => {
    if (!nextRetryAt) return 0;
    const now = new Date().getTime();
    const retryTime = new Date(nextRetryAt).getTime();
    const diff = Math.max(0, Math.ceil((retryTime - now) / 1000));
    return diff;
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <RotateCcw className="animate-spin-slow" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          <p>Loading retry statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
        <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>
          <AlertTriangle style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          <p>{error}</p>
          <button
            onClick={fetchStats}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalRetries = stats?.total_payments_with_retries || 0;
  const activeRetries = stats?.pending_retry || 0;
  const readyForRetry = stats?.ready_for_retry || 0;
  const avgRetryCount = stats?.average_retry_count || 0;
  const recentFailures = stats?.recent_failures || [];
  const recentRecoveries = stats?.recent_recoveries || [];
  const totalRecoveries = stats?.total_recoveries || 0;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Retry Monitor</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Exponential backoff and retry visualization</p>
        </div>
        <button
          onClick={fetchStats}
          style={{
            padding: '8px 16px',
            background: '#eff6ff',
            color: '#3b82f6',
            border: '1px solid #dbeafe',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Pending Retry</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {activeRetries}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ready for Retry</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{readyForRetry}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total with Retries</div>
          <div className="stat-value">{totalRetries}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Retry Count</div>
          <div className="stat-value" style={{ color: '#6366f1' }}>
            {avgRetryCount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Main Layout Split */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Recent Failures List */}
        <div className="card" style={{ flex: 2, minWidth: 320, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <RotateCcw style={{ width: 16, height: 16, color: '#64748b' }} />
            <h2 className="section-title">Recent Failures</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentFailures.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                <p>No recent failures</p>
              </div>
            ) : (
              recentFailures.map((failure, index) => {
                const countdown = calculateCountdown(failure.next_retry_at);
                const maxRetries = 3;
                
                return (
                  <div
                    key={failure.payment_id}
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      borderBottom: index < recentFailures.length - 1 ? '1px solid #f1f5f9' : 'none',
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
                      background: countdown > 0 ? '#fffbeb' : '#fee2e2',
                      border: countdown > 0 ? '1px solid #fde68a' : '1px solid #fecaca',
                      flexShrink: 0,
                    }}>
                      {countdown > 0 ? (
                        <RotateCcw
                          className={countdown <= 2 ? 'animate-spin-slow' : ''}
                          style={{ width: 18, height: 18, color: '#d97706' }}
                        />
                      ) : (
                        <XCircle style={{ width: 18, height: 18, color: '#dc2626' }} />
                      )}
                    </div>

                    {/* ID and Error info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#334155' }}>
                        {failure.payment_id.substring(0, 13)}...
                      </code>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, color: '#dc2626', fontSize: 11, fontWeight: 500 }}>
                        <AlertTriangle style={{ width: 12, height: 12 }} />
                        {failure.error_type || 'Unknown Error'}
                      </div>
                    </div>

                    {/* Attempt counter */}
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {failure.retry_count} / {maxRetries}
                      </p>
                      <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>attempt</p>
                    </div>

                    {/* Countdown or status */}
                    <div style={{ width: 90, textAlign: 'center' }}>
                      {countdown > 0 ? (
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{countdown}s</p>
                          <div style={{ height: 4, background: '#f1f5f9', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                background: '#d97706',
                                borderRadius: 999,
                                width: `${Math.min(100, (countdown / 60) * 100)}%`,
                                transition: 'width 1s linear'
                              }}
                            />
                          </div>
                        </div>
                      ) : failure.retry_count >= maxRetries ? (
                        <span className="badge badge-red">Max Retries</span>
                      ) : (
                        <span className="badge badge-yellow">Ready</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Successful Recoveries */}
        {recentRecoveries.length > 0 && (
          <div className="card" style={{ flex: 2, minWidth: 320, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 style={{ width: 16, height: 16, color: '#16a34a' }} />
                <h2 className="section-title">Successful Recoveries</h2>
              </div>
              <span className="badge" style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                {totalRecoveries} total
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentRecoveries.map((recovery, index) => {
                const createdTime = new Date(recovery.created_at);
                const recoveredTime = new Date(recovery.recovered_at);
                const timeDiff = Math.round((recoveredTime.getTime() - createdTime.getTime()) / 1000);
                
                return (
                  <div
                    key={recovery.payment_id}
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      borderBottom: index < recentRecoveries.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    {/* Success icon */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#dcfce7',
                      border: '1px solid #bbf7d0',
                      flexShrink: 0,
                    }}>
                      <CheckCircle2 style={{ width: 18, height: 18, color: '#16a34a' }} />
                    </div>

                    {/* Payment ID */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#334155' }}>
                        {recovery.payment_id.substring(0, 13)}...
                      </code>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, color: '#16a34a', fontSize: 11, fontWeight: 500 }}>
                        <TrendingUp style={{ width: 12, height: 12 }} />
                        Recovered after {recovery.retry_count} {recovery.retry_count === 1 ? 'retry' : 'retries'}
                      </div>
                    </div>

                    {/* Retry count badge */}
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                        {recovery.retry_count}
                      </p>
                      <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                        {recovery.retry_count === 1 ? 'retry' : 'retries'}
                      </p>
                    </div>

                    {/* Time to recover */}
                    <div style={{ width: 90, textAlign: 'center' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                        {timeDiff < 60 ? `${timeDiff}s` : `${Math.round(timeDiff / 60)}m`}
                      </p>
                      <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                        to recover
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Right Column: Stats and Backoff Panel */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Error Type Distribution */}
          {stats && Object.keys(stats.error_type_distribution).length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <h2 className="section-title" style={{ marginBottom: 16 }}>Error Types</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(stats.error_type_distribution).map(([errorType, count]) => (
                  <div key={errorType} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {errorType}
                    </span>
                    <div style={{ flex: 1, height: 20, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          background: 'linear-gradient(to right, #ef4444, #f87171)',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'end',
                          paddingRight: 8,
                          width: `${(count / Math.max(...Object.values(stats.error_type_distribution))) * 100}%`,
                        }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#ffffff' }}>{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backoff Panel */}
          <div className="card" style={{ padding: 24 }}>
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
    </div>
  );
};

export default RetryMonitor;

// Made with Bob
