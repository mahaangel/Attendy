import api from './api';

export const alertService = {
  getAll: (unreadOnly = false) =>
    api.get('/alerts/', { params: { unread_only: unreadOnly } }).then(r => r.data),
  getUnreadCount: () =>
    api.get('/alerts/unread-count').then(r => r.data),
  markRead: (id) =>
    api.put(`/alerts/${id}/read`).then(r => r.data),
  markAllRead: () =>
    api.put('/alerts/read-all').then(r => r.data),
  delete: (id) =>
    api.delete(`/alerts/${id}`),
  checkAndSend: () =>
    api.post('/alerts/check-and-send').then(r => r.data),
};

export default alertService;
