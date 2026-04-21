import api from './api';

// Auth service
export const authService = {
  signup: async (name, email, password) => {
    const res = await api.post('/auth/signup', { name, email, password });
    return res.data;
  },
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  updateProfile: async (data) => {
    const res = await api.put('/auth/me', data);
    return res.data;
  },
};

// Attendance service
export const attendanceService = {
  markAttendance: (subjectId, date, status) =>
    api.post(`/attendance/${subjectId}/mark`, { date, status }).then(r => r.data),
  bulkMark: (subjectId, records) =>
    api.post(`/attendance/${subjectId}/bulk`, { records }).then(r => r.data),
  getHistory: (subjectId, limit = 90) =>
    api.get(`/attendance/${subjectId}/history`, { params: { limit } }).then(r => r.data),
  importCsv: (subjectId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/attendance/${subjectId}/import-csv`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  deleteRecord: (subjectId, recordId) =>
    api.delete(`/attendance/${subjectId}/record/${recordId}`),
};

// Subject service
export const subjectService = {
  getAll: () => api.get('/subjects/').then(r => r.data),
  getOne: (id) => api.get(`/subjects/${id}`).then(r => r.data),
  create: (data) => api.post('/subjects/', data).then(r => r.data),
  update: (id, data) => api.put(`/subjects/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

// Prediction service
export const predictionService = {
  predict: (subjectId, upcomingLeaves = 0, futureClasses = 10) =>
    api.get(`/predict/${subjectId}`, {
      params: { upcoming_leaves: upcomingLeaves, future_classes: futureClasses }
    }).then(r => r.data),
  leavePlanner: (subjectId, targetPct, futureClasses = 20) =>
    api.post('/predict/leave-planner', {
      subject_id: subjectId,
      target_percentage: targetPct,
      future_classes: futureClasses,
    }).then(r => r.data),
};

// Simulation service
export const simulationService = {
  simulate: (subjectId, skipDays, futureClasses = 20) =>
    api.post('/simulate/', {
      subject_id: subjectId,
      skip_days: skipDays,
      future_classes: futureClasses,
    }).then(r => r.data),
};

// Alert service
export const alertService = {
  getAll: (unreadOnly = false) =>
    api.get('/alerts/', { params: { unread_only: unreadOnly } }).then(r => r.data),
  getUnreadCount: () =>
    api.get('/alerts/unread-count').then(r => r.data),
  markRead: (id) => api.put(`/alerts/${id}/read`).then(r => r.data),
  markAllRead: () => api.put('/alerts/read-all').then(r => r.data),
  delete: (id) => api.delete(`/alerts/${id}`),
  checkAndSend: () => api.post('/alerts/check-and-send').then(r => r.data),
};

// Analytics service
export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard').then(r => r.data),
  getHeatmap: (subjectId) => api.get(`/analytics/heatmap/${subjectId}`).then(r => r.data),
  getTrend: (subjectId, weeks = 8) =>
    api.get(`/analytics/trend/${subjectId}`, { params: { weeks } }).then(r => r.data),
  getOverview: () => api.get('/analytics/overview').then(r => r.data),
  chatbot: (message, subjectId = null) =>
    api.post('/analytics/chatbot', { message, subject_id: subjectId }).then(r => r.data),
};

// Timetable service
export const timetableService = {
  getAll: () => api.get('/timetable/').then(r => r.data),
  addEntry: (data) => api.post('/timetable/', data).then(r => r.data),
  deleteEntry: (id) => api.delete(`/timetable/${id}`),
  getHolidays: () => api.get('/timetable/holidays').then(r => r.data),
  addHoliday: (data) => api.post('/timetable/holidays', data).then(r => r.data),
  deleteHoliday: (id) => api.delete(`/timetable/holidays/${id}`),
};
