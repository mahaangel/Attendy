import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services';
import useAuthStore from '../store/authStore';
import { Spinner } from '../components/Common';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data;
      if (tab === 'login') {
        data = await authService.login(form.email, form.password);
      } else {
        if (!form.name.trim()) { toast.error('Name is required'); setLoading(false); return; }
        data = await authService.signup(form.name, form.email, form.password);
      }
      setAuth(data.user, data.access_token);
      toast.success(`Welcome, ${data.user.name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Panel */}
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>🎓</div>
          <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800, marginBottom: 16, letterSpacing: '-1px' }}>
            Smart<span style={{ color: '#60A5FA' }}>Attend</span>
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: 1.7, marginBottom: 40 }}>
            AI-Powered Attendance Prediction & Alert System. Never fall short again.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '🤖', title: 'LSTM + XGBoost AI', desc: 'Real machine learning predicts your future attendance' },
              { icon: '📊', title: 'Smart Analytics', desc: 'Live heatmaps, trend charts, and risk analysis' },
              { icon: '🔔', title: 'Instant Alerts', desc: 'Email notifications when attendance dips below target' },
              { icon: '🏖️', title: 'Leave Optimizer', desc: 'Know exactly how many classes you can safely skip' },
            ].map(feature => (
              <div key={feature.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', textAlign: 'left' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{feature.icon}</span>
                <div>
                  <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{feature.title}</p>
                  <p style={{ color: '#64748B', fontSize: 13 }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 40, fontStyle: 'italic' }}>
            "Never fall short again." — SmartAttend
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-box">
          <h2>{tab === 'login' ? 'Welcome back 👋' : 'Create account 🚀'}</h2>
          <p>{tab === 'login' ? 'Sign in to your SmartAttend account' : 'Start tracking your attendance with AI'}</p>

          <div className="auth-tabs">
            <button id="tab-login" className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Sign In</button>
            <button id="tab-signup" className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Sign Up</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {tab === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="name-input">Full Name</label>
                <input
                  id="name-input"
                  className="form-input"
                  name="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  required={tab === 'signup'}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Email Address</label>
              <input
                id="email-input"
                className="form-input"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password-input">Password</label>
              <input
                id="password-input"
                className="form-input"
                name="password"
                type="password"
                placeholder={tab === 'signup' ? 'Min. 8 characters' : 'Your password'}
                value={form.password}
                onChange={handleChange}
                required
                minLength={tab === 'signup' ? 8 : 1}
              />
            </div>
            <button
              id="auth-submit-btn"
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? <Spinner /> : (tab === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
