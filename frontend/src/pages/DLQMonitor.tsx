import { useState, useEffect } from 'react';
import { Skull, AlertTriangle, RefreshCw, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import api from '../services/api';

interface DLQMessage {
  event_id: string;
  payment_id: string;
  user_id: string;
  amount: number;
  error_message: string;
  error_type: string;
  retry_count: number;
  moved_to_dlq_at: string;
}

interface DLQStats {
  dlq_name: string;
  total_messages: number;
  error_type_distribution: Record<string, number>;
  recent_messages: DLQMessage[];
}

const DLQMonitor = () => {
  const [stats, setStats] = useState<DLQStats | null>(null);
  const [messages, setMessages] = useState<DLQMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Fetch DLQ stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/monitoring/dlq/stats');
      setStats(response.data);
      setMessages(response.data.recent_messages || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch DLQ statistics');
      console.error('Error fetching DLQ stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Retry a payment from DLQ
  const retryPayment = async (paymentId: string) => {
    try {
      setRetrying(paymentId);
      await api.post(`/monitoring/dlq/${paymentId}/retry`);
      // Refresh stats after retry
      await fetchStats();
    } catch (err) {
      console.error('Error retrying payment:', err);
      alert('Failed to retry payment');
    } finally {
      setRetrying(null);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <Skull className="animate-pulse" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          <p>Loading DLQ statistics...</p>
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

  const totalMessages = stats?.total_messages || 0;
  const errorTypes = stats?.error_type_distribution || {};

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skull style={{ width: 24, height: 24, color: '#ef4444' }} />
            Dead Letter Queue
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>
            Failed payments that exceeded maximum retry attempts
          </p>
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
          <div className="stat-label">Total in DLQ</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {totalMessages}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Error Types</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {Object.keys(errorTypes).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Recent Messages</div>
          <div className="stat-value">{messages.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div className="stat-value" style={{ color: totalMessages > 10 ? '#ef4444' : '#16a34a', fontSize: 16 }}>
            {totalMessages > 10 ? 'Critical' : 'Normal'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* DLQ Messages List */}
        <div className="card" style={{ flex: 2, minWidth: 320, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skull style={{ width: 16, height: 16, color: '#64748b' }} />
              <h2 className="section-title">Failed Payments</h2>
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {messages.length} messages
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 style={{ width: 32, height: 32, margin: '0 auto 12px', color: '#16a34a' }} />
                <p>No messages in DLQ</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>All payments are processing successfully!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.event_id}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    borderBottom: index < messages.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  {/* Error Icon */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    flexShrink: 0,
                  }}>
                    <XCircle style={{ width: 18, height: 18, color: '#dc2626' }} />
                  </div>

                  {/* Payment Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#334155' }}>
                        {msg.payment_id.substring(0, 13)}...
                      </code>
                      <span className="badge badge-red" style={{ fontSize: 9 }}>
                        {msg.retry_count} retries
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', fontSize: 11, fontWeight: 500 }}>
                      <AlertTriangle style={{ width: 12, height: 12 }} />
                      {msg.error_type}: {msg.error_message}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                      Moved to DLQ: {formatDate(msg.moved_to_dlq_at)}
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      ${msg.amount.toFixed(2)}
                    </p>
                    <p style={{ fontSize: 10, color: '#94a3b8' }}>{msg.user_id}</p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => retryPayment(msg.payment_id)}
                      disabled={retrying === msg.payment_id}
                      style={{
                        padding: '6px 12px',
                        background: retrying === msg.payment_id ? '#f1f5f9' : '#dcfce7',
                        color: retrying === msg.payment_id ? '#94a3b8' : '#15803d',
                        border: retrying === msg.payment_id ? '1px solid #e2e8f0' : '1px solid #bbf7d0',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: retrying === msg.payment_id ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (retrying !== msg.payment_id) {
                          e.currentTarget.style.background = '#bbf7d0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (retrying !== msg.payment_id) {
                          e.currentTarget.style.background = '#dcfce7';
                        }
                      }}
                    >
                      <RefreshCw 
                        className={retrying === msg.payment_id ? 'animate-spin' : ''}
                        style={{ width: 12, height: 12 }} 
                      />
                      Retry
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Error Type Distribution */}
        <div className="card" style={{ flex: 1, minWidth: 280, padding: 24 }}>
          <h2 className="section-title" style={{ marginBottom: 16 }}>Error Distribution</h2>
          
          {Object.keys(errorTypes).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
              <p style={{ fontSize: 12 }}>No errors recorded</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(errorTypes)
                .sort(([, a], [, b]) => b - a)
                .map(([errorType, count]) => {
                  const maxCount = Math.max(...Object.values(errorTypes));
                  const percentage = (count / maxCount) * 100;
                  
                  return (
                    <div key={errorType}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                          {errorType}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                          {count}
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            background: 'linear-gradient(to right, #ef4444, #f87171)',
                            borderRadius: 999,
                            width: `${percentage}%`,
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle style={{ width: 14, height: 14, color: '#f59e0b', marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  About DLQ
                </p>
                <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  Payments in the DLQ have exceeded the maximum retry limit (3 attempts). 
                  They require manual intervention or investigation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DLQMonitor;

// Made with Bob
