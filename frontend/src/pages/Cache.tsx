import { Database, Zap, TrendingUp, Server, AlertCircle } from 'lucide-react';

const Cache = () => {
  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Cache Monitor</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Redis cache performance and hit rate tracking</p>
      </div>

      {/* ── Coming Soon Notice ─────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 16,
        padding: '48px 40px',
        color: 'white',
        marginBottom: 32,
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56,
            height: 56,
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap style={{ width: 28, height: 28 }} />
          </div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Week 5: Caching Layer</h2>
            <p style={{ fontSize: 16, opacity: 0.9 }}>Coming Soon</p>
          </div>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.95, maxWidth: 600 }}>
          The caching layer will be implemented in Week 5 of the development plan. This will include Redis-based caching for payment lookups, reducing database load and improving response times.
        </p>
      </div>

      {/* ── What's Coming ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            background: '#dbeafe',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <Database style={{ width: 24, height: 24, color: '#2563eb' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Payment Caching</h3>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            Cache GET /payments/{'{id}'} responses in Redis to reduce database queries and improve response times.
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            background: '#dcfce7',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <TrendingUp style={{ width: 24, height: 24, color: '#16a34a' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Hit Rate Tracking</h3>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            Monitor cache hit/miss rates, track performance improvements, and identify optimization opportunities.
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            background: '#fef3c7',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <Server style={{ width: 24, height: 24, color: '#d97706' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Cache Invalidation</h3>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            Implement smart cache invalidation strategies to ensure data consistency when payments are updated.
          </p>
        </div>
      </div>

      {/* ── Implementation Plan ────────────────── */}
      <div className="card" style={{ padding: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Week 5 Implementation Plan</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
            <div style={{
              width: 32,
              height: 32,
              background: '#eff6ff',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontWeight: 700,
              color: '#2563eb',
              fontSize: 14
            }}>1</div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Add Cache Layer</h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Implement Redis caching for payment GET requests with configurable TTL (Time To Live).
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
            <div style={{
              width: 32,
              height: 32,
              background: '#eff6ff',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontWeight: 700,
              color: '#2563eb',
              fontSize: 14
            }}>2</div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Cache Invalidation</h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Invalidate cache entries when payment status changes to maintain data consistency.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
            <div style={{
              width: 32,
              height: 32,
              background: '#eff6ff',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontWeight: 700,
              color: '#2563eb',
              fontSize: 14
            }}>3</div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Monitoring Dashboard</h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Build this dashboard to track cache performance, hit rates, and latency improvements.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
            <div style={{
              width: 32,
              height: 32,
              background: '#eff6ff',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontWeight: 700,
              color: '#2563eb',
              fontSize: 14
            }}>4</div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Load Testing</h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Measure performance improvements with and without caching to validate effectiveness.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Current Status ─────────────────────── */}
      <div style={{
        marginTop: 24,
        padding: '16px 20px',
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'start',
        gap: 12
      }}>
        <AlertCircle style={{ width: 20, height: 20, color: '#d97706', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6, marginBottom: 8 }}>
            <strong>Current Status:</strong> You've completed Weeks 1-4 (Core APIs, Queue, Retry/DLQ, Idempotency, Rate Limiting).
          </p>
          <p style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
            <strong>Next Step:</strong> Run load tests to identify bottlenecks, then implement caching in Week 5 based on the results.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cache;

// Made with Bob
