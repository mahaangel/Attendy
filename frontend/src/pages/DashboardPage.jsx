import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, BookOpen, TrendingUp, AlertTriangle, Zap, Calendar, Bell, Brain } from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import { StatCard, SubjectCard } from '../components/Cards';
import { Spinner, EmptyState } from '../components/Common';
import { analyticsService, subjectService, alertService } from '../services';
import useAuthStore from '../store/authStore';
import useAlertStore from '../store/alertStore';
import toast from 'react-hot-toast';

const RISK_COLORS = { Safe: '#10B981', Warning: '#F59E0B', Danger: '#EF4444' };
const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const { fetchAlerts } = useAlertStore();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, subjectsData, overviewData] = await Promise.all([
          analyticsService.getDashboard(),
          subjectService.getAll(),
          analyticsService.getOverview(),
        ]);
        setStats(statsData);
        setSubjects(subjectsData.slice(0, 4));
        setOverview(overviewData.subjects || []);
        await fetchAlerts();
      } catch (err) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chartData = overview.map(s => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name,
    attendance: s.attendance_pct,
    target: s.target_pct,
  }));

  const pieData = stats ? [
    { name: 'Safe', value: stats.safe_subjects },
    { name: 'Warning', value: stats.warning_subjects },
    { name: 'Danger', value: stats.danger_subjects },
  ].filter(d => d.value > 0) : [];

  if (loading) return <AppLayout title="Dashboard"><Spinner center size="lg" /></AppLayout>;

  return (
    <AppLayout title="Dashboard" subtitle={`Welcome back, ${user?.name}!`}>
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <StatCard
            icon={<span>📚</span>}
            label="Total Subjects"
            value={stats.total_subjects}
            color="primary"
          />
          <StatCard
            icon={<span>📊</span>}
            label="Overall Attendance"
            value={`${stats.overall_attendance?.toFixed(1)}%`}
            color={stats.overall_attendance >= 75 ? 'success' : stats.overall_attendance >= 65 ? 'warning' : 'danger'}
          />
          <StatCard
            icon={<span>🔥</span>}
            label="Streak Days"
            value={stats.streak_days}
            color="violet"
          />
          <StatCard
            icon={<span>🚨</span>}
            label="Danger Subjects"
            value={stats.danger_subjects}
            color={stats.danger_subjects > 0 ? 'danger' : 'success'}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {/* Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Attendance by Subject</div>
              <div className="card-subtitle">vs. target percentage</div>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                <Area type="monotone" dataKey="attendance" stroke="#2563EB" fill="url(#colorAttendance)" strokeWidth={2} name="Attendance" />
                <Area type="monotone" dataKey="target" stroke="#F59E0B" fill="none" strokeDasharray="5 5" strokeWidth={1.5} name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📊" title="No Data Yet" message="Add subjects and mark attendance to see charts." />
          )}
        </div>

        {/* Pie Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Risk Distribution</div>
              <div className="card-subtitle">Subject-wise risk breakdown</div>
            </div>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" startAngle={90} endAngle={-270}>
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="🥧" title="No Risk Data" message="Add subjects to see risk breakdown." />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Quick Actions</div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { icon: <BookOpen size={16}/>, label: 'Add Subject', to: '/subjects', cls: 'btn-primary' },
            { icon: <Brain size={16}/>, label: 'AI Prediction', to: '/prediction', cls: 'btn-secondary' },
            { icon: <Zap size={16}/>, label: 'What-If Sim', to: '/simulation', cls: 'btn-secondary' },
            { icon: <Bell size={16}/>, label: 'Check Alerts', to: '/alerts', cls: 'btn-ghost' },
            { icon: <Calendar size={16}/>, label: 'Update Calendar', to: '/calendar', cls: 'btn-ghost' },
          ].map(action => (
            <button
              key={action.label}
              id={`quick-${action.label.replace(/\s/g, '-').toLowerCase()}`}
              className={`btn ${action.cls}`}
              onClick={() => navigate(action.to)}
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Subjects */}
      {subjects.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>Recent Subjects</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/subjects')}>View All →</button>
          </div>
          <div className="grid grid-2">
            {subjects.map(s => (
              <SubjectCard
                key={s.id}
                subject={s}
                onMark={() => navigate('/attendance')}
                onView={() => navigate('/prediction')}
              />
            ))}
          </div>
        </div>
      )}

      {!subjects.length && !loading && (
        <EmptyState
          icon="🎓"
          title="Ready to Track Your Attendance?"
          message="Add your first subject and start using AI-powered predictions."
          action={<button className="btn btn-primary" onClick={() => navigate('/subjects')}>+ Add First Subject</button>}
        />
      )}
    </AppLayout>
  );
}
