// src/app/dashboard/notifications/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, AlertCircle, MessageSquare, Award, Droplets } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const TYPE_ICONS: Record<string, any> = {
  emergency_request: { icon: AlertCircle, color: 'text-red-400 bg-red-500/10' },
  request_accepted: { icon: Check, color: 'text-green-400 bg-green-500/10' },
  request_fulfilled: { icon: Droplets, color: 'text-blue-400 bg-blue-500/10' },
  badge_earned: { icon: Award, color: 'text-yellow-400 bg-yellow-500/10' },
  chat_message: { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10' },
  system: { icon: Bell, color: 'text-slate-400 bg-slate-500/10' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.get('/notifications')
      .then(({ data }) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {
        setNotifications([
          { _id: '1', type: 'emergency_request', title: '🚨 Emergency Blood Request', message: 'O+ blood needed at Apollo Hospital – 3 units urgent', isRead: false, priority: 'critical', createdAt: new Date(Date.now() - 5 * 60000) },
          { _id: '2', type: 'badge_earned', title: '🏆 Badge Unlocked!', message: 'You earned the "Life Saver" badge for 5 donations!', isRead: false, priority: 'medium', createdAt: new Date(Date.now() - 60 * 60000) },
          { _id: '3', type: 'request_accepted', title: '✅ Request Accepted', message: 'A donor has accepted your B+ blood request', isRead: true, priority: 'high', createdAt: new Date(Date.now() - 3 * 60 * 60000) },
        ]);
        setUnreadCount(2);
      })
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    toast.success('All marked as read');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">
            <span className="text-gradient">Notifications</span>
          </h1>
          <p className="text-slate-400 mt-1">{unreadCount} unread alerts</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors">
            <Check size={16} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Bell size={48} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-white font-semibold mb-2">No notifications yet</h3>
          <p className="text-slate-500 text-sm">You'll be notified when something happens</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const config = TYPE_ICONS[n.type] || TYPE_ICONS.system;
            const Icon = config.icon;
            return (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => !n.isRead && markRead(n._id)}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  !n.isRead
                    ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/8'
                    : 'border-white/5 bg-white/3 hover:bg-white/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm ${n.isRead ? 'text-slate-300' : 'text-white'}`}>{n.title}</p>
                    <span className="text-slate-600 text-xs flex-shrink-0">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mt-0.5">{n.message}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
