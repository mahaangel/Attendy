import api from './api';

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

export default attendanceService;
