import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, CalendarCheck, Brain,
  CalendarDays, Bell, Zap, MessageCircle, User, LogOut,
  TrendingUp, Settings
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useAlertStore from '../../store/alertStore';

const navItems = [
  { section: 'Overview', links: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/subjects', icon: BookOpen, label: 'My Subjects' },
    { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  ]},
  { section: 'AI Tools', links: [
    { to: '/prediction', icon: Brain, label: 'AI Prediction' },
    { to: '/leave-planner', icon: TrendingUp, label: 'Leave Planner' },
    { to: '/simulation', icon: Zap, label: 'What-If Simulator' },
    { to: '/chatbot', icon: MessageCircle, label: 'AI Chatbot' },
  ]},
  { section: 'Plan', links: [
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { to: '/alerts', icon: Bell, label: 'Alerts' },
  ]},
  { section: 'Account', links: [
    { to: '/profile', icon: User, label: 'Profile' },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useAlertStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Smart<span>Attend</span></h1>
        <p>AI Attendance System</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section}>
            <p className="nav-section-title">{section.section}</p>
            {section.links.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
                {to === '/alerts' && unreadCount > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#EF4444',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '2px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                    minWidth: '20px',
                    textAlign: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 36, height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0,
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </p>
                <p style={{ color: '#64748B', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', color: '#94A3B8', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
