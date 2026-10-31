// src/lib/axios.ts
import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://lifelink-backend-avuk.onrender.com/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lifelink-auth');
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - auto refresh token
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = localStorage.getItem('lifelink-auth');
        if (stored) {
          const { state } = JSON.parse(stored);
          if (state?.refreshToken) {
            const { data } = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
              { refreshToken: state.refreshToken }
            );
            // Update stored token
            const updated = JSON.parse(localStorage.getItem('lifelink-auth') || '{}');
            updated.state.token = data.accessToken;
            updated.state.refreshToken = data.refreshToken;
            localStorage.setItem('lifelink-auth', JSON.stringify(updated));

            original.headers.Authorization = `Bearer ${data.accessToken}`;
            return instance(original);
          }
        }
      } catch {
        // Refresh failed - clear auth
        localStorage.removeItem('lifelink-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
