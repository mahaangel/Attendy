import { create } from 'zustand';
import { alertService } from '../services';

const useAlertStore = create((set) => ({
  alerts: [],
  unreadCount: 0,
  loading: false,

  fetchAlerts: async () => {
    set({ loading: true });
    try {
      const data = await alertService.getAll();
      const count = data.filter(a => !a.is_read).length;
      set({ alerts: data, unreadCount: count, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await alertService.getUnreadCount();
      set({ unreadCount: data.unread_count });
    } catch {}
  },

  markRead: (id) => set((state) => ({
    alerts: state.alerts.map((a) => a.id === id ? { ...a, is_read: true } : a),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),

  markAllRead: () => set((state) => ({
    alerts: state.alerts.map((a) => ({ ...a, is_read: true })),
    unreadCount: 0,
  })),

  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter((a) => a.id !== id),
    unreadCount: state.alerts.find(a => a.id === id && !a.is_read) ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
  })),
}));

export default useAlertStore;
