// src/store/socketStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  activeRequests: any[];
  donorLocations: Record<string, { coordinates: [number, number]; name: string; bloodGroup: string }>;

  connect: (token?: string) => void;
  disconnect: () => void;
  updateLocation: (lat: number, lng: number) => void;
  joinRequest: (requestId: string) => void;
  joinChat: (chatId: string) => void;
  sendMessage: (chatId: string, content: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  activeRequests: [],
  donorLocations: {},

  connect: (token) => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://lifelink-backend-avuk.onrender.com';

    const socket = io(url, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('reconnect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    // ─── Emergency Requests ──────────────────────────────
    socket.on('new_emergency_request', (data) => {
      const { request } = data;
      toast.custom(() => (
        <div className="glass-card p-4 max-w-sm border-red-500">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-bold text-red-400">Emergency Blood Request!</p>
              <p className="text-sm text-slate-300">
                {request.bloodGroup} needed at {request.hospitalName}
              </p>
            </div>
          </div>
        </div>
      ), { duration: 8000 });

      set(state => ({
        activeRequests: [request, ...state.activeRequests.slice(0, 49)],
      }));
    });

    socket.on('request_feed_update', (data) => {
      if (data.type === 'new') {
        set(state => ({
          activeRequests: [data.request, ...state.activeRequests.slice(0, 49)],
        }));
      } else if (data.type === 'cancelled') {
        set(state => ({
          activeRequests: state.activeRequests.filter(r => r._id !== data.requestId),
        }));
      }
    });

    socket.on('request_cancelled', ({ requestId }) => {
      set(state => ({
        activeRequests: state.activeRequests.filter(r => r._id !== requestId),
      }));
    });

    // ─── Donor Locations ─────────────────────────────────
    socket.on('donor_location_update', (data) => {
      set(state => ({
        donorLocations: {
          ...state.donorLocations,
          [data.donorId]: {
            coordinates: data.coordinates,
            name: data.name,
            bloodGroup: data.bloodGroup,
          },
        },
      }));
    });

    socket.on('donor_availability_update', ({ donorId, isAvailable }) => {
      // Handle in component
    });

    // ─── Request Accepted ────────────────────────────────
    socket.on('request_accepted', (data) => {
      toast.success(`A donor has accepted your blood request!`);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  updateLocation: (lat, lng) => {
    const { socket } = get();
    socket?.emit('update_location', { lat, lng });
  },

  joinRequest: (requestId) => {
    const { socket } = get();
    socket?.emit('join_request', requestId);
  },

  joinChat: (chatId) => {
    const { socket } = get();
    socket?.emit('join_chat', chatId);
  },

  sendMessage: (chatId, content) => {
    const { socket } = get();
    socket?.emit('send_message', { chatId, content });
  },
}));
