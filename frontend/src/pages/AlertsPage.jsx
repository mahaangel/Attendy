import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import { AlertCard } from '../components/Cards';
import { Spinner, EmptyState } from '../components/Common';
import { alertService } from '../services';
import useAlertStore from '../store/alertStore';

export default function AlertsPage() {
  const { alerts, loading, unreadCount, fetchAlerts, markRead, markAllRead, removeAlert } = useAlertStore();
  const [filter, setFilter] = useState('all');
  const [checking, setChecking] = useState(false);

  useEffect(() => { fetchAlerts(); }, []);

  const handleRead = async (id) => {
    try {
      await alertService.markRead(id);
      markRead(id);
    } catch { toast.error('Failed to mark read'); }
  };

  const handleDelete = async (id) => {
    try {
      await alertService.delete(id);
      removeAlert(id);
      toast.success('Alert dismissed');
    } catch { toast.error('Failed to dismiss'); }
  };

  const handleMarkAll = async () => {
    try {
      await alertService.markAllRead();
      markAllRead();
      toast.success('All alerts marked as read');
    } catch { toast.error('Failed to update'); }
  };

  const handleCheckAlerts = async () => {
    setChecking(true);
    try {
      const res = await alertService.checkAndSend();
      toast.success(res.message || 'Alerts checked!');
      await fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to check alerts');
    } finally {
      setChecking(false);
    }
  };

  const filtered = filter === 'unread' ? alerts.filter(a => !a.is_read)
    : filter === 'danger' ? alerts.filter(a => a.risk_level === 'Danger')
    : alerts;

  return (
    <AppLayout title="Alerts Center" subtitle={`${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}`}>
      {/* Header Actions */}
      <div className="page-header">
        <div>
          <h1>Alerts Center</h1>
          <p>{alerts.length} total alerts | {unreadCount} unread</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {unreadCount > 0 && (
            <button id="mark-all-btn" className="btn btn-secondary btn-sm" onClick={handleMarkAll}>
              ✓ Mark All Read
            </button>
          )}
          <button id="check-alerts-btn" className="btn btn-primary" onClick={handleCheckAlerts} disabled={checking}>
            {checking ? <Spinner /> : '🔍 Check & Send Alerts'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'all', label: `All (${alerts.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'danger', label: `Danger (${alerts.filter(a => a.risk_level === 'Danger').length})` },
        ].map(tab => (
          <button key={tab.key} id={`filter-${tab.key}`} className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {loading ? <Spinner center size="lg" /> : filtered.length === 0 ? (
        <EmptyState
          icon={filter === 'unread' ? '🎉' : '🔔'}
          title={filter === 'unread' ? 'All caught up!' : 'No Alerts'}
          message={filter === 'unread' ? 'No unread alerts. Keep maintaining your attendance!' : 'Click "Check & Send Alerts" to scan your subjects for risks.'}
          action={<button className="btn btn-primary" onClick={handleCheckAlerts}>🔍 Check Now</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(alert => (
            <AlertCard key={alert.id} alert={alert} onRead={handleRead} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
