import { useEffect, useState, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, isToday, getDay, addMonths, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import { Spinner, Modal, EmptyState } from '../components/Common';
import { timetableService } from '../services';
import useSubjectStore from '../store/subjectStore';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function CalendarPage() {
  const { subjects, fetchSubjects } = useSubjectStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timetable, setTimetable] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Add slot form
  const [slotForm, setSlotForm] = useState({ subject_id: '', day_of_week: 0, start_time: '09:00', end_time: '10:00', room: '' });
  // Holiday form
  const [holidayForm, setHolidayForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), name: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tt, hols] = await Promise.all([
        timetableService.getAll(),
        timetableService.getHolidays(),
      ]);
      setTimetable(tt);
      setHolidays(hols);
    } catch { toast.error('Failed to load calendar data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    if (subjects.length === 0) fetchSubjects();
  }, []);

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun
  const calDays = Array(startPad).fill(null).concat(days);

  const getHolidayForDay = (date) => holidays.find(h => isSameDay(new Date(h.date), date));
  const getTimetableForDay = (date) => {
    const dow = getDay(date); // 0=Sun
    return timetable.filter(t => t.day_of_week === dow);
  };

  const handleAddSlot = async () => {
    if (!slotForm.subject_id) { toast.error('Select a subject'); return; }
    setSaving(true);
    try {
      const entry = await timetableService.addEntry(slotForm);
      setTimetable(prev => [...prev, entry]);
      setShowAddModal(false);
      toast.success('Class slot added!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add slot');
    } finally { setSaving(false); }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await timetableService.deleteEntry(id);
      setTimetable(prev => prev.filter(t => t.id !== id));
      toast.success('Slot removed');
    } catch { toast.error('Failed to remove slot'); }
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.name) { toast.error('Enter holiday name'); return; }
    setSaving(true);
    try {
      const h = await timetableService.addHoliday(holidayForm);
      setHolidays(prev => [...prev, h]);
      setShowHolidayModal(false);
      toast.success('Holiday marked!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add holiday');
    } finally { setSaving(false); }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await timetableService.deleteHoliday(id);
      setHolidays(prev => prev.filter(h => h.id !== id));
      toast.success('Holiday removed');
    } catch { toast.error('Failed to remove holiday'); }
  };

  const subjectName = (id) => subjects.find(s => s.id === id)?.name || 'Unknown';

  return (
    <AppLayout title="Calendar" subtitle="Timetable, classes & holidays">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Academic Calendar</h1>
          <p>Manage your weekly timetable and holidays</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button id="add-holiday-btn" className="btn btn-secondary" onClick={() => setShowHolidayModal(true)}>
            🏖️ Mark Holiday
          </button>
          <button id="add-slot-btn" className="btn btn-primary" onClick={() => { setSlotForm({ subject_id: '', day_of_week: 0, start_time: '09:00', end_time: '10:00', room: '' }); setShowAddModal(true); }}>
            + Add Class Slot
          </button>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 24, alignItems: 'start' }}>
        {/* Calendar */}
        <div className="card">
          {/* Month navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button id="prev-month-btn" className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>← Prev</button>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{format(currentMonth, 'MMMM yyyy')}</h3>
            <button id="next-month-btn" className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>Next →</button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748B', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {calDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} />;
              const holiday = getHolidayForDay(day);
              const classes = getTimetableForDay(day);
              const today = isToday(day);
              const selected = selectedDay && isSameDay(selectedDay, day);

              return (
                <div
                  key={day.toISOString()}
                  id={`cal-day-${format(day, 'yyyy-MM-dd')}`}
                  onClick={() => setSelectedDay(selected ? null : day)}
                  style={{
                    borderRadius: 8,
                    padding: '7px 5px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: selected ? '#2563EB' : today ? '#EFF6FF' : holiday ? '#FEF2F2' : 'transparent',
                    border: today && !selected ? '1.5px solid #2563EB' : '1.5px solid transparent',
                    transition: 'all 0.15s',
                    minHeight: 48,
                    position: 'relative',
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: today || selected ? 700 : 400,
                    color: selected ? '#fff' : today ? '#2563EB' : !isSameMonth(day, currentMonth) ? '#CBD5E1' : '#1E293B',
                  }}>
                    {format(day, 'd')}
                  </span>
                  {holiday && (
                    <div style={{ fontSize: 9, color: selected ? '#ffd' : '#EF4444', marginTop: 2, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🏖️
                    </div>
                  )}
                  {classes.length > 0 && !holiday && (
                    <div style={{ fontSize: 9, color: selected ? '#bce' : '#2563EB', marginTop: 2 }}>
                      {classes.length} cls
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', fontSize: 11, color: '#64748B' }}>
            <span><span style={{ background: '#EFF6FF', border: '1.5px solid #2563EB', borderRadius: 4, padding: '1px 5px', color: '#2563EB', fontWeight: 700 }}>15</span> Today</span>
            <span><span style={{ background: '#2563EB', borderRadius: 4, padding: '1px 5px', color: '#fff', fontWeight: 700 }}>15</span> Selected</span>
            <span><span style={{ background: '#FEF2F2', borderRadius: 4, padding: '1px 5px', color: '#EF4444' }}>🏖️</span> Holiday</span>
            <span><span style={{ color: '#2563EB' }}>N cls</span> = Classes that day</span>
          </div>
        </div>

        {/* Right panel: selected day detail + timetable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selected day detail */}
          {selectedDay ? (
            <div className="card">
              <div className="card-header">
                <div className="card-title">📅 {format(selectedDay, 'EEEE, d MMMM yyyy')}</div>
              </div>
              {(() => {
                const holiday = getHolidayForDay(selectedDay);
                const classes = getTimetableForDay(selectedDay);
                if (holiday) {
                  return (
                    <div className="alert-banner alert-banner-danger">
                      <span>🏖️</span>
                      <div>
                        <strong>{holiday.name}</strong>
                        <p style={{ fontSize: 12, marginTop: 2 }}>Holiday — no classes scheduled</p>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteHoliday(holiday.id)} style={{ color: '#EF4444' }}>Remove</button>
                    </div>
                  );
                }
                if (classes.length === 0) return <p style={{ color: '#94A3B8' }}>No classes scheduled this day.</p>;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {classes.map(cls => (
                      <div key={cls.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: '#EFF6FF', borderRadius: 10, padding: '10px 14px',
                      }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14 }}>{subjectName(cls.subject_id)}</p>
                          <p style={{ fontSize: 12, color: '#64748B' }}>{cls.start_time} – {cls.end_time} {cls.room && `· ${cls.room}`}</p>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteSlot(cls.id)} style={{ color: '#EF4444' }}>✕</button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
              <p style={{ color: '#94A3B8' }}>Click a day to see details</p>
            </div>
          )}

          {/* Weekly timetable summary */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📋 Weekly Timetable</div>
            </div>
            {loading ? <Spinner center /> : timetable.length === 0 ? (
              <EmptyState icon="📋" title="No classes yet" message="Add your class slots using the button above." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DAYS_OF_WEEK.map((day, i) => {
                  const dayClasses = timetable.filter(t => t.day_of_week === i);
                  if (dayClasses.length === 0) return null;
                  return (
                    <div key={day}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{day}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {dayClasses.map(cls => (
                          <div key={cls.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#F8FAFC', borderRadius: 8, padding: '8px 12px',
                            border: '1px solid #E2E8F0',
                          }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{subjectName(cls.subject_id)}</span>
                            <span style={{ fontSize: 12, color: '#64748B' }}>{cls.start_time} – {cls.end_time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming holidays */}
          {holidays.length > 0 && (
            <div className="card">
              <div className="card-header"><div className="card-title">🏖️ Holidays</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {holidays.slice(0, 5).map(h => (
                  <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8' }}>{format(new Date(h.date), 'EEE, d MMM yyyy')}</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteHoliday(h.id)} style={{ color: '#EF4444' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Slot Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Class Slot"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button id="save-slot-btn" className="btn btn-primary" onClick={handleAddSlot} disabled={saving}>
              {saving ? <Spinner /> : 'Save Slot'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select id="slot-subject" className="form-select" value={slotForm.subject_id} onChange={e => setSlotForm(f => ({ ...f, subject_id: e.target.value }))}>
              <option value="">— Select subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Day of Week</label>
            <select id="slot-day" className="form-select" value={slotForm.day_of_week} onChange={e => setSlotForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))}>
              {DAYS_OF_WEEK.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input id="slot-start" type="time" className="form-input" value={slotForm.start_time} onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input id="slot-end" type="time" className="form-input" value={slotForm.end_time} onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Room (optional)</label>
            <input id="slot-room" type="text" className="form-input" placeholder="e.g. Room 204" value={slotForm.room} onChange={e => setSlotForm(f => ({ ...f, room: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        title="Mark Holiday"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowHolidayModal(false)}>Cancel</button>
            <button id="save-holiday-btn" className="btn btn-primary" onClick={handleAddHoliday} disabled={saving}>
              {saving ? <Spinner /> : 'Mark Holiday'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input id="holiday-date" type="date" className="form-input" value={holidayForm.date} onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Holiday Name</label>
            <input id="holiday-name" type="text" className="form-input" placeholder="e.g. Republic Day" value={holidayForm.name} onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
