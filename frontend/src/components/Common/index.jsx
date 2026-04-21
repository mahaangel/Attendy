// Spinner Component
export function Spinner({ size = 'md', center = false }) {
  const cls = size === 'lg' ? 'spinner spinner-lg' : 'spinner';
  if (center) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
        <div className={cls} />
      </div>
    );
  }
  return <div className={cls} />;
}

// Modal Component
export function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  if (!isOpen) return null;
  const sizeClass = size === 'lg' ? 'modal modal-lg' : size === 'xl' ? 'modal modal-xl' : 'modal';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={sizeClass} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="modal-close-btn">✕</button>
        </div>
        <div>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Empty State Component
export function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className="empty-state animate-fade">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

// Alert Banner Component
export function AlertBanner({ type = 'info', children, onClose }) {
  const classMap = {
    info: 'alert-banner alert-banner-info',
    success: 'alert-banner alert-banner-success',
    warning: 'alert-banner alert-banner-warning',
    danger: 'alert-banner alert-banner-danger',
  };
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '🚨' };

  return (
    <div className={classMap[type] || classMap.info}>
      <span>{icons[type]}</span>
      <div style={{ flex: 1 }}>{children}</div>
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>}
    </div>
  );
}
