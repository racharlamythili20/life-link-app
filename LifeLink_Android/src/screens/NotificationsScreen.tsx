// src/screens/NotificationsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

interface NotifItem {
  _id: string;
  type: 'emergency' | 'request_accepted' | 'badge' | 'system' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

const NOTIF_ICONS: Record<string, string> = {
  emergency: '🚨',
  request_accepted: '✅',
  badge: '🏅',
  system: '📢',
  reminder: '⏰',
};

const NOTIF_COLORS: Record<string, string> = {
  emergency: '#ef4444',
  request_accepted: '#22c55e',
  badge: '#f59e0b',
  system: '#3b82f6',
  reminder: '#8b5cf6',
};

export default function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.notifications?.filter((n: NotifItem) => !n.read).length || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const renderItem = ({ item }: { item: NotifItem }) => {
    const icon = NOTIF_ICONS[item.type] || '🔔';
    const color = NOTIF_COLORS[item.type] || '#64748b';

    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.unreadCard]}
        onPress={() => { if (!item.read) markRead(item._id); }}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            {!item.read && <View style={styles.dot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>
            {new Date(item.createdAt).toLocaleString([], {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#ef4444" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>You'll see blood request alerts and updates here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { padding: 4 },
  backText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' },
  markAllBtn: { padding: 4 },
  markAllText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  list: { padding: 16, gap: 8 },
  card: {
    flexDirection: 'row', gap: 12, backgroundColor: '#111118',
    borderRadius: 14, padding: 14, alignItems: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  unreadCard: {
    borderColor: 'rgba(239,68,68,0.25)', backgroundColor: '#ef444408',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: '#f8fafc', fontSize: 14, fontWeight: '700', flex: 1 },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444',
  },
  message: { color: '#94a3b8', fontSize: 13, marginTop: 3, lineHeight: 18 },
  time: { color: '#475569', fontSize: 11, marginTop: 4 },
  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
