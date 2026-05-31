import { useEffect, useState } from 'react';
import { getIdempotencyStats, getIdempotencyKeys, deleteIdempotencyKey } from '../services/api';

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
      // Refresh data after deletion
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete key: ${err.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 seconds
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading idempotency data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
        <button
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Idempotency Monitor</h1>
          <p className="text-gray-400 mt-1">Track duplicate request prevention and cache performance</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Requests */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Requests</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.total_requests}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Cache Hits */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Cache Hits</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{stats.cache_hits}</p>
                <p className="text-xs text-gray-500 mt-1">Duplicates prevented</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Hit Rate */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Cache Hit Rate</p>
                <p className="text-3xl font-bold text-purple-400 mt-2">
                  {stats.hit_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Efficiency metric</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Cached Responses */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Cached Responses</p>
                <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.total_cached_responses}</p>
                <p className="text-xs text-gray-500 mt-1">Active in Redis</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Redis Connection</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                stats.redis_connected 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {stats.redis_connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Currently Processing</span>
              <span className="text-white font-medium">{stats.currently_processing} requests</span>
            </div>
          </div>
        </div>
      )}

      {/* Cached Keys Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Cached Idempotency Keys</h2>
          <p className="text-sm text-gray-400 mt-1">Recent keys with cached responses (max 50)</p>
        </div>

        {keys.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No cached idempotency keys found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Idempotency Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    TTL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {keys.map((key) => (
                  <tr key={key.idempotency_key} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm text-white font-mono">
                      {key.idempotency_key}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`${
                        key.ttl_seconds < 300 ? 'text-red-400' : 
                        key.ttl_seconds < 3600 ? 'text-yellow-400' : 
                        'text-green-400'
                      }`}>
                        {formatTTL(key.ttl_seconds)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        key.has_response 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {key.has_response ? 'Cached' : 'No Response'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDeleteKey(key.idempotency_key)}
                        disabled={deleteLoading === key.idempotency_key}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs disabled:opacity-50"
                      >
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
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h3 className="text-blue-400 font-medium mb-2">💡 About Idempotency</h3>
        <p className="text-gray-300 text-sm">
          Idempotency prevents duplicate payments when clients retry requests. Each request with the same 
          <code className="mx-1 px-2 py-0.5 bg-gray-800 rounded text-xs">Idempotency-Key</code> 
          header returns the same cached response, ensuring no duplicate charges occur.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-gray-400">
          <li>• Cached responses expire after 24 hours</li>
          <li>• Processing locks prevent race conditions</li>
          <li>• High hit rate indicates effective duplicate prevention</li>
        </ul>
      </div>
    </div>
  );
}

// Made with Bob