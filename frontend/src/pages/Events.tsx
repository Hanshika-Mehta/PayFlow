import { useState, useEffect, useRef } from 'react';
import { Activity, Search, Pause, Play, Trash2 } from 'lucide-react';

interface EventItem {
  id: number;
  time: string;
  event: string;
  paymentId: string;
  color: string;
  bgColor: string;
}

const EVENT_TYPES = [
  { event: 'payment.created', color: '#64748b', bgColor: '#f1f5f9' },
  { event: 'payment.enqueued', color: '#d97706', bgColor: '#fffbeb' },
  { event: 'payment.processing', color: '#2563eb', bgColor: '#eff6ff' },
  { event: 'payment.success', color: '#16a34a', bgColor: '#f0fdf4' },
  { event: 'payment.failed', color: '#dc2626', bgColor: '#fef2f2' },
  { event: 'payment.retry', color: '#7c3aed', bgColor: '#f3e8ff' },
];

let eventCounter = 0;

function generateEvent(): EventItem {
  const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  const now = new Date();
  eventCounter++;
  return {
    id: eventCounter,
    time: now.toLocaleTimeString('en-US', { hour12: false }),
    event: type.event,
    paymentId: `pay_${1715751000000 + Math.floor(Math.random() * 999999)}`,
    color: type.color,
    bgColor: type.bgColor,
  };
}

const Events = () => {
  const [events, setEvents] = useState<EventItem[]>(() => {
    const initial: EventItem[] = [];
    for (let i = 0; i < 15; i++) initial.push(generateEvent());
    return initial.reverse();
  });
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setEvents((prev) => [generateEvent(), ...prev].slice(0, 200));
    }, 2000);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [events.length]);

  const filtered = events.filter((e) => {
    if (filter && e.event !== filter) return false;
    if (search && !e.paymentId.toLowerCase().includes(search.toLowerCase()) && !e.event.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Event Stream</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Live Redis Pub/Sub event feed</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: paused ? '#fffbeb' : '#f0fdf4', borderRadius: 999, border: paused ? '1px solid #fde68a' : '1px solid #bbf7d0' }}>
            <span className={paused ? '' : 'animate-pulse-green'} style={{ width: 8, height: 8, background: paused ? '#f59e0b' : '#22c55e', borderRadius: 999, display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: paused ? '#b45309' : '#15803d' }}>{paused ? 'Paused' : 'Live'}</span>
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{events.length} events</span>
        </div>
      </div>

      {/* ── Controls & Filter Bar ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e2e8f0', borderRadius: 8, padding: 3 }}>
          <button
            onClick={() => setFilter(null)}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: !filter ? '#ffffff' : 'transparent',
              color: !filter ? '#0f172a' : '#64748b',
              boxShadow: !filter ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            All
          </button>
          {EVENT_TYPES.map((t) => (
            <button
              key={t.event}
              onClick={() => setFilter(t.event === filter ? null : t.event)}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: filter === t.event ? '#ffffff' : 'transparent',
                color: filter === t.event ? '#0f172a' : '#64748b',
                boxShadow: filter === t.event ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {t.event.split('.')[1]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <div style={{ position: 'relative', width: 200 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94a3b8' }} />
            <input
              className="form-input"
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 34, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontSize: 13 }}
            />
          </div>

          <button
            onClick={() => setPaused(!paused)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: paused ? '#eff6ff' : '#fffbeb',
              color: paused ? '#2563eb' : '#d97706',
              border: paused ? '1px solid #bfdbfe' : '1px solid #fde68a',
            }}
          >
            {paused ? <Play style={{ width: 13, height: 13 }} /> : <Pause style={{ width: 13, height: 13 }} />}
            {paused ? 'Resume' : 'Pause'}
          </button>

          <button
            onClick={() => setEvents([])}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: '#ffffff',
              color: '#64748b',
              border: '1px solid #e2e8f0',
            }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
            Clear
          </button>
        </div>
      </div>

      {/* ── Terminal Event Log Card ─────────────── */}
      <div className="card" style={{ background: '#0f172a', border: '1px solid #1e293b', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)' }}>
        {/* Header toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 18px',
          background: '#1e293b',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: '#ef4444' }} />
          <div style={{ width: 10, height: 10, borderRadius: 999, background: '#f59e0b' }} />
          <div style={{ width: 10, height: 10, borderRadius: 999, background: '#10b981' }} />
          <span style={{ marginLeft: 10, fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>redis-events — payflow</span>
          <div style={{ marginLeft: 'auto' }} />
          <Activity style={{ width: 15, height: 15, color: '#475569' }} />
        </div>

        {/* Console content */}
        <div ref={scrollRef} style={{ maxHeight: 520, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className="event-log-line animate-fade-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '6px 12px',
                borderRadius: 6,
                color: '#e2e8f0',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ color: '#475569', width: 70, flexShrink: 0, userSelect: 'none' }}>{ev.time}</span>
              <span style={{
                color: ev.event.includes('success') ? '#4ade80' :
                       ev.event.includes('failed') ? '#f87171' :
                       ev.event.includes('processing') ? '#60a5fa' :
                       ev.event.includes('enqueued') ? '#fbbf24' :
                       ev.event.includes('retry') ? '#c084fc' :
                       '#94a3b8',
                fontWeight: 700,
                width: 160,
                flexShrink: 0
              }}>{ev.event}</span>
              <span style={{ color: '#64748b', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{ev.paymentId}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: '#475569', fontFamily: 'var(--font-mono)' }}>
              NO EVENTS MATCHING CURRENT SEARCH OR FILTER.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
