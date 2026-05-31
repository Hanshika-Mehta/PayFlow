import { useState, useEffect } from 'react';
import { Database, ArrowRight, Layers, TrendingUp, Clock } from 'lucide-react';
import { getQueueMonitoring, getQueueContentsReal } from '../services/api';

interface QueueItem {
  id: string;
  status: 'waiting' | 'processing';
  addedAt: string;
  priority: number;
}

interface QueueStats {
  pending_count: number;
  processing_count: number;
  total_processed: number;
  lag_seconds: number;
  throughput: number;
}

const QueueMonitor = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    pending_count: 0,
    processing_count: 0,
    total_processed: 0,
    lag_seconds: 0,
    throughput: 0
  });
  const [depthHistory, setDepthHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);

  // Fetch real queue data
  const fetchQueueData = async () => {
    try {
      const [monitoringResponse, contentsResponse] = await Promise.all([
        getQueueMonitoring(),
        getQueueContentsReal()
      ]);

      // Update stats
      if (monitoringResponse) {
        setStats({
          pending_count: monitoringResponse.pending_count || 0,
          processing_count: monitoringResponse.processing_count || 0,
          total_processed: monitoringResponse.total_processed || 0,
          lag_seconds: monitoringResponse.lag_seconds || 0,
          throughput: monitoringResponse.throughput || 0
        });
      }

      // Update queue items
      if (contentsResponse && contentsResponse.queue_items) {
        const items: QueueItem[] = contentsResponse.queue_items.map((item: any, index: number) => ({
          id: item.payment_id || `pay_${Date.now()}_${index}`,
          status: index === 0 ? 'processing' : 'waiting',
          addedAt: item.added_at || new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 8),
          priority: index + 1
        }));
        setQueue(items.slice(0, 8)); // Show max 8 items
      }

      // Update depth history
      setDepthHistory(prev => {
        const newHistory = [...prev.slice(-9), monitoringResponse?.pending_count || 0];
        return newHistory;
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching queue data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const activeCount = stats.pending_count;
  const processingCount = stats.processing_count;

  if (loading) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 14, color: '#94a3b8' }}>
          Loading queue data...
        </div>
      </div>
    );
  }

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
              {stats.throughput.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>msg/s</span>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#dcfce7' }}>
            <Clock style={{ width: 18, height: 18, color: '#16a34a' }} />
          </div>
          <div>
            <div className="stat-label">Queue Lag</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {stats.lag_seconds.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>sec</span>
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <Database style={{ width: 18, height: 18, color: '#d97706' }} />
          </div>
          <div>
            <div className="stat-label">Total Processed</div>
            <div className="stat-value">{stats.total_processed}</div>
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
            {depthHistory.map((val, i) => {
              const maxVal = Math.max(...depthHistory, 1);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                  <div
                    style={{
                      width: '100%',
                      background: 'linear-gradient(to top, #2563eb, #60a5fa)',
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      height: `${(val / maxVal) * 100}%`,
                      transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      minHeight: val > 0 ? '4px' : '0'
                    }}
                  />
                  <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{val}</span>
                </div>
              );
            })}
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

// Made with Bob
