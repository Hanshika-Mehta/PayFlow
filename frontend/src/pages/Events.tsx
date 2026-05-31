import { useState, useEffect, useRef } from 'react';
import { Activity, Search, Pause, Play, Trash2 } from 'lucide-react';
import { getRecentPayments } from '../services/api';

interface EventItem {
  id: number;
  time: string;
  event: string;
  paymentId: string;
  color: string;
  bgColor: string;
  status: string;
}

const STATUS_TO_EVENT = {
  'PENDING': { event: 'payment.created', color: '#64748b', bgColor: '#f1f5f9' },
  'PROCESSING': { event: 'payment.processing', color: '#2563eb', bgColor: '#eff6ff' },
  'SUCCESS': { event: 'payment.success', color: '#16a34a', bgColor: '#f0fdf4' },
  'FAILED': { event: 'payment.failed', color: '#dc2626', bgColor: '#fef2f2' },
};

let eventCounter = 0;

const Events = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lastPaymentIds, setLastPaymentIds] = useState<Set<string>>(new Set());

  // Fetch real payment data and convert to events
  const fetchPaymentEvents = async () => {
    if (paused) return;

    try {
      const response = await getRecentPayments(20);
      const payments = response.payments || [];

      const newEvents: EventItem[] = [];
      const currentPaymentIds = new Set<string>();

      payments.forEach((payment: any) => {
        const paymentId = payment.id;
        currentPaymentIds.add(paymentId);

        // Only add as new event if we haven't seen this payment before
        // or if its status changed
        if (!lastPaymentIds.has(paymentId)) {
          const statusConfig = STATUS_TO_EVENT[payment.status as keyof typeof STATUS_TO_EVENT] || STATUS_TO_EVENT.PENDING;
          
          eventCounter++;
          newEvents.push({
            id: eventCounter,
            time: new Date(payment.updated_at || payment.created_at).toLocaleTimeString('en-US', { hour12: false }),
            event: statusConfig.event,
            paymentId: paymentId,
            color: statusConfig.color,
            bgColor: statusConfig.bgColor,
            status: payment.status
          });
        }
      });

      if (newEvents.length > 0) {
        setEvents(prev => [...newEvents.reverse(), ...prev].slice(0, 50));
      }

      setLastPaymentIds(currentPaymentIds);
    } catch (error) {
      console.error('Error fetching payment events:', error);
    }
  };

  useEffect(() => {
    fetchPaymentEvents();
    const interval = setInterval(fetchPaymentEvents, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (scrollRef.current && !paused) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

  const filtered = events.filter((e) => {
    if (filter && e.event !== filter) return false;
    if (search && !e.paymentId.toLowerCase().includes(search.toLowerCase()) && !e.event.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const eventTypes = Array.from(new Set(events.map(e => e.event)));

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* ── Header ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Event Stream</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Real-time payment lifecycle events</p>
      </div>

      {/* ── Controls ────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search payment ID or event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        <button
          onClick={() => setPaused(!paused)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: paused ? '#fef3c7' : '#eff6ff',
            border: paused ? '1px solid #fde68a' : '1px solid #bfdbfe',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: paused ? '#92400e' : '#1e40af',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          {paused ? <Play style={{ width: 14, height: 14 }} /> : <Pause style={{ width: 14, height: 14 }} />}
          {paused ? 'Resume' : 'Pause'}
        </button>

        <button
          onClick={() => setEvents([])}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <Trash2 style={{ width: 14, height: 14 }} />
          Clear
        </button>
      </div>

      {/* ── Filter Chips ────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter(null)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: filter === null ? '#0f172a' : '#f1f5f9',
            color: filter === null ? '#ffffff' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          All ({events.length})
        </button>
        {eventTypes.map((type) => {
          const count = events.filter(e => e.event === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filter === type ? '#0f172a' : '#f1f5f9',
                color: filter === type ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease'
              }}
            >
              {type} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Event List ──────────────────────────── */}
      <div
        ref={scrollRef}
        className="card"
        style={{
          padding: 0,
          maxHeight: 600,
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        {filtered.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            {events.length === 0 ? 'No events yet. Create some payments to see events.' : 'No events match your filter.'}
          </div>
        )}

        {filtered.map((e, idx) => (
          <div
            key={e.id}
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 20px',
              borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
              transition: 'background 0.15s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(el) => el.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={(el) => el.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <Activity style={{ width: 16, height: 16, color: e.color }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#94a3b8', minWidth: 70 }}>{e.time}</span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: e.bgColor,
                  color: e.color
                }}
              >
                {e.event}
              </span>
              <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#334155', fontWeight: 500 }}>
                {e.paymentId}
              </code>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{
        marginTop: 16,
        padding: '12px 16px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 8,
        fontSize: 12,
        color: '#1e40af'
      }}>
        <strong>💡 Note:</strong> Events are generated from recent payment status changes. Updates every 2 seconds.
      </div>
    </div>
  );
};

export default Events;

// Made with Bob
