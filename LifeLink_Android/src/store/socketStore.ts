// src/store/socketStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://lifelink-backend-avuk.onrender.com';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  activeRequests: any[];
  donorLocations: Record<string, any>;
  connect: (token?: string) => void;
  disconnect: () => void;
  updateLocation: (lat: number, lng: number) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  activeRequests: [],
  donorLocations: {},

  connect: (token) => {
    const currentSocket = get().socket;
    const prevToken = (get() as any)._lastToken;

    // If already connected with the EXACT same token, do not reconnect
    if (currentSocket?.connected && prevToken === token) {
      return;
    }

    // Disconnect unauthenticated or stale token socket
    if (currentSocket) {
      currentSocket.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
    });

    (set as any)({ _lastToken: token });

    socket.on('connect', () => {
      set({ isConnected: true });
      // If token exists, extract payload and join personal and role rooms explicitly
      if (token) {
        try {
          const payloadBase64 = token.split('.')[1];
          const decoded = JSON.parse(atob(payloadBase64));
          if (decoded.id) {
            socket.emit('join_room', `user:${decoded.id}`);
            if (decoded.role) socket.emit('join_room', `role:${decoded.role}`);
          }
        } catch {}
      }
    });

    socket.on('disconnect', () => set({ isConnected: false }));

    const handleNewReq = async (data: any) => {
      const request = data.request || data;
      if (!request?._id) return;
      set(state => ({
        activeRequests: [request, ...state.activeRequests.filter(r => r._id !== request._id).slice(0, 49)]
      }));

      // Show local notification
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${request.isEmergency ? 'Emergency' : 'New'}: ${request.bloodGroup} Needed`,
            body: `${request.unitsRequired || 1} unit(s) at ${request.hospitalName || 'nearby hospital'}`,
            data: { requestId: request._id, type: 'emergency' },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: null,
        });
      } catch {}
    };

    socket.on('new_request', handleNewReq);
    socket.on('new_emergency_request', handleNewReq);

    socket.on('request_feed_update', (data) => {
      if (data.type === 'new' && data.request) {
        handleNewReq(data.request);
      }
    });

    socket.on('donor_location_update', (data) => {
      set(state => ({
        donorLocations: { ...state.donorLocations, [data.donorId]: data },
      }));
    });

    socket.on('request_accepted', () => {
      Alert.alert('✅ Donor Found', 'A donor has accepted your blood request!');
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false });
  },

  updateLocation: (lat, lng) => {
    get().socket?.emit('update_location', { lat, lng });
  },
}));
