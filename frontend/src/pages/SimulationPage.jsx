import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import { Spinner, EmptyState } from '../components/Common';
import { simulationService } from '../services';
import useSubjectStore from '../store/subjectStore';
import { RiskBadge } from '../components/Cards';

export default function SimulationPage() {
  const { subjects, fetchSubjects } = useSubjectStore();
  const [selectedId, setSelectedId] = useState('');
  const [skipDays, setSkipDays] = useState(1);
  const [futureClasses, setFutureClasses] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { if (subjects.length === 0) fetchSubjects(); }, []);

  const subject = subjects.find(s => s.id === selectedId);

  const handleSimulate = async () => {
    if (!selectedId) { toast.error('Select a subject'); return; }
    setLoading(true);
    try {
      const data = await simulationService.simulate(selectedId, skipDays, futureClasses);
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="What-If Simulator" subtitle="See exactly what happens if you skip classes">
      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">⚡ Simulation Parameters</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Select Subject</label>
                <select id="sim-subject-select" className="form-select" value={selectedId} onChange={e => { setSelectedId(e.target.value); setResult(null); }}>
                  <option value="">— Choose subject —</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.attendance_percentage?.toFixed(1)}% ({s.risk_level})
                    </option>
                  ))}
                </select>
              </div>

              {subject && (
                <div className="card" style={{ background: '#F8FAFC', padding: 16, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 700 }}>{subject.name}</p>
                      <p style={{ fontSize: 12, color: '#94A3B8' }}>Current: {subject.attendance_percentage?.toFixed(1)}%</p>
                    </div>
                    <RiskBadge risk={subject.risk_level} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Classes to Skip: <strong style={{ color: '#EF4444' }}>{skipDays}</strong></label>
                <input id="skip-slider" type="range" min={1} max={20} value={skipDays} onChange={e => { setSkipDays(parseInt(e.target.value)); setResult(null); }}
                  style={{ width: '100%', accentColor: '#EF4444' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}><span>1</span><span>20</span></div>
              </div>

              <div className="form-group">
                <label className="form-label">Simulation Window: <strong>{futureClasses} classes</strong></label>
                <input id="window-slider" type="range" min={10} max={50} step={5} value={futureClasses} onChange={e => { setFutureClasses(parseInt(e.target.value)); setResult(null); }}
                  style={{ width: '100%', accentColor: '#2563EB' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}><span>10</span><span>50</span></div>
              </div>

              <button id="simulate-btn" className="btn btn-primary btn-lg" onClick={handleSimulate} disabled={loading || !selectedId} style={{ justifyContent: 'center' }}>
                {loading ? <><Spinner /> Simulating...</> : '⚡ Run Simulation'}
              </button>
            </div>
          </div>

          {/* Quick skip presets */}
          <div className="card">
            <div className="card-header"><div className="card-title">Quick Presets</div></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[1, 2, 3, 5, 7, 10].map(n => (
                <button key={n} id={`preset-${n}`} className={`btn btn-sm ${skipDays === n ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={() => { setSkipDays(n); setResult(null); }}>
                  Skip {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Safety Verdict */}
            <div className="card" style={{
              textAlign: 'center',
              background: result.is_safe ? 'linear-gradient(135deg, #D1FAE5, #ECFDF5)' : 'linear-gradient(135deg, #FEE2E2, #FFF5F5)',
              borderColor: result.is_safe ? '#6EE7B7' : '#FCA5A5',
              padding: 32,
            }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>{result.is_safe ? '✅' : '🚨'}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: result.is_safe ? '#065F46' : '#991B1B', marginBottom: 8 }}>
                {result.is_safe ? 'SAFE TO SKIP' : 'DO NOT SKIP'}
              </div>
              <p style={{ color: result.is_safe ? '#065F46' : '#991B1B', fontSize: 14, fontWeight: 500 }}>
                Skipping {skipDays} class{skipDays !== 1 ? 'es' : ''} in {futureClasses} upcoming classes
              </p>
            </div>

            {/* Before → After */}
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Before Skip</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#2563EB' }}>{result.current_percentage?.toFixed(1)}%</div>
              </div>
              <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>After Skip</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: result.is_safe ? '#10B981' : '#EF4444' }}>{result.simulated_percentage?.toFixed(1)}%</div>
              </div>
            </div>

            {/* Risk + More Skips */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 600 }}>Risk After Skip</span>
                <RiskBadge risk={result.risk_after_skip} />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 24 }}>🏖️</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>Additional Safe Skips Remaining</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981' }}>{result.max_more_skips}</p>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className={`alert-banner ${result.is_safe ? 'alert-banner-success' : 'alert-banner-danger'}`}>
              <span>{result.is_safe ? '✅' : '🚨'}</span>
              <p>{result.warning_message}</p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 350, flexDirection: 'column', gap: 16, background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)' }}>
            <span style={{ fontSize: 64 }}>⚡</span>
            <h3 style={{ color: '#F59E0B' }}>Instant What-If Analysis</h3>
            <p style={{ color: '#94A3B8', textAlign: 'center', maxWidth: 260 }}>
              Select a subject, move the slider to set how many classes to skip, and get an instant safety verdict.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
