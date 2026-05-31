import { useEffect, useState } from 'react';
import { Zap, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { getWorkerMonitoring } from '../services/api';

interface WorkerStats {
  active_workers: number;
  total_processed: number;
  success_rate: number;
  avg_processing_time_ms: number;
  throughput: number;
  current_load: number;
}

const WorkerMonitor = () => {
  const [stats, setStats] = useState<WorkerStats>({
    active_workers: 0,
    total_processed: 0,
    success_rate: 0,
    avg_processing_time_ms: 0,
    throughput: 0,
    current_load: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchWorkerData = async () => {
    try {
      const response = await getWorkerMonitoring();
      if (response) {
        setStats({
          active_workers: response.active_workers || 0,
          total_processed: response.total_processed || 0,
          success_rate: response.success_rate || 0,
          avg_processing_time_ms: response.avg_processing_time_ms || 0,
          throughput: response.throughput || 0,
          current_load: response.current_load || 0
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching worker data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerData();
    const interval = setInterval(fetchWorkerData, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 14, color: '#94a3b8' }}>
          Loading worker data...
        </div>
      </div>
    );
  }

  const statusColor = stats.active_workers > 0 ? '#10b981' : '#94a3b8';
  const statusBg = stats.active_workers > 0 ? '#f0fdf4' : '#f8fafc';
  const statusText = stats.active_workers > 0 ? '#047857' : '#475569';
  const statusLabel = stats.active_workers > 0 ? 'Active' : 'Idle';

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Worker Monitor</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Background worker cockpit — observe processing units</p>
      </div>

      {/* ── Overview Stats ──────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Active Workers</div>
          <div className="stat-value" style={{ color: stats.active_workers > 0 ? '#16a34a' : '#94a3b8' }}>
            {stats.active_workers}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Processed</div>
          <div className="stat-value">{stats.total_processed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Success Rate</div>
          <div className="stat-value" style={{ color: stats.success_rate >= 90 ? '#16a34a' : stats.success_rate >= 70 ? '#d97706' : '#dc2626' }}>
            {stats.success_rate.toFixed(1)}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Throughput</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {stats.throughput.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>msg/s</span>
          </div>
        </div>
      </div>

      {/* ── Worker Status Card ────────────────── */}
      <div className="card" style={{ overflow: 'hidden', maxWidth: 600 }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: stats.active_workers > 0 ? '#dbeafe' : '#f1f5f9',
            }}>
              <Zap style={{
                width: 18,
                height: 18,
                color: stats.active_workers > 0 ? '#2563eb' : '#64748b'
              }} />
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Payment Worker</h3>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: statusText }}>
                {statusLabel}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              className={stats.active_workers > 0 ? 'animate-pulse-green' : ''}
              style={{ width: 8, height: 8, borderRadius: 999, background: statusColor, display: 'inline-block' }}
            />
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stats.active_workers === 0 && (
            <div style={{
              padding: '16px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 8,
              fontSize: 13,
              color: '#92400e'
            }}>
              ⚠️ No active workers detected. Start a worker to process payments.
            </div>
          )}

          {stats.active_workers > 0 && stats.current_load > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current Load
                </p>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{stats.current_load} jobs</span>
              </div>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(to right, #2563eb, #60a5fa)',
                    borderRadius: 999,
                    width: `${Math.min((stats.current_load / 100) * 100, 100)}%`,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* Sub metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 14, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                <CheckCircle2 style={{ width: 12, height: 12, color: '#16a34a' }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{stats.total_processed}</p>
              <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Completed</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                <TrendingUp style={{ width: 12, height: 12, color: '#2563eb' }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{stats.success_rate.toFixed(1)}%</p>
              <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Success</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                <Clock style={{ width: 12, height: 12, color: '#d97706' }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{(stats.avg_processing_time_ms / 1000).toFixed(1)}s</p>
              <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Avg Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: 24,
        padding: '16px 20px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 12,
        fontSize: 13,
        color: '#1e40af',
        maxWidth: 600
      }}>
        <strong>💡 Tip:</strong> Start workers with: <code style={{ background: '#dbeafe', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>python3 -m app.workers.payment_worker</code>
      </div>
    </div>
  );
};

export default WorkerMonitor;

// Made with Bob
