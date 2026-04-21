import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import { RiskBadge } from '../components/Cards';
import { Spinner, EmptyState } from '../components/Common';
import { subjectService, predictionService, analyticsService } from '../services';
import useSubjectStore from '../store/subjectStore';

export default function PredictionPage() {
  const { subjects, fetchSubjects } = useSubjectStore();
  const [selectedId, setSelectedId] = useState('');
  const [leaves, setLeaves] = useState(0);
  const [futureClasses, setFutureClasses] = useState(10);
  const [prediction, setPrediction] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => { if (subjects.length === 0) fetchSubjects(); }, []);

  const handlePredict = async () => {
    if (!selectedId) { toast.error('Select a subject first'); return; }
    setLoading(true);
    try {
      const pred = await predictionService.predict(selectedId, leaves, futureClasses);
      setPrediction(pred);

      // Load trend data
      setTrendLoading(true);
      try {
        const trendData = await analyticsService.getTrend(selectedId);
        setTrend(trendData.trend || []);
      } catch {}
      finally { setTrendLoading(false); }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = prediction?.risk_classification === 'Safe' ? '#10B981' : prediction?.risk_classification === 'Warning' ? '#F59E0B' : '#EF4444';

  return (
    <AppLayout title="AI Prediction" subtitle="LSTM + XGBoost powered attendance forecasting">
      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Input Panel */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">🤖 Prediction Parameters</div>
              <div className="badge badge-info">AI-Powered</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Select Subject</label>
                <select id="pred-subject-select" className="form-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                  <option value="">— Choose a subject —</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.attendance_percentage?.toFixed(1)}% ({s.risk_level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Planned Leaves / Absences: <strong>{leaves}</strong></label>
                <input id="leaves-slider" type="range" min={0} max={20} value={leaves} onChange={e => setLeaves(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}><span>0</span><span>20</span></div>
              </div>

              <div className="form-group">
                <label className="form-label">Upcoming Classes to Predict: <strong>{futureClasses}</strong></label>
                <input id="future-slider" type="range" min={5} max={50} value={futureClasses} onChange={e => setFutureClasses(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}><span>5</span><span>50</span></div>
              </div>

              <button id="predict-btn" className="btn btn-primary btn-lg" onClick={handlePredict} disabled={loading || !selectedId} style={{ justifyContent: 'center' }}>
                {loading ? <><Spinner /> Analyzing...</> : '🔮 Run AI Prediction'}
              </button>
            </div>
          </div>

          {/* Recommendation */}
          {prediction && (
            <div className="card" style={{ borderColor: riskColor, borderWidth: 2 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 30 }}>💡</span>
                <div>
                  <h4 style={{ marginBottom: 8 }}>AI Recommendation</h4>
                  <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{prediction.recommendation}</p>
                  <div style={{ marginTop: 12 }}>
                    <span className="badge" style={{ background: prediction.trend === 'improving' ? '#D1FAE5' : prediction.trend === 'declining' ? '#FEE2E2' : '#F1F5F9', color: prediction.trend === 'improving' ? '#10B981' : prediction.trend === 'declining' ? '#EF4444' : '#64748B' }}>
                      {prediction.trend === 'improving' ? '↑ Improving' : prediction.trend === 'declining' ? '↓ Declining' : '→ Stable'} trend
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div>
          {prediction ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Main Result */}
              <div className="card" style={{ textAlign: 'center', background: `${riskColor}08`, borderColor: riskColor }}>
                <h3 style={{ marginBottom: 8 }}>{prediction.subject_name}</h3>
                <div style={{ fontSize: '4rem', fontWeight: 900, color: riskColor, lineHeight: 1, marginBottom: 8 }}>
                  {prediction.future_percentage?.toFixed(1)}%
                </div>
                <p style={{ color: '#64748B', marginBottom: 12 }}>Predicted attendance after {futureClasses} classes</p>
                <RiskBadge risk={prediction.risk_classification} size="lg" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-2">
                {[
                  { label: 'Current %', value: `${prediction.current_percentage?.toFixed(1)}%`, color: '#2563EB' },
                  { label: 'Predicted %', value: `${prediction.future_percentage?.toFixed(1)}%`, color: riskColor },
                  { label: 'Safe Leaves', value: prediction.safe_leaves_available, color: '#10B981' },
                  { label: 'Planned Absences', value: leaves, color: '#F59E0B' },
                ].map(item => (
                  <div key={item.label} className="card" style={{ padding: '16px', textAlign: 'center', background: '#F8FAFC' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Trend Chart */}
              <div className="card">
                <div className="card-header"><div className="card-title">Weekly Attendance Trend</div></div>
                {trendLoading ? <Spinner center /> : trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={trend} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={v => v.split('-W')[1] ? `Wk${v.split('-W')[1]}` : v} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                      <ReferenceLine y={75} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: '75%', fontSize: 10, fill: '#F59E0B' }} />
                      <Line type="monotone" dataKey="attendance_pct" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB' }} name="Weekly %" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon="📈" title="Not enough data" message="Mark at least 2 weeks of attendance to see trends" />
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16, background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)' }}>
              <span style={{ fontSize: 64 }}>🤖</span>
              <h3 style={{ color: '#2563EB' }}>AI Ready to Predict</h3>
              <p style={{ color: '#94A3B8', textAlign: 'center', maxWidth: 260 }}>
                Select a subject, set your planned leaves, and click "Run AI Prediction" to get your forecast.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
