import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import { RiskBadge } from '../components/Cards';
import { Spinner, EmptyState, Modal } from '../components/Common';
import { subjectService, attendanceService } from '../services';
import useSubjectStore from '../store/subjectStore';

const STATUS_CONFIG = {
  present: { label: 'Present', color: '#10B981', bg: '#D1FAE5', icon: '✅' },
  absent: { label: 'Absent', color: '#EF4444', bg: '#FEE2E2', icon: '❌' },
  leave: { label: 'Leave', color: '#F59E0B', bg: '#FEF3C7', icon: '🏖️' },
};

export default function AttendancePage() {
  const { subjects, fetchSubjects } = useSubjectStore();
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [markForm, setMarkForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), status: 'present' });
  const [showImport, setShowImport] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => { if (subjects.length === 0) fetchSubjects(); }, []);
  useEffect(() => {
    if (selectedId) loadHistory();
  }, [selectedId]);

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const data = await attendanceService.getHistory(selectedId);
      setHistory(data);
    } catch { setHistory([]); }
    finally { setHistLoading(false); }
  };

  const handleMark = async (e) => {
    e.preventDefault();
    if (!selectedId) { toast.error('Select a subject first'); return; }
    setLoading(true);
    try {
      await attendanceService.markAttendance(selectedId, markForm.date, markForm.status);
      toast.success(`Marked ${markForm.status} for ${format(new Date(markForm.date), 'MMM d, yyyy')} ✅`);
      fetchSubjects();
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId) => {
    try {
      await attendanceService.deleteRecord(selectedId, recordId);
      setHistory(prev => prev.filter(r => r.id !== recordId));
      fetchSubjects();
      toast.success('Record deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleImport = async () => {
    if (!csvFile || !selectedId) { toast.error('Select subject and CSV file'); return; }
    setImporting(true);
    try {
      const result = await attendanceService.importCsv(selectedId, csvFile);
      toast.success(`Imported ${result.imported} records!`);
      if (result.errors?.length > 0) toast.error(`${result.errors.length} rows skipped due to errors`);
      fetchSubjects();
      loadHistory();
      setShowImport(false);
      setCsvFile(null);
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const selectedSubject = subjects.find(s => s.id === selectedId);

  return (
    <AppLayout title="Attendance Tracker" subtitle="Mark and manage your daily attendance">
      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Left: Mark Attendance */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">📝 Mark Attendance</div>
            </div>
            <form onSubmit={handleMark} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Select Subject</label>
                <select id="subject-select" className="form-select" value={selectedId} onChange={e => setSelectedId(e.target.value)} required>
                  <option value="">— Choose a subject —</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.attendance_percentage?.toFixed(1)}%)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input id="attendance-date" className="form-input" type="date" value={markForm.date} onChange={e => setMarkForm(p => ({ ...p, date: e.target.value }))} max={format(new Date(), 'yyyy-MM-dd')} required />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                    <button
                      key={s}
                      type="button"
                      id={`status-${s}`}
                      onClick={() => setMarkForm(p => ({ ...p, status: s }))}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        border: `2px solid ${markForm.status === s ? c.color : '#E2E8F0'}`,
                        background: markForm.status === s ? c.bg : '#fff',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        color: markForm.status === s ? c.color : '#94A3B8',
                        transition: 'all 0.2s',
                      }}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button id="mark-submit-btn" className="btn btn-primary" type="submit" disabled={loading || !selectedId}>
                {loading ? <Spinner /> : 'Submit Attendance'}
              </button>
            </form>
          </div>

          {/* Subject stats */}
          {selectedSubject && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4>{selectedSubject.name}</h4>
                <RiskBadge risk={selectedSubject.risk_level} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Attendance', value: `${selectedSubject.attendance_percentage?.toFixed(1)}%` },
                  { label: 'Target', value: `${selectedSubject.target_percentage}%` },
                  { label: 'Attended', value: selectedSubject.attended_classes },
                  { label: 'Safe Leaves', value: selectedSubject.safe_leaves },
                ].map(item => (
                  <div key={item.label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1E293B', marginTop: 2 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={() => setShowImport(true)}>
                📤 Import CSV
              </button>
            </div>
          )}
        </div>

        {/* Right: History */}
        <div className="card" style={{ padding: '20px 0' }}>
          <div style={{ padding: '0 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Attendance History</h3>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{history.length} records</span>
          </div>
          {histLoading ? <Spinner center /> : !selectedId ? (
            <EmptyState icon="👆" title="Select a Subject" message="Choose a subject to view attendance history" />
          ) : history.length === 0 ? (
            <EmptyState icon="📅" title="No History Yet" message="Start marking attendance to see history here" />
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #F1F5F9' }}>Date</th>
                    <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #F1F5F9' }}>Status</th>
                    <th style={{ padding: '10px 24px', textAlign: 'right', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #F1F5F9' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(r => {
                    const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.leave;
                    return (
                      <tr key={r.id}>
                        <td style={{ padding: '12px 24px', fontSize: 14, borderBottom: '1px solid #F8FAFC' }}>
                          {format(new Date(r.date + 'T00:00:00'), 'MMM d, yyyy')}
                        </td>
                        <td style={{ padding: '12px 24px', borderBottom: '1px solid #F8FAFC' }}>
                          <span className="badge" style={{ background: s.bg, color: s.color }}>
                            {s.icon} {s.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 24px', textAlign: 'right', borderBottom: '1px solid #F8FAFC' }}>
                          <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444', padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(r.id)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="Import Attendance from CSV"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowImport(false)}>Cancel</button>
            <button id="import-btn" className="btn btn-primary" onClick={handleImport} disabled={importing || !csvFile}>
              {importing ? <Spinner /> : 'Import'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="alert-banner alert-banner-info">
            <span>ℹ️</span>
            <div>
              <strong>CSV Format:</strong>
              <br /><code style={{ fontSize: 12 }}>date,status</code>
              <br /><code style={{ fontSize: 12 }}>2024-01-15,present</code>
              <br /><code style={{ fontSize: 12 }}>2024-01-16,absent</code>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Upload CSV File</label>
            <input id="csv-file-input" type="file" accept=".csv" className="form-input" style={{ padding: '8px' }} onChange={e => setCsvFile(e.target.files[0])} />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
