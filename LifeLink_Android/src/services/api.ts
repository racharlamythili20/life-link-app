// src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://lifelink-backend-avuk.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  try {
    console.log('[API Request]', config.method?.toUpperCase(), 'URL:', (config.baseURL || '') + (config.url || ''), 'Data:', JSON.stringify(config.data));
    const stored = await AsyncStorage.getItem('lifelink-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    }
  } catch (e: any) {
    console.error('[API Request Prefetch Error]', e.message);
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log('[API Response Success]', res.status, 'URL:', res.config.url, 'Data:', JSON.stringify(res.data));
    return res;
  },
  async (error) => {
    if (!error.config?.url?.endsWith('/auth/logout')) {
      console.warn('[API Response Error]', {
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        responseData: error.response?.data,
        message: error.message
      });
    }
    if (error.response?.status === 401 && !error.config?._retry && !error.config?.url?.endsWith('/auth/logout')) {
      error.config._retry = true;
      try {
        const stored = await AsyncStorage.getItem('lifelink-auth');
        if (stored) {
          const { state } = JSON.parse(stored);
          if (state?.refreshToken) {
            console.log('[API Token Refresh] Attempting refresh...');
            const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: state.refreshToken });
            const updated = JSON.parse(await AsyncStorage.getItem('lifelink-auth') || '{}');
            updated.state.token = data.accessToken;
            updated.state.refreshToken = data.refreshToken;
            await AsyncStorage.setItem('lifelink-auth', JSON.stringify(updated));
            error.config.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(error.config);
          }
        }
      } catch (refreshErr: any) {
        console.error('[API Token Refresh Failed]', refreshErr.message);
        await AsyncStorage.removeItem('lifelink-auth');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
