import axios from 'axios';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const PRODUCTION_API_URL = 'https://university-library-api-e0gj.onrender.com/api';

// Use VITE_API_URL if explicitly set, '/api' proxy on localhost, or live Render API in production
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (isLocalhost ? '/api' : PRODUCTION_API_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 75s timeout gives Render Free Tier instances time to wake from sleep (~50s)
  timeout: 75000,
});

// Attach Authorization header if JWT token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('library_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication & Profile API
export const loginApi = (credentials) => api.post('/auth/login', credentials);
export const getMeApi = () => api.get('/auth/me');
export const updateProfileApi = (data) => api.put('/auth/profile', data);
export const changePasswordApi = (data) => api.put('/auth/change-password', data);
export const pingServerHealth = () => api.get('/health', { timeout: 75000 });

// Books API
export const getBooks = (params) => api.get('/books', { params });
export const getBook = (id) => api.get(`/books/${id}`);
export const createBook = (data) => api.post('/books', data);
export const updateBook = (id, data) => api.put(`/books/${id}`, data);
export const deleteBook = (id) => api.delete(`/books/${id}`);

// Authors API
export const getAuthors = (params) => api.get('/authors', { params });
export const getAuthor = (id) => api.get(`/authors/${id}`);
export const createAuthor = (data) => api.post('/authors', data);
export const updateAuthor = (id, data) => api.put(`/authors/${id}`, data);
export const deleteAuthor = (id) => api.delete(`/authors/${id}`);

// Members API
export const getMembers = (params) => api.get('/members', { params });
export const getMember = (id) => api.get(`/members/${id}`);
export const registerMember = (data) => api.post('/members', data);
export const updateMember = (id, data) => api.put(`/members/${id}`, data);
export const deleteMember = (id) => api.delete(`/members/${id}`);

// Borrow Workflow API
export const issueBook = (data) => api.post('/borrow/issue', data);
export const returnBook = (recordId, data) => api.put(`/borrow/return/${recordId}`, data || {});
export const payFineApi = (recordId, data) => api.post(`/borrow/pay-fine/${recordId}`, data || {});
export const verifyFinePaymentApi = (recordId, data) => api.put(`/borrow/verify-payment/${recordId}`, data || {});
export const getBorrowHistory = (params) => api.get('/borrow', { params });
export const getOverdueLoans = () => api.get('/borrow/overdue');
export const sendOverdueReminder = (recordId) => api.post(`/borrow/overdue/send-reminder/${recordId}`);
export const triggerCronScan = () => api.post('/borrow/trigger-cron-scan');

// Graph API
export const getGraphRelationships = () => api.get('/graph/relationships');
export const syncFullGraph = () => api.post('/graph/sync');
export const executeCypherQuery = (query, params) => api.post('/graph/query', { query, params });
export const getSystemStatus = () => api.get('/graph/status');

// Dashboard API
export const getDashboardStats = () => api.get('/dashboard/stats');
export const seedDemoDatabase = () => api.post('/dashboard/seed');
export const getEmailLogs = () => api.get('/dashboard/emails');

export default api;
