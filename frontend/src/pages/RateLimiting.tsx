import { useState, useEffect } from 'react';
import { Gauge, Send, CheckCircle2, XCircle, RefreshCcw, Users, Globe } from 'lucide-react';
import { getRateLimitStats, getRateLimitUsers, getRateLimitIps, resetRateLimit } from '../services/api';

interface RequestLog {
  id: number;
  time: string;
  status: 'allowed' | 'rejected';
  remaining: number;
}

interface RateLimitStats {
  total_requests?: number;
  allowed_requests?: number;
  blocked_requests?: number;
  block_rate?: number;
  active_user_limits?: number;
  active_ip_limits?: number;
  redis_connected?: boolean;
  per_user_limit?: number;
  per_ip_limit?: number;
  window_seconds?: number;
}

interface RateLimitedUser {
  user_id?: string;
  current_requests?: number;
  ttl_seconds?: number;
}

interface RateLimitedIP {
  ip_address?: string;
  current_requests?: number;
  ttl_seconds?: number;
}

const MAX_REQUESTS = 100;
const RESET_PERIOD = 60; // seconds

const RateLimiting = () => {
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [users, setUsers] = useState<RateLimitedUser[]>([]);
  const [ips, setIPs] = useState<RateLimitedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mock state for demo
  const [remaining, setRemaining] = useState(76);
  const [resetTimer, setResetTimer] = useState(42);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [burstMode, setBurstMode] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, usersResponse, ipsResponse] = await Promise.all([
        getRateLimitStats(),
        getRateLimitUsers(20),
        getRateLimitIps(20)
      ]);

      if (statsResponse.status === 'success') {
        setStats(statsResponse.data);
      }

      if (usersResponse.status === 'success') {
        setUsers(usersResponse.data.users || []);
      }

      if (ipsResponse.status === 'success') {
        setIPs(ipsResponse.data.ips || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rate limit data');
      console.error('Error fetching rate limit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetUser = async (userId: string) => {
    if (!confirm(`Reset rate limit for user: ${userId}?`)) return;
    
    try {
      await resetRateLimit(userId, 'user');
      await fetchData();
    } catch (err: any) {
      alert(`Failed to reset: ${err.message}`);
    }
  };

  const handleResetIP = async (ip: string) => {
    if (!confirm(`Reset rate limit for IP: ${ip}?`)) return;
    
    try {
      await resetRateLimit(ip, 'ip');
      await fetchData();
    } catch (err: any) {
      alert(`Failed to reset: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reset timer countdown (mock)
  useEffect(() => {
    const interval = setInterval(() => {
      setResetTimer((t) => {
        if (t <= 1) {
          setRemaining(MAX_REQUESTS);
          return RESET_PERIOD;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Burst mode (mock)
  useEffect(() => {
    if (!burstMode) return;
    const interval = setInterval(() => {
      sendRequest();
    }, 200);
    return () => clearInterval(interval);
  }, [burstMode, remaining]);

  const sendRequest = () => {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });
    if (remaining > 0) {
      setRemaining((r) => r - 1);
      setLogs((prev) => [
        { id: Date.now(), time: now, status: 'allowed' as const, remaining: remaining - 1 },
        ...prev,
      ].slice(0, 30));
    } else {
      setLogs((prev) => [
        { id: Date.now(), time: now, status: 'rejected' as const, remaining: 0 },
        ...prev,
      ].slice(0, 30));
      setBurstMode(false);
    }
  };

  const handleSend = () => {
    setIsSending(true);
    sendRequest();
    setTimeout(() => setIsSending(false), 150);
  };

  const percentage = (remaining / MAX_REQUESTS) * 100;
  const barColor = percentage > 50 ? 'linear-gradient(to right, #10b981, #34d399)' :
                   percentage > 20 ? 'linear-gradient(to right, #f59e0b, #fbbf24)' :
                                     'linear-gradient(to right, #ef4444, #f87171)';

  const bucketGrad = percentage > 50 ? 'linear-gradient(to top, #10b981, #34d399)' :
                     percentage > 20 ? 'linear-gradient(to top, #f59e0b, #fbbf24)' :
                                       'linear-gradient(to top, #ef4444, #f87171)';

  const formatTTL = (seconds?: number): string => {
    if (typeof seconds !== 'number' || Number.isNaN(seconds)) return 'Unknown';
    if (seconds < 0) return 'Expired';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const safeNumber = (value: unknown, fallback = 0): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  };

  const getUserKey = (user: RateLimitedUser, index: number): string => {
    const userId = user.user_id?.trim();
    return userId ? `user-${userId}-${index}` : `user-unknown-${index}`;
  };

  const getIpKey = (ip: RateLimitedIP, index: number): string => {
    const ipAddress = ip.ip_address?.trim();
    return ipAddress ? `ip-${ipAddress}-${index}` : `ip-unknown-${index}`;
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Rate Limiting</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Real-time rate limit monitoring and interactive playground</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            background: '#ffffff',
            color: '#64748b',
            border: '1px solid #e2e8f0',
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Real Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Total Requests</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{safeNumber(stats.total_requests)}</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Allowed</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{safeNumber(stats.allowed_requests)}</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Blocked</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{safeNumber(stats.blocked_requests)}</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Block Rate</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{safeNumber(stats.block_rate).toFixed(1)}%</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Active Users</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#6366f1' }}>{safeNumber(stats.active_user_limits)}</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Active IPs</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6' }}>{safeNumber(stats.active_ip_limits)}</div>
          </div>
        </div>
      )}

      {/* ── Main Layout Split ───────────────────── */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left Column (Main Panel) */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 320 }}>
          {/* Requests Remaining Gauge */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#eff6ff'
                }}>
                  <Gauge style={{ width: 20, height: 20, color: '#2563eb' }} />
                </div>
                <div>
                  <h2 className="section-title">Demo: Requests Remaining</h2>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Interactive Playground</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
                  {remaining} <span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8' }}>/ {MAX_REQUESTS}</span>
                </p>
              </div>
            </div>

            {/* Gauge progress bar */}
            <div style={{ height: 10, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
              <div
                style={{
                  height: '100%',
                  background: barColor,
                  borderRadius: 999,
                  width: `${percentage}%`,
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </div>

            {/* Countdown reset stats */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                <RefreshCcw style={{ width: 14, height: 14, color: '#94a3b8' }} />
                Resets in <span style={{ fontWeight: 700, color: '#0f172a' }}>{resetTimer}s</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                Limit: {MAX_REQUESTS} req / {RESET_PERIOD}s
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: 'auto',
                padding: '10px 20px',
              }}
            >
              <Send style={{ width: 14, height: 14 }} />
              Send Request
            </button>

            <button
              onClick={() => setBurstMode(!burstMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: burstMode ? '#fee2e2' : '#f1f5f9',
                color: burstMode ? '#dc2626' : '#475569',
                border: burstMode ? '1px solid #fecaca' : '1px solid #e2e8f0',
              }}
            >
              {burstMode ? '⏹ Stop Burst' : '⚡ Burst Mode'}
            </button>

            <button
              onClick={() => { setRemaining(MAX_REQUESTS); setResetTimer(RESET_PERIOD); }}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: '#ffffff',
                color: '#64748b',
                border: '1px solid #e2e8f0',
              }}
            >
              Reset
            </button>
          </div>

          {/* Request Stream Logs */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 className="section-title">Demo Request Log</h2>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {logs.map((log, idx) => (
                <div
                  key={log.id + idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 20px',
                    borderBottom: idx < logs.length - 1 ? '1px solid #f8fafc' : 'none',
                  }}
                >
                  {log.status === 'allowed' ? (
                    <CheckCircle2 style={{ width: 16, height: 16, color: '#16a34a', flexShrink: 0 }} />
                  ) : (
                    <XCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#94a3b8', width: 70 }}>{log.time}</span>
                  <span className={`badge ${log.status === 'allowed' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                    {log.status === 'allowed' ? '200 OK' : '429 Too Many'}
                  </span>
                  <div style={{ marginLeft: 'auto' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{log.remaining} remaining</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#94a3b8' }}>
                  Send mock requests or toggle burst mode to feed logs.
                </div>
              )}
            </div>
          </div>

          {/* Rate Limited Users */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users style={{ width: 16, height: 16, color: '#6366f1' }} />
              <h2 className="section-title">Rate Limited Users</h2>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {users.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#94a3b8' }}>
                  No active user rate limits
                </div>
              ) : (
                <table style={{ width: '100%' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600 }}>User ID</th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600 }}>Requests</th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600 }}>TTL</th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={getUserKey(user, index)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 20px', fontSize: 12, fontFamily: 'var(--font-mono)', color: '#334155' }}>{user.user_id || 'unknown'}</td>
                        <td style={{ padding: '10px 20px', fontSize: 12, color: '#334155' }}>{safeNumber(user.current_requests)} / {safeNumber(stats?.per_user_limit, 100)}</td>
                        <td style={{ padding: '10px 20px', fontSize: 12, color: '#64748b' }}>{formatTTL(user.ttl_seconds)}</td>
                        <td style={{ padding: '10px 20px' }}>
                          <button
                            onClick={() => handleResetUser(user.user_id || 'unknown')}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: 'pointer',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                            }}
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Rate Limited IPs */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe style={{ width: 16, height: 16, color: '#8b5cf6' }} />
              <h2 className="section-title">Rate Limited IPs</h2>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {ips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#94a3b8' }}>
                  No active IP rate limits
                </div>
              ) : (
                <table style={{ width: '100%' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600 }}>IP Address</th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600 }}>Requests</th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600 }}>TTL</th>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ips.map((ip, index) => (
                      <tr key={getIpKey(ip, index)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 20px', fontSize: 12, fontFamily: 'var(--font-mono)', color: '#334155' }}>{ip.ip_address || 'unknown'}</td>
                        <td style={{ padding: '10px 20px', fontSize: 12, color: '#334155' }}>{safeNumber(ip.current_requests)} / {safeNumber(stats?.per_ip_limit, 200)}</td>
                        <td style={{ padding: '10px 20px', fontSize: 12, color: '#64748b' }}>{formatTTL(ip.ttl_seconds)}</td>
                        <td style={{ padding: '10px 20px' }}>
                          <button
                            onClick={() => handleResetIP(ip.ip_address || 'unknown')}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: 'pointer',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                            }}
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Info / Config / Visual Bucket) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 280 }}>
          {/* Instructions */}
          <div className="card" style={{ padding: 20 }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>How it Works</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              <p>
                <strong style={{ color: '#334155' }}>Sliding Window</strong> algorithm tracks requests in a time window and enforces limits per user and IP.
              </p>
              <p>
                When limits are exceeded, the API returns <code style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 4px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)' }}>429 Too Many Requests</code>.
              </p>
            </div>
          </div>

          {/* Config card details */}
          <div className="card" style={{ padding: 20 }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DetailRow label="User Limit" value={`${safeNumber(stats?.per_user_limit, 100)} req/min`} />
              <DetailRow label="IP Limit" value={`${safeNumber(stats?.per_ip_limit, 200)} req/min`} />
              <DetailRow label="Algorithm" value="Sliding Window" />
              <DetailRow label="Window Period" value={`${safeNumber(stats?.window_seconds, 60)}s`} />
            </div>
          </div>

          {/* Live Liquid Gauge Token Bucket */}
          <div className="card" style={{ padding: 20 }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>Demo Token Bucket</h3>
            <div style={{
              position: 'relative',
              width: '100%',
              height: 140,
              background: '#f8fafc',
              borderRadius: 12,
              border: '2px dashed #cbd5e1',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: bucketGrad,
                  height: `${percentage}%`,
                  transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderBottomLeftRadius: 10,
                  borderBottomRightRadius: 10,
                }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                  {remaining}
                </span>
              </div>
            </div>
          </div>

          {/* Redis Status */}
          {stats && (
            <div className="card" style={{ padding: 20 }}>
              <h3 className="section-title" style={{ marginBottom: 12 }}>System Status</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Redis Connection</span>
                <span className={`badge ${stats.redis_connected ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                  {stats.redis_connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{value}</span>
  </div>
);

export default RateLimiting;

// Made with Bob
