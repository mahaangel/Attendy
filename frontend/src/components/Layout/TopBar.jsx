import { Bell, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAlertStore from '../../store/alertStore';

export default function TopBar({ title, subtitle }) {
  const { unreadCount } = useAlertStore();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div>
        <h2 className="topbar-title">{title}</h2>
        {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
      </div>
      <div className="topbar-actions">
        <button
          id="topbar-alerts-btn"
          className="btn btn-ghost btn-icon"
          onClick={() => navigate('/alerts')}
          title="View Alerts"
          style={{ position: 'relative' }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 8, height: 8,
              background: '#EF4444',
              borderRadius: '50%',
              border: '2px solid #fff',
            }} />
          )}
        </button>
      </div>
    </header>
  );
}
