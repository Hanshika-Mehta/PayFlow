import { useEffect, useState } from 'react';
import { getIdempotencyStats, getIdempotencyKeys, deleteIdempotencyKey } from '../services/api';
import { Database, CheckCircle, TrendingUp, Archive, RefreshCw, Trash2 } from 'lucide-react';

interface IdempotencyStats {
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  hit_rate: number;
  total_cached_responses: number;
  currently_processing: number;
  redis_connected: boolean;
}

interface IdempotencyKey {
  idempotency_key: string;
  ttl_seconds: number;
  has_response: boolean;
  redis_key: string;
}

export default function Idempotency() {
  const [stats, setStats] = useState<IdempotencyStats | null>(null);
  const [keys, setKeys] = useState<IdempotencyKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, keysResponse] = await Promise.all([
        getIdempotencyStats(),
        getIdempotencyKeys(50)
      ]);

      if (statsResponse.status === 'success') {
        setStats(statsResponse.data);
      }

      if (keysResponse.status === 'success') {
        setKeys(keysResponse.data.keys || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch idempotency data');
      console.error('Error fetching idempotency data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`Are you sure you want to delete idempotency key: ${key}?`)) {
      return;
    }

    try {
      setDeleteLoading(key);
      await deleteIdempotencyKey(key);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete key: ${err.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTTL = (seconds: number): string => {
    if (seconds < 0) return 'Expired';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 14, color: '#94a3b8' }}>
          Loading idempotency data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: 8, 
          padding: 16 
        }}>
          <p style={{ color: '#dc2626', marginBottom: 8 }}>Error: {error}</p>
          <button
            onClick={fetchData}
            style={{
              padding: '8px 16px',
              background: '#fee2e2',
              border: 'none',
              borderRadius: 6,
              color: '#dc2626',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Idempotency Monitor</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Track duplicate request prevention and cache performance</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: loading ? '#f1f5f9' : '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 6,
            color: '#2563eb',
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Total Requests */}
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="stat-icon" style={{ background: '#dbeafe' }}>
              <Database style={{ width: 18, height: 18, color: '#2563eb' }} />
            </div>
            <div>
              <div className="stat-label">Total Requests</div>
              <div className="stat-value">{stats.total_requests}</div>
            </div>
          </div>

          {/* Cache Hits */}
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="stat-icon" style={{ background: '#dcfce7' }}>
              <CheckCircle style={{ width: 18, height: 18, color: '#16a34a' }} />
            </div>
            <div>
              <div className="stat-label">Cache Hits</div>
              <div className="stat-value">{stats.cache_hits}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Duplicates prevented</div>
            </div>
          </div>

          {/* Hit Rate */}
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="stat-icon" style={{ background: '#f3e8ff' }}>
              <TrendingUp style={{ width: 18, height: 18, color: '#7c3aed' }} />
            </div>
            <div>
              <div className="stat-label">Cache Hit Rate</div>
              <div className="stat-value" style={{ fontSize: 22 }}>
                {(stats.hit_rate ?? 0).toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>%</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Efficiency metric</div>
            </div>
          </div>

          {/* Cached Responses */}
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="stat-icon" style={{ background: '#fef3c7' }}>
              <Archive style={{ width: 18, height: 18, color: '#d97706' }} />
            </div>
            <div>
              <div className="stat-label">Cached Responses</div>
              <div className="stat-value">{stats.total_cached_responses}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Active in Redis</div>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Redis Connection</span>
            <span className={`badge ${stats.redis_connected ? 'badge-green' : 'badge-red'}`}>
              {stats.redis_connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Currently Processing</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{stats.currently_processing} requests</span>
          </div>
        </div>
      )}

      {/* Cached Keys Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #f1f5f9' }}>
          <h2 className="section-title">Cached Idempotency Keys</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Recent keys with cached responses (max 50)</p>
        </div>

        {keys.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', fontSize: 14, color: '#94a3b8' }}>
            No cached idempotency keys found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ 
                    padding: '12px 20px', 
                    textAlign: 'left', 
                    fontSize: 11, 
                    fontWeight: 600, 
                    color: '#64748b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}>
                    Idempotency Key
                  </th>
                  <th style={{ 
                    padding: '12px 20px', 
                    textAlign: 'left', 
                    fontSize: 11, 
                    fontWeight: 600, 
                    color: '#64748b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}>
                    TTL
                  </th>
                  <th style={{ 
                    padding: '12px 20px', 
                    textAlign: 'left', 
                    fontSize: 11, 
                    fontWeight: 600, 
                    color: '#64748b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: '12px 20px', 
                    textAlign: 'left', 
                    fontSize: 11, 
                    fontWeight: 600, 
                    color: '#64748b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key, index) => (
                  <tr 
                    key={key.idempotency_key} 
                    style={{ 
                      borderTop: '1px solid #f1f5f9',
                      background: index % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                  >
                    <td style={{ padding: '12px 20px', fontSize: 13, fontFamily: 'var(--font-mono)', color: '#334155' }}>
                      {key.idempotency_key}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13 }}>
                      <span style={{ 
                        color: key.ttl_seconds < 300 ? '#dc2626' : 
                               key.ttl_seconds < 3600 ? '#d97706' : 
                               '#16a34a',
                        fontWeight: 500
                      }}>
                        {formatTTL(key.ttl_seconds)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13 }}>
                      <span className={`badge ${key.has_response ? 'badge-green' : 'badge-gray'}`}>
                        {key.has_response ? 'Cached' : 'No Response'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13 }}>
                      <button
                        onClick={() => handleDeleteKey(key.idempotency_key)}
                        disabled={deleteLoading === key.idempotency_key}
                        style={{
                          padding: '6px 12px',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 6,
                          color: '#dc2626',
                          fontSize: 12,
                          cursor: deleteLoading === key.idempotency_key ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          opacity: deleteLoading === key.idempotency_key ? 0.5 : 1
                        }}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                        {deleteLoading === key.idempotency_key ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div style={{ 
        marginTop: 24,
        background: '#eff6ff', 
        border: '1px solid #bfdbfe', 
        borderRadius: 8, 
        padding: 20 
      }}>
        <h3 style={{ color: '#1e40af', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>💡 About Idempotency</h3>
        <p style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
          Idempotency prevents duplicate payments when clients retry requests. Each request with the same 
          <code style={{ 
            margin: '0 4px', 
            padding: '2px 6px', 
            background: '#dbeafe', 
            borderRadius: 4, 
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: '#1e40af'
          }}>Idempotency-Key</code> 
          header returns the same cached response, ensuring no duplicate charges occur.
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 13, lineHeight: 1.8 }}>
          <li>Cached responses expire after 24 hours</li>
          <li>Processing locks prevent race conditions</li>
          <li>High hit rate indicates effective duplicate prevention</li>
        </ul>
      </div>
    </div>
  );
}

// Made with Bob