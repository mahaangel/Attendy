import { create } from 'zustand';
import { subjectService } from '../services';

const useSubjectStore = create((set, get) => ({
  subjects: [],
  loading: false,
  error: null,

  fetchSubjects: async () => {
    set({ loading: true, error: null });
    try {
      const data = await subjectService.getAll();
      set({ subjects: data, loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  addSubject: (subject) => set((state) => ({ subjects: [...state.subjects, subject] })),
  updateSubject: (id, updates) => set((state) => ({
    subjects: state.subjects.map((s) => s.id === id ? { ...s, ...updates } : s),
  })),
  removeSubject: (id) => set((state) => ({ subjects: state.subjects.filter((s) => s.id !== id) })),
}));

export default useSubjectStore;
