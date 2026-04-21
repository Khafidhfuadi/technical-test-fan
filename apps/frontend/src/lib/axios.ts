import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Endpoints yang sengaja mengembalikan 401 untuk validasi input,
      // bukan karena token tidak valid — jangan redirect ke /login
      const url: string = error.config?.url || '';
      const isCredentialEndpoint =
        url.includes('/auth/login') ||
        url.includes('/users/change-password');

      if (!isCredentialEndpoint && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        document.cookie = 'token=; Max-Age=0; path=/';
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
