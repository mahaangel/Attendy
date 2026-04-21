import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import { RiskBadge } from '../components/Cards';
import { Spinner, EmptyState } from '../components/Common';
import { predictionService } from '../services';
import useSubjectStore from '../store/subjectStore';

export default function LeavePlannerPage() {
  const { subjects, fetchSubjects } = useSubjectStore();
  const [selectedId, setSelectedId] = useState('');
  const [targetPct, setTargetPct] = useState(75);
  const [futureClasses, setFutureClasses] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { if (subjects.length === 0) fetchSubjects(); }, []);

  const subject = subjects.find(s => s.id === selectedId);
  useEffect(() => {
    if (subject) setTargetPct(subject.target_percentage || 75);
  }, [selectedId]);

  const handlePlan = async () => {
    if (!selectedId) { toast.error('Select a subject'); return; }
    setLoading(true);
    try {
      const data = await predictionService.leavePlanner(selectedId, targetPct, futureClasses);
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to calculate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Smart Leave Planner" subtitle="Calculate exactly how many classes you can safely skip">
      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Controls */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏖️ Leave Calculator</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Select Subject</label>
              <select id="leave-subject-select" className="form-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">— Choose subject —</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.attendance_percentage?.toFixed(1)}% ({s.risk_level})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Attendance: <strong>{targetPct}%</strong></label>
              <input id="target-slider" type="range" min={50} max={100} value={targetPct} onChange={e => setTargetPct(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#2563EB' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}><span>50%</span><span>100%</span></div>
            </div>

            <div className="form-group">
              <label className="form-label">Future Classes to Plan: <strong>{futureClasses}</strong></label>
              <input id="future-classes-slider" type="range" min={5} max={60} value={futureClasses} onChange={e => setFutureClasses(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#2563EB' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}><span>5</span><span>60</span></div>
            </div>

            <button id="calculate-btn" className="btn btn-primary btn-lg" onClick={handlePlan} disabled={loading || !selectedId} style={{ justifyContent: 'center' }}>
              {loading ? <><Spinner /> Calculating...</> : '📊 Calculate Safe Leaves'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Big Number */}
            <div className="card" style={{
              textAlign: 'center',
              background: result.max_safe_leaves > 0 ? 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)' : 'linear-gradient(135deg, #FEE2E2 0%, #FFF5F5 100%)',
              borderColor: result.max_safe_leaves > 0 ? '#6EE7B7' : '#FCA5A5',
            }}>
              <h3 style={{ marginBottom: 8, color: '#374151' }}>{result.subject_name}</h3>
              <div style={{ fontSize: '5rem', fontWeight: 900, color: result.max_safe_leaves > 0 ? '#10B981' : '#EF4444', lineHeight: 1, marginBottom: 8 }}>
                {result.max_safe_leaves}
              </div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: result.max_safe_leaves > 0 ? '#065F46' : '#991B1B' }}>
                {result.max_safe_leaves === 1 ? 'Safe Leave' : 'Safe Leaves'} Available
              </p>
              <p style={{ color: '#64748B', fontSize: 13, marginTop: 8 }}>over the next {futureClasses} classes</p>
            </div>

            {/* Stats */}
            <div className="grid grid-2" style={{ gap: 12 }}>
              {[
                { label: 'Current', value: `${result.current_percentage?.toFixed(1)}%`, color: '#2563EB' },
                { label: 'Target', value: `${result.target_percentage?.toFixed(1)}%`, color: '#F59E0B' },
              ].map(item => (
                <div key={item.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Message */}
            <div className={`alert-banner ${result.recovery_possible ? (result.max_safe_leaves > 0 ? 'alert-banner-success' : 'alert-banner-warning') : 'alert-banner-danger'}`}>
              <span>{result.max_safe_leaves > 0 ? '✅' : result.recovery_possible ? '⚠️' : '🚨'}</span>
              <div>
                <strong>{result.recovery_possible ? (result.max_safe_leaves > 0 ? 'Good news!' : 'Recovery Needed') : 'Critical'}</strong>
                <p style={{ marginTop: 4, fontSize: 13 }}>{result.message}</p>
              </div>
            </div>

            {/* Recovery classes if needed */}
            {result.classes_to_attend_for_recovery > 0 && (
              <div className="card" style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 32 }}>🎯</span>
                  <div>
                    <p style={{ fontWeight: 700, color: '#92400E' }}>Recovery Plan</p>
                    <p style={{ fontSize: 14, color: '#92400E' }}>
                      Attend <strong>{result.classes_to_attend_for_recovery}</strong> consecutive classes first, then you'll have {result.max_safe_leaves} safe leaves.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 350, flexDirection: 'column', gap: 16, background: 'linear-gradient(135deg, #FFFBEB 0%, #F8FAFC 100%)' }}>
            <span style={{ fontSize: 64 }}>🏖️</span>
            <h3 style={{ color: '#F59E0B' }}>Plan Your Leaves Smartly</h3>
            <p style={{ color: '#94A3B8', textAlign: 'center', maxWidth: 260 }}>
              Select a subject and calculate exactly how many classes you can skip without falling below your target.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
