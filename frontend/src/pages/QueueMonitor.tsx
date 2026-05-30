import { useState, useEffect } from 'react';
import { Database, ArrowRight, Layers, TrendingUp, Clock } from 'lucide-react';

interface QueueItem {
  id: string;
  status: 'waiting' | 'processing' | 'consumed';
  addedAt: string;
  priority: number;
}

const INITIAL_QUEUE: QueueItem[] = [
  { id: 'pay_1715751111111', status: 'processing', addedAt: '10:30:15', priority: 1 },
  { id: 'pay_1715752222222', status: 'waiting', addedAt: '10:30:16', priority: 2 },
  { id: 'pay_1715753333333', status: 'waiting', addedAt: '10:30:17', priority: 3 },
  { id: 'pay_1715754444444', status: 'waiting', addedAt: '10:30:18', priority: 4 },
];

const QueueMonitor = () => {
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [throughput, setThroughput] = useState(12.5);
  const [totalProcessed, setTotalProcessed] = useState(47);
  const [depthHistory, setDepthHistory] = useState([3, 5, 4, 6, 3, 4, 5, 3, 2, 4]);

  // Simulate queue activity
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue((prev) => {
        const updated = prev.map((item) => {
          if (item.status === 'processing') return { ...item, status: 'consumed' as const };
          return item;
        });
        const nextWaiting = updated.findIndex((i) => i.status === 'waiting');
        if (nextWaiting !== -1) updated[nextWaiting].status = 'processing';
        // Add new item sometimes
        if (Math.random() > 0.5) {
          updated.push({
            id: `pay_${Date.now()}`,
            status: 'waiting',
            addedAt: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 8),
            priority: updated.length + 1,
          });
        }
        return updated.filter((i) => i.status !== 'consumed').slice(-8);
      });
      setThroughput((t) => +(t + (Math.random() * 2 - 1)).toFixed(1));
      setTotalProcessed((t) => t + 1);
      setDepthHistory((h) => [...h.slice(-9), Math.floor(Math.random() * 6) + 1]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = queue.filter((q) => q.status === 'waiting').length;
  const processingCount = queue.filter((q) => q.status === 'processing').length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Queue Monitor</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Real-time Redis Stream queue visualization</p>
      </div>

      {/* ── Stats Cards ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#f3e8ff' }}>
            <Layers style={{ width: 18, height: 18, color: '#7c3aed' }} />
          </div>
          <div>
            <div className="stat-label">Queue Depth</div>
            <div className="stat-value">{activeCount + processingCount}</div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <TrendingUp style={{ width: 18, height: 18, color: '#2563eb' }} />
          </div>
          <div>
            <div className="stat-label">Throughput</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {throughput} <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>msg/s</span>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#dcfce7' }}>
            <Clock style={{ width: 18, height: 18, color: '#16a34a' }} />
          </div>
          <div>
            <div className="stat-label">Avg Wait</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              1.2 <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>sec</span>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <Database style={{ width: 18, height: 18, color: '#d97706' }} />
          </div>
          <div>
            <div className="stat-label">Total Processed</div>
            <div className="stat-value">{totalProcessed}</div>
          </div>
        </div>
      </div>

      {/* ── Main Layout Split ───────────────────── */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Pipeline Visualization */}
        <div className="card" style={{ flex: 2, padding: 24, minWidth: 320 }}>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Queue Pipeline</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Producer Block */}
            <div style={{ width: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 76,
                height: 76,
                background: '#eff6ff',
                border: '2px solid #bfdbfe',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.08)',
              }}>
                <ArrowRight style={{ width: 24, height: 24, color: '#2563eb', marginBottom: 4 }} />
                <span style={{ fontSize: 9, fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.05em' }}>PRODUCER</span>
              </div>
            </div>

            {/* Pipeline Stream List */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="animate-fade-in"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: item.status === 'processing' ? '1px solid #c084fc' : '1px solid #fcd34d',
                    background: item.status === 'processing' ? '#faf5ff' : '#fffbeb',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    transition: 'all 0.4s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      className={item.status === 'processing' ? 'animate-pulse-green' : ''}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: item.status === 'processing' ? '#a855f7' : '#f59e0b',
                        display: 'inline-block'
                      }}
                    />
                    <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#334155' }}>{item.id}</code>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`badge ${item.status === 'processing' ? 'badge-purple' : 'badge-amber'}`}>
                      {item.status === 'processing' ? 'CONSUMING' : 'WAITING'}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{item.addedAt}</span>
                  </div>
                </div>
              ))}
              {queue.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 14, color: '#94a3b8' }}>
                  Queue buffer is currently empty.
                </div>
              )}
            </div>

            {/* Consumer Block */}
            <div style={{ width: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 76,
                height: 76,
                background: '#f0fdf4',
                border: '2px solid #bbf7d0',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(34, 197, 94, 0.08)',
              }}>
                <Layers style={{ width: 24, height: 24, color: '#16a34a', marginBottom: 4 }} />
                <span style={{ fontSize: 9, fontWeight: 800, color: '#15803d', letterSpacing: '0.05em' }}>CONSUMER</span>
              </div>
            </div>
          </div>
        </div>

        {/* Depth Chart Column */}
        <div className="card" style={{ flex: 1, padding: 24, minWidth: 260 }}>
          <h2 className="section-title" style={{ marginBottom: 16 }}>Queue Depth (30s)</h2>
          <div style={{ height: 160, display: 'flex', alignItems: 'end', gap: 6, marginBottom: 16 }}>
            {depthHistory.map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    background: 'linear-gradient(to top, #2563eb, #60a5fa)',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    height: `${(val / 8) * 100}%`,
                    transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
                <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Avg Queue Depth</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
              {(depthHistory.reduce((a, b) => a + b, 0) / depthHistory.length).toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueMonitor;
