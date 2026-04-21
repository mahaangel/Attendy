import api from './api';

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

export default authService;
