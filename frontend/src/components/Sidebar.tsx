import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  ListOrdered,
  Users,
  Activity,
  RotateCcw,
  Gauge,
  Database,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/payments', icon: CreditCard, label: 'Payments' },
  { path: '/queue', icon: ListOrdered, label: 'Queue Monitor' },
  { path: '/workers', icon: Users, label: 'Worker Monitor' },
  { path: '/events', icon: Activity, label: 'Events' },
  { path: '/retries', icon: RotateCcw, label: 'Retry Monitor' },
  { path: '/rate-limiting', icon: Gauge, label: 'Rate Limiting' },
  { path: '/cache', icon: Database, label: 'Cache' },
  { path: '/metrics', icon: BarChart3, label: 'Metrics' },
];

const Sidebar = () => {
  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap style={{ width: 20, height: 20, color: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            PayFlow
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: -2 }}>
            Payment Processor
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon style={{ width: 18, height: 18, flexShrink: 0 }} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-link" style={{ color: '#94a3b8', cursor: 'pointer' }}>
          <Settings style={{ width: 18, height: 18 }} />
          <span>Settings</span>
        </div>
        <div style={{
          margin: '8px 4px 0',
          padding: '10px 12px',
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Environment
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', marginTop: 2 }}>
            Development
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
            v1.0.0
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
