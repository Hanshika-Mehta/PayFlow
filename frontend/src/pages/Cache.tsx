import { useState } from 'react';
import { Database, Zap, Search, Clock, TrendingUp, Server } from 'lucide-react';

interface CacheEntry {
  key: string;
  hit: boolean;
  latency: number;
  source: 'cache' | 'database';
  time: string;
}

const Cache = () => {
  const [hits, setHits] = useState(142);
  const [misses, setMisses] = useState(23);
  const [entries, setEntries] = useState<CacheEntry[]>([
    { key: 'pay_1715751234567', hit: true, latency: 2, source: 'cache', time: '10:30:21' },
    { key: 'pay_1715752345678', hit: false, latency: 210, source: 'database', time: '10:30:18' },
    { key: 'pay_1715753456789', hit: true, latency: 3, source: 'cache', time: '10:30:15' },
    { key: 'pay_1715751234567', hit: true, latency: 1, source: 'cache', time: '10:30:12' },
    { key: 'pay_1715754567890', hit: false, latency: 185, source: 'database', time: '10:30:09' },
  ]);
  const [lookupKey, setLookupKey] = useState('pay_1715751234567');
  const [isLooking, setIsLooking] = useState(false);
  const [lastResult, setLastResult] = useState<CacheEntry | null>(null);

  const hitRatio = hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(1) : '0.0';

  const performLookup = () => {
    setIsLooking(true);
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });

    // First lookup is miss, subsequent are hits
    const existsInCache = entries.some((e) => e.key === lookupKey && e.source === 'cache');
    const isHit = existsInCache || Math.random() > 0.4;

    setTimeout(() => {
      const entry: CacheEntry = {
        key: lookupKey,
        hit: isHit,
        latency: isHit ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 150) + 100,
        source: isHit ? 'cache' : 'database',
        time: now,
      };
      setEntries((prev) => [entry, ...prev].slice(0, 20));
      if (isHit) setHits((h) => h + 1);
      else setMisses((m) => m + 1);
      setLastResult(entry);
      setIsLooking(false);
    }, isHit ? 50 : 500);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Cache</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Redis caching layer — hit/miss visualization</p>
      </div>

      {/* ── Stats Cards ─────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#dcfce7' }}>
            <Zap style={{ width: 18, height: 18, color: '#16a34a' }} />
          </div>
          <div>
            <div className="stat-label">Cache Hits</div>
            <div className="stat-value" style={{ color: '#16a34a' }}>{hits}</div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#fee2e2' }}>
            <Database style={{ width: 18, height: 18, color: '#ef4444' }} />
          </div>
          <div>
            <div className="stat-label">Cache Misses</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{misses}</div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <TrendingUp style={{ width: 18, height: 18, color: '#2563eb' }} />
          </div>
          <div>
            <div className="stat-label">Hit Ratio</div>
            <div className="stat-value" style={{ color: '#2563eb' }}>{hitRatio}%</div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stat-icon" style={{ background: '#f5f3ff' }}>
            <Clock style={{ width: 18, height: 18, color: '#7c3aed' }} />
          </div>
          <div>
            <div className="stat-label">Avg Latency</div>
            <div className="stat-value">
              {entries.length > 0 ? Math.round(entries.reduce((a, e) => a + e.latency, 0) / entries.length) : 0}
              <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout Split ───────────────────── */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left Column (Forms & Comparison) */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 320 }}>
          {/* Cache GET form lookup */}
          <div className="card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>Cache Lookup</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8' }} />
                <input
                  className="form-input"
                  type="text"
                  value={lookupKey}
                  onChange={(e) => setLookupKey(e.target.value)}
                  placeholder="Enter payment ID..."
                  style={{ paddingLeft: 34, fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <button
                onClick={performLookup}
                disabled={isLooking}
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 24px' }}
              >
                {isLooking ? 'Looking up...' : 'GET'}
              </button>
            </div>

            {/* Cache lookup result banner */}
            {lastResult && (
              <div
                className="animate-slide-up"
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 10,
                  border: lastResult.hit ? '1px solid #bbf7d0' : '1px solid #fde68a',
                  background: lastResult.hit ? '#f0fdf4' : '#fffbeb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  {lastResult.hit ? (
                    <Zap style={{ width: 16, height: 16, color: '#16a34a' }} />
                  ) : (
                    <Server style={{ width: 16, height: 16, color: '#d97706' }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 700, color: lastResult.hit ? '#15803d' : '#b45309' }}>
                    Cache {lastResult.hit ? 'HIT ⚡' : 'MISS → DB Query'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#475569' }}>
                  Response time: <span style={{ fontWeight: 700, color: '#0f172a' }}>{lastResult.latency}ms</span>
                  {!lastResult.hit && <span style={{ color: '#94a3b8', marginLeft: 8 }}>(cached for subsequent lookups)</span>}
                </p>
              </div>
            )}
          </div>

          {/* Latency Comparison Card */}
          <div className="card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ marginBottom: 16 }}>Latency Comparison</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap style={{ width: 14, height: 14, color: '#16a34a' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Redis Cache</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>~2ms</span>
                </div>
                <div style={{ height: 16, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(to right, #10b981, #34d399)', borderRadius: 6, width: '2%' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Database style={{ width: 14, height: 14, color: '#d97706' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Database Query</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>~210ms</span>
                </div>
                <div style={{ height: 16, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(to right, #f59e0b, #fbbf24)', borderRadius: 6, width: '100%' }} />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 16, paddingTop: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Performance Gain</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>
                105x <span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8' }}>faster</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (History List) */}
        <div className="card" style={{ flex: 1, overflow: 'hidden', minWidth: 260 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 className="section-title">Lookup History</h2>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {entries.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  borderBottom: idx < entries.length - 1 ? '1px solid #f8fafc' : 'none'
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: entry.hit ? '#f0fdf4' : '#fffbeb',
                  border: entry.hit ? '1px solid #bbf7d0' : '1px solid #fde68a',
                  flexShrink: 0,
                }}>
                  {entry.hit ? (
                    <Zap style={{ width: 14, height: 14, color: '#16a34a' }} />
                  ) : (
                    <Database style={{ width: 14, height: 14, color: '#d97706' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>{entry.key}</code>
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginTop: 2 }}>{entry.time}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: entry.hit ? '#16a34a' : '#d97706' }}>
                  {entry.latency}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cache;
