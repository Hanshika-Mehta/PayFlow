import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Activity, Zap, AlertTriangle } from 'lucide-react';

/* ─── Simple SVG Line Chart ─────────────────────── */
interface ChartProps {
  data: number[];
  color: string;
  gradientId: string;
  height?: number;
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const MiniChart = ({ data, color, gradientId, height = 120, label, value, icon: Icon, iconBg, iconColor }: ChartProps) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 280;
  const padding = 8;
  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * effectiveWidth;
    const y = padding + effectiveHeight - ((v - min) / range) * effectiveHeight;
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${padding + effectiveHeight}`,
    ...points,
    `${padding + effectiveWidth},${padding + effectiveHeight}`,
  ].join(' ');

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: iconBg
          }}>
            <Icon style={{ width: 16, height: 16, color: iconColor }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 1 }}>{value}</p>
          </div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={padding}
            y1={padding + pct * effectiveHeight}
            x2={padding + effectiveWidth}
            y2={padding + pct * effectiveHeight}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}
        {/* Area */}
        <polygon points={areaPoints} fill={`url(#${gradientId})`} />
        {/* Line */}
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Latest dot */}
        {data.length > 0 && (
          <circle
            cx={padding + effectiveWidth}
            cy={padding + effectiveHeight - ((data[data.length - 1] - min) / range) * effectiveHeight}
            r="4"
            fill={color}
            stroke="white"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────── */
const Metrics = () => {
  const [rpsData, setRpsData] = useState([12, 15, 18, 14, 22, 19, 25, 21, 28, 24, 30, 27, 32, 29, 35, 31, 28, 33, 36, 34]);
  const [queueData, setQueueData] = useState([3, 5, 4, 7, 3, 6, 4, 8, 5, 3, 6, 4, 7, 5, 3, 4, 6, 5, 3, 4]);
  const [successData, setSuccessData] = useState([95, 97, 96, 98, 95, 97, 99, 96, 98, 97, 95, 98, 97, 96, 99, 98, 97, 96, 98, 97]);
  const [errorData, setErrorData] = useState([5, 3, 4, 2, 5, 3, 1, 4, 2, 3, 5, 2, 3, 4, 1, 2, 3, 4, 2, 3]);
  const [workerData, setWorkerData] = useState([60, 70, 65, 80, 75, 85, 70, 90, 80, 75, 85, 70, 90, 80, 75, 85, 80, 75, 85, 82]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRpsData((prev) => [...prev.slice(1), Math.floor(Math.random() * 20) + 20]);
      setQueueData((prev) => [...prev.slice(1), Math.floor(Math.random() * 8) + 1]);
      setSuccessData((prev) => [...prev.slice(1), Math.floor(Math.random() * 5) + 95]);
      setErrorData((prev) => [...prev.slice(1), Math.floor(Math.random() * 5) + 1]);
      setWorkerData((prev) => [...prev.slice(1), Math.floor(Math.random() * 30) + 65]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>System Metrics</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Real-time performance monitoring</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#f0fdf4', borderRadius: 999, border: '1px solid #bbf7d0' }}>
          <span className="animate-pulse-green" style={{ width: 8, height: 8, background: '#22c55e', borderRadius: 999, display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>Live Updates</span>
        </div>
      </div>

      {/* ── Summary Stats Cards Grid ────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Payments', value: '1,245', icon: BarChart3, bg: '#f1f5f9', color: '#475569' },
          { label: 'Success Rate', value: '97.8%', icon: TrendingUp, bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Error Rate', value: '2.2%', icon: AlertTriangle, bg: '#fef2f2', color: '#ef4444' },
          { label: 'Avg Latency', value: '123ms', icon: Activity, bg: '#dbeafe', color: '#2563eb' },
          { label: 'Workers', value: '3 / 3', icon: Zap, bg: '#f3e8ff', color: '#7c3aed' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: s.bg
              }}>
                <s.icon style={{ width: 14, height: 14, color: s.color }} />
              </div>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{s.value}</p>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Charts Grid (RPS and Queue Depth) ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
        <MiniChart
          data={rpsData}
          color="#3b82f6"
          gradientId="rps-grad"
          label="Requests / Second"
          value={`${rpsData[rpsData.length - 1]} req/s`}
          icon={TrendingUp}
          iconBg="#dbeafe"
          iconColor="#2563eb"
        />
        <MiniChart
          data={queueData}
          color="#7c3aed"
          gradientId="queue-grad"
          label="Queue Depth"
          value={`${queueData[queueData.length - 1]} messages`}
          icon={BarChart3}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
        />
      </div>

      {/* ── Secondary Charts Grid (Success, Error, Worker) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <MiniChart
          data={successData}
          color="#10b981"
          gradientId="success-grad"
          label="Success Rate"
          value={`${successData[successData.length - 1]}%`}
          icon={TrendingUp}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          height={100}
        />
        <MiniChart
          data={errorData}
          color="#ef4444"
          gradientId="error-grad"
          label="Error Rate"
          value={`${errorData[errorData.length - 1]}%`}
          icon={AlertTriangle}
          iconBg="#fee2e2"
          iconColor="#ef4444"
          height={100}
        />
        <MiniChart
          data={workerData}
          color="#f59e0b"
          gradientId="worker-grad"
          label="Worker Utilization"
          value={`${workerData[workerData.length - 1]}%`}
          icon={Zap}
          iconBg="#fef3c7"
          iconColor="#d97706"
          height={100}
        />
      </div>
    </div>
  );
};

export default Metrics;
