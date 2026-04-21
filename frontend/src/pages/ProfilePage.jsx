import { useState } from 'react';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import { Spinner, AlertBanner } from '../components/Common';
import { authService } from '../services';
import useAuthStore from '../store/authStore';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const [tab, setTab] = useState('profile'); // 'profile' | 'security' | 'preferences'

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    target_percentage: user?.target_percentage || 75,
    semester: user?.semester || '',
    institution: user?.institution || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passSaving, setPassSaving] = useState(false);
  const [passError, setPassError] = useState('');

  const handleProfileSave = async () => {
    if (!profileForm.name.trim()) { toast.error('Name is required'); return; }
    setProfileSaving(true);
    try {
      const updated = await authService.updateProfile(profileForm);
      updateUser(updated);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally { setProfileSaving(false); }
  };

  const handlePasswordSave = async () => {
    setPassError('');
    if (!passwordForm.current_password) { setPassError('Enter current password'); return; }
    if (passwordForm.new_password.length < 6) { setPassError('New password must be at least 6 characters'); return; }
    if (passwordForm.new_password !== passwordForm.confirm_password) { setPassError('Passwords do not match'); return; }
    setPassSaving(true);
    try {
      await authService.updateProfile({ password: passwordForm.new_password, current_password: passwordForm.current_password });
      toast.success('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPassError(err.response?.data?.detail || 'Failed to change password');
    } finally { setPassSaving(false); }
  };

  const avatarInitial = user?.name?.charAt(0).toUpperCase() || '?';
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : 'N/A';

  const tabs = [
    { key: 'profile', label: '👤 Profile' },
    { key: 'security', label: '🔒 Security' },
    { key: 'preferences', label: '⚙️ Preferences' },
  ];

  return (
    <AppLayout title="Profile" subtitle="Manage your account">
      <div className="page-header">
        <div>
          <h1>Account Settings</h1>
          <p>Manage your profile, security and preferences</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 24, alignItems: 'start' }}>

        {/* Left: Avatar card */}
        <div style={{ gridColumn: '1', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            {/* Avatar */}
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '2.2rem', fontWeight: 800,
              margin: '0 auto 16px',
              boxShadow: '0 0 0 4px #EFF6FF, 0 0 0 6px #2563EB40',
            }}>
              {avatarInitial}
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>{user?.name}</h3>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>{user?.email}</p>

            {/* Stats mini */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', padding: '10px 16px', background: '#F8FAFC', borderRadius: 10 }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563EB' }}>
                  {profileForm.target_percentage}%
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>Target</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px 16px', background: '#F8FAFC', borderRadius: 10 }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7C3AED' }}>
                  {user?.semester || '—'}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>Semester</div>
              </div>
            </div>

            <p style={{ marginTop: 16, fontSize: 12, color: '#94A3B8' }}>
              Member since {memberSince}
            </p>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ borderColor: '#FEE2E2' }}>
            <div className="card-header">
              <div className="card-title" style={{ color: '#EF4444' }}>⚠️ Danger Zone</div>
            </div>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>
              Once you sign out, you'll need your credentials to log back in.
            </p>
            <button
              id="logout-btn"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', color: '#EF4444', borderColor: '#FEE2E2' }}
              onClick={() => { logout(); window.location.href = '/login'; }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>

        {/* Right: Tab content */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#F1F5F9', borderRadius: 10, padding: 5 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                id={`tab-${t.key}`}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: tab === t.key ? '#fff' : 'transparent',
                  fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? '#2563EB' : '#64748B',
                  fontSize: 13, transition: 'all 0.2s',
                  boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">👤 Personal Information</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    className="form-input"
                    value={profileForm.name}
                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    id="profile-email"
                    type="email"
                    className="form-input"
                    value={profileForm.email}
                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="grid grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Institution</label>
                    <input
                      id="profile-institution"
                      type="text"
                      className="form-input"
                      value={profileForm.institution}
                      onChange={e => setProfileForm(f => ({ ...f, institution: e.target.value }))}
                      placeholder="e.g. MIT"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <input
                      id="profile-semester"
                      type="text"
                      className="form-input"
                      value={profileForm.semester}
                      onChange={e => setProfileForm(f => ({ ...f, semester: e.target.value }))}
                      placeholder="e.g. 6th"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Default Attendance Target (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <input
                      id="profile-target"
                      type="range"
                      min={50} max={100} step={5}
                      value={profileForm.target_percentage}
                      onChange={e => setProfileForm(f => ({ ...f, target_percentage: parseInt(e.target.value) }))}
                      style={{ flex: 1, accentColor: '#2563EB' }}
                    />
                    <span style={{
                      minWidth: 50, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem',
                      color: profileForm.target_percentage >= 75 ? '#10B981' : '#EF4444',
                    }}>
                      {profileForm.target_percentage}%
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                    Most institutions require 75%. Minimum recommended: 75%.
                  </p>
                </div>
                <button
                  id="save-profile-btn"
                  className="btn btn-primary"
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {profileSaving ? <><Spinner /> Saving...</> : '💾 Save Profile'}
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {tab === 'security' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">🔒 Change Password</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {passError && (
                  <AlertBanner type="danger" onClose={() => setPassError('')}>{passError}</AlertBanner>
                )}
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    id="cur-pass"
                    type="password"
                    className="form-input"
                    value={passwordForm.current_password}
                    onChange={e => setPasswordForm(f => ({ ...f, current_password: e.target.value }))}
                    placeholder="Your current password"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    id="new-pass"
                    type="password"
                    className="form-input"
                    value={passwordForm.new_password}
                    onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    id="confirm-pass"
                    type="password"
                    className="form-input"
                    value={passwordForm.confirm_password}
                    onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
                    placeholder="Repeat new password"
                  />
                  {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                    <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>Passwords do not match</p>
                  )}
                </div>

                {/* Password strength */}
                {passwordForm.new_password && (
                  <div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Password strength</p>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[...Array(4)].map((_, i) => {
                        const strength = passwordForm.new_password.length >= 12 ? 4 : passwordForm.new_password.length >= 8 ? 3 : passwordForm.new_password.length >= 6 ? 2 : 1;
                        const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
                        return (
                          <div key={i} style={{
                            flex: 1, height: 4, borderRadius: 999,
                            background: i < strength ? colors[strength - 1] : '#E2E8F0',
                            transition: 'background 0.3s',
                          }} />
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  id="save-pass-btn"
                  className="btn btn-primary"
                  onClick={handlePasswordSave}
                  disabled={passSaving}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {passSaving ? <><Spinner /> Saving...</> : '🔒 Change Password'}
                </button>
              </div>

              {/* Session security info */}
              <div style={{ marginTop: 24, padding: 16, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🛡️ Security Tips</p>
                <ul style={{ fontSize: 12, color: '#64748B', lineHeight: 2, paddingLeft: 16 }}>
                  <li>Use a unique password not used elsewhere</li>
                  <li>Mix uppercase, lowercase, numbers and symbols</li>
                  <li>Minimum 8 characters recommended</li>
                  <li>Never share your password with anyone</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {tab === 'preferences' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">⚙️ App Preferences</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Notification prefs */}
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🔔 Notifications</p>
                  {[
                    { key: 'email_alerts', label: 'Email Alerts', desc: 'Receive email when attendance drops below target' },
                    { key: 'danger_only', label: 'Danger Zone Only', desc: 'Only alert when in the Danger zone (not Warning)' },
                    { key: 'weekly_summary', label: 'Weekly Summary', desc: 'Weekly email digest of your attendance stats' },
                  ].map(pref => (
                    <div key={pref.key} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: '1px solid #F1F5F9',
                    }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{pref.label}</p>
                        <p style={{ fontSize: 12, color: '#94A3B8' }}>{pref.desc}</p>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                        <input
                          id={`pref-${pref.key}`}
                          type="checkbox"
                          defaultChecked={pref.key === 'email_alerts'}
                          style={{ opacity: 0, width: 0, height: 0 }}
                          onChange={() => toast.success(`${pref.label} preference updated`)}
                        />
                        <span style={{
                          position: 'absolute', inset: 0, background: '#CBD5E1',
                          borderRadius: 999, cursor: 'pointer', transition: 'background 0.2s',
                        }} />
                      </label>
                    </div>
                  ))}
                </div>

                {/* Display prefs */}
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🎨 Display</p>
                  <div className="form-group">
                    <label className="form-label">Date Format</label>
                    <select id="pref-date-format" className="form-select" defaultValue="dd/MM/yyyy">
                      <option value="dd/MM/yyyy">DD/MM/YYYY (e.g., 07/04/2026)</option>
                      <option value="MM/dd/yyyy">MM/DD/YYYY (e.g., 04/07/2026)</option>
                      <option value="yyyy-MM-dd">YYYY-MM-DD (e.g., 2026-04-07)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label">Default Prediction Horizon</label>
                    <select id="pref-horizon" className="form-select" defaultValue="10">
                      <option value="5">5 classes</option>
                      <option value="10">10 classes</option>
                      <option value="20">20 classes</option>
                      <option value="30">30 classes</option>
                    </select>
                  </div>
                </div>

                <button
                  id="save-prefs-btn"
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => toast.success('Preferences saved!')}
                >
                  💾 Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
