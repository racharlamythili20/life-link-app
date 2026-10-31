// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'donor' | 'receiver' | 'hospital' | 'admin';
  bloodGroup?: string;
  profileImage?: string;
  isAvailable?: boolean;
  totalDonations?: number;
  rewardPoints?: number;
  badges?: Array<{ name: string; icon: string }>;
  redemptions?: Array<any>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, token: null, refreshToken: null,
      isLoading: false, error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await axios.post('/auth/login', { email, password });
          set({ user: data.user, token: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Login failed', isLoading: false });
          throw err;
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await axios.post('/auth/register', userData);
          set({ user: data.user, token: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Registration failed', isLoading: false });
          throw err;
        }
      },

      logout: () => {
        const { token } = get();
        if (token) {
          axios.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        }
        set({ user: null, token: null, refreshToken: null });
      },

      updateUser: (updates) =>
        set(state => ({ user: state.user ? { ...state.user, ...updates } : null })),
    }),
    {
      name: 'lifelink-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
