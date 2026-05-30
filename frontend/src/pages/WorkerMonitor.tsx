import { useState, useEffect } from 'react';
import { Zap, CheckCircle2, Clock, Pause, Play, TrendingUp } from 'lucide-react';

interface Worker {
  id: number;
  name: string;
  status: 'online' | 'processing' | 'idle' | 'paused';
  currentJob: string | null;
  jobsCompleted: number;
  successRate: number;
  elapsed: number;
  avgLatency: number;
}

const INITIAL_WORKERS: Worker[] = [
  { id: 1, name: 'Worker 1', status: 'processing', currentJob: 'pay_1715751234567', jobsCompleted: 47, successRate: 97.8, elapsed: 2.8, avgLatency: 3.2 },
  { id: 2, name: 'Worker 2', status: 'idle', currentJob: null, jobsCompleted: 42, successRate: 95.2, elapsed: 0, avgLatency: 3.8 },
  { id: 3, name: 'Worker 3', status: 'processing', currentJob: 'pay_1715752345678', jobsCompleted: 38, successRate: 98.1, elapsed: 1.4, avgLatency: 2.9 },
];

const WorkerMonitor = () => {
  const [workers, setWorkers] = useState(INITIAL_WORKERS);
  const [totalJobs, setTotalJobs] = useState(127);

  // Simulate worker activity
  useEffect(() => {
    const interval = setInterval(() => {
      setWorkers((prev) =>
        prev.map((w) => {
          if (w.status === 'paused') return w;
          if (w.status === 'processing') {
            const newElapsed = +(w.elapsed + 0.5).toFixed(1);
            if (newElapsed > 5) {
              return { ...w, status: 'idle' as const, currentJob: null, elapsed: 0, jobsCompleted: w.jobsCompleted + 1 };
            }
            return { ...w, elapsed: newElapsed };
          }
          if (w.status === 'idle' && Math.random() > 0.5) {
            return { ...w, status: 'processing' as const, currentJob: `pay_${Date.now()}`, elapsed: 0 };
          }
          return w;
        })
      );
      setTotalJobs((t) => t + (Math.random() > 0.7 ? 1 : 0));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const toggleWorker = (id: number) => {
    setWorkers((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.status === 'paused') return { ...w, status: 'idle' as const };
        return { ...w, status: 'paused' as const, currentJob: null, elapsed: 0 };
      })
    );
  };

  const statusConfig = {
    online: { color: '#10b981', text: '#047857', bg: '#f0fdf4', label: 'Online' },
    processing: { color: '#3b82f6', text: '#1d4ed8', bg: '#eff6ff', label: 'Processing' },
    idle: { color: '#94a3b8', text: '#475569', bg: '#f8fafc', label: 'Idle' },
    paused: { color: '#f59e0b', text: '#b45309', bg: '#fffbeb', label: 'Paused' },
  };

  const activeWorkers = workers.filter((w) => w.status !== 'paused').length;
  const processingWorkers = workers.filter((w) => w.status === 'processing').length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Worker Monitor</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Background worker cockpit — observe and control processing units</p>
      </div>

      {/* ── Overview Stats ──────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Workers</div>
          <div className="stat-value">{workers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{activeWorkers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Processing Now</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>{processingWorkers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Jobs</div>
          <div className="stat-value">{totalJobs}</div>
        </div>
      </div>

      {/* ── Worker Cockpit Cards ────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {workers.map((w) => {
          const cfg = statusConfig[w.status];
          return (
            <div key={w.id} className="card" style={{ overflow: 'hidden' }}>
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
                    background: w.status === 'processing' ? '#dbeafe' : w.status === 'paused' ? '#fef3c7' : '#f1f5f9',
                  }}>
                    <Zap style={{
                      width: 18,
                      height: 18,
                      color: w.status === 'processing' ? '#2563eb' : w.status === 'paused' ? '#d97706' : '#64748b'
                    }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{w.name}</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: cfg.text }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className={w.status === 'processing' ? 'animate-pulse-green' : ''}
                    style={{ width: 8, height: 8, borderRadius: 999, background: cfg.color, display: 'inline-block' }}
                  />
                  <button
                    onClick={() => toggleWorker(w.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    {w.status === 'paused' ? (
                      <Play style={{ width: 14, height: 14, color: '#16a34a' }} />
                    ) : (
                      <Pause style={{ width: 14, height: 14, color: '#d97706' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Body Content */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {w.currentJob && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      Current Job
                    </p>
                    <code style={{ fontSize: 11, color: '#2563eb', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{w.currentJob}</code>
                  </div>
                )}

                {w.status === 'processing' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Progress
                      </p>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{w.elapsed}s / 5.0s</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          background: 'linear-gradient(to right, #2563eb, #60a5fa)',
                          borderRadius: 999,
                          width: `${Math.min((w.elapsed / 5) * 100, 100)}%`,
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
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{w.jobsCompleted}</p>
                    <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Completed</p>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                      <TrendingUp style={{ width: 12, height: 12, color: '#2563eb' }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{w.successRate}%</p>
                    <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Success</p>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                      <Clock style={{ width: 12, height: 12, color: '#d97706' }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{w.avgLatency}s</p>
                    <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Avg Time</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkerMonitor;
