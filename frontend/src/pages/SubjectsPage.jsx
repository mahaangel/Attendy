import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import { SubjectCard } from '../components/Cards';
import { Modal, EmptyState, Spinner } from '../components/Common';
import { subjectService } from '../services';
import useSubjectStore from '../store/subjectStore';

export default function SubjectsPage() {
  const { subjects, loading, fetchSubjects, addSubject, updateSubject, removeSubject } = useSubjectStore();
  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', target_percentage: 75, total_classes_per_week: 3, credits: 3 });

  useEffect(() => { fetchSubjects(); }, []);

  const openCreate = () => { setEditSubject(null); setForm({ name: '', target_percentage: 75, total_classes_per_week: 3, credits: 3 }); setShowModal(true); };
  const openEdit = (s) => { setEditSubject(s); setForm({ name: s.name, target_percentage: s.target_percentage, total_classes_per_week: s.total_classes_per_week, credits: s.credits }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editSubject) {
        const updated = await subjectService.update(editSubject.id, form);
        updateSubject(editSubject.id, updated);
        toast.success('Subject updated!');
      } else {
        const created = await subjectService.create(form);
        addSubject(created);
        toast.success('Subject added! 🎉');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject and all its attendance data?')) return;
    try {
      await subjectService.delete(id);
      removeSubject(id);
      toast.success('Subject deleted');
    } catch {
      toast.error('Failed to delete subject');
    }
  };

  return (
    <AppLayout title="My Subjects" subtitle={`${subjects.length} subject${subjects.length !== 1 ? 's' : ''} tracked`}>
      <div className="page-header">
        <div>
          <h1>Subject Manager</h1>
          <p>Add, edit, and manage all your subjects</p>
        </div>
        <button id="add-subject-btn" className="btn btn-primary" onClick={openCreate}>
          + Add Subject
        </button>
      </div>

      {loading ? (
        <Spinner center size="lg" />
      ) : subjects.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No Subjects Yet"
          message="Add your first subject to start tracking attendance and using AI predictions."
          action={<button id="empty-add-btn" className="btn btn-primary" onClick={openCreate}>+ Add First Subject</button>}
        />
      ) : (
        <div className="grid grid-3">
          {subjects.map(s => (
            <SubjectCard
              key={s.id}
              subject={s}
              onView={() => openEdit(s)}
              onMark={null}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editSubject ? 'Edit Subject' : 'Add New Subject'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button id="subject-save-btn" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <Spinner /> : (editSubject ? 'Save Changes' : 'Add Subject')}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Subject Name *</label>
            <input id="subject-name-input" className="form-input" placeholder="e.g. Mathematics" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Target Attendance %</label>
              <input id="target-pct-input" className="form-input" type="number" min="1" max="100" value={form.target_percentage} onChange={e => setForm(p => ({ ...p, target_percentage: parseFloat(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Classes/Week</label>
              <input id="classes-week-input" className="form-input" type="number" min="1" max="7" value={form.total_classes_per_week} onChange={e => setForm(p => ({ ...p, total_classes_per_week: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Credits</label>
            <input id="credits-input" className="form-input" type="number" min="1" max="10" value={form.credits} onChange={e => setForm(p => ({ ...p, credits: parseInt(e.target.value) }))} />
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
