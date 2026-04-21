// RiskBadge Component
export function RiskBadge({ risk, size = 'md' }) {
  const config = {
    Safe: { cls: 'badge-safe', icon: '✅', label: 'Safe' },
    Warning: { cls: 'badge-warning', icon: '⚠️', label: 'Warning' },
    Danger: { cls: 'badge-danger', icon: '🚨', label: 'Danger' },
  };
  const c = config[risk] || config['Safe'];
  return (
    <span className={`badge ${c.cls} ${size === 'lg' ? 'text-sm px-3 py-1.5' : ''}`}>
      {c.icon} {c.label}
    </span>
  );
}

// StatCard Component
export function StatCard({ icon, label, value, color = 'primary', trend, trendLabel }) {
  const colors = {
    primary: { bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#2563EB', valueCls: 'stat-card-value--primary' },
    success: { bg: '#F0FDF4', iconBg: '#D1FAE5', iconColor: '#10B981' },
    warning: { bg: '#FFFBEB', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
    danger: { bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#EF4444' },
    violet: { bg: '#F5F3FF', iconBg: '#EDE9FE', iconColor: '#7C3AED' },
  };
  const c = colors[color] || colors.primary;

  return (
    <div className="stat-card" style={{ background: c.bg, borderColor: 'transparent' }}>
      <div className="stat-card-icon" style={{ background: c.iconBg, color: c.iconColor }}>
        {icon}
      </div>
      <div className="stat-card-value" style={{ color: c.iconColor }}>{value}</div>
      <div className="stat-card-label">{label}</div>
      {trend !== undefined && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <span style={{ color: trend >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          {trendLabel && <span style={{ color: '#94A3B8' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

// SubjectCard Component
export function SubjectCard({ subject, onMark, onView, onDelete }) {
  const { name, attendance_percentage, target_percentage, total_classes, attended_classes, risk_level, safe_leaves } = subject;

  const progressClass = risk_level === 'Safe' ? 'progress-safe' : risk_level === 'Warning' ? 'progress-warning' : 'progress-danger';

  return (
    <div className="card" style={{ cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{name}</h3>
          <RiskBadge risk={risk_level} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '2rem', fontWeight: 800,
            color: risk_level === 'Safe' ? '#10B981' : risk_level === 'Warning' ? '#F59E0B' : '#EF4444',
            lineHeight: 1,
          }}>
            {attendance_percentage?.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
            Target: {target_percentage}%
          </div>
        </div>
      </div>

      <div className="progress-bar" style={{ marginBottom: 12 }}>
        <div
          className={`progress-fill ${progressClass}`}
          style={{ width: `${Math.min(attendance_percentage, 100)}%` }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
        <span>{attended_classes}/{total_classes} classes</span>
        <span>🏖️ {safe_leaves} safe leaves</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {onMark && (
          <button id={`mark-btn-${subject.id}`} className="btn btn-primary btn-sm" onClick={() => onMark(subject)}>
            + Mark
          </button>
        )}
        {onView && (
          <button id={`view-btn-${subject.id}`} className="btn btn-secondary btn-sm" onClick={() => onView(subject)}>
            Details
          </button>
        )}
        {onDelete && (
          <button id={`delete-btn-${subject.id}`} className="btn btn-ghost btn-sm" onClick={() => onDelete(subject.id)}
            style={{ marginLeft: 'auto', color: '#EF4444', borderColor: '#FEE2E2' }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// AlertCard Component
export function AlertCard({ alert, onRead, onDelete }) {
  const riskColors = {
    Danger: { border: '#FEE2E2', bg: '#FEF2F2', icon: '🚨' },
    Warning: { border: '#FEF3C7', bg: '#FFFBEB', icon: '⚠️' },
    Safe: { border: '#D1FAE5', bg: '#F0FDF4', icon: '✅' },
  };
  const c = riskColors[alert.risk_level] || riskColors.Warning;

  return (
    <div style={{
      background: alert.is_read ? '#fff' : c.bg,
      border: `1px solid ${alert.is_read ? '#E2E8F0' : c.border}`,
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
      transition: 'all 0.2s',
    }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{c.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {alert.subject_name || 'Subject'} — <RiskBadge risk={alert.risk_level} />
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            {new Date(alert.created_at).toLocaleDateString()}
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{alert.message}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {!alert.is_read && (
            <button id={`alert-read-${alert.id}`} className="btn btn-secondary btn-sm" onClick={() => onRead(alert.id)}>
              Mark Read
            </button>
          )}
          <button id={`alert-del-${alert.id}`} className="btn btn-ghost btn-sm" onClick={() => onDelete(alert.id)} style={{ color: '#EF4444' }}>
            Dismiss
          </button>
        </div>
      </div>
      {!alert.is_read && (
        <div style={{ width: 8, height: 8, background: '#3B82F6', borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />
      )}
    </div>
  );
}
