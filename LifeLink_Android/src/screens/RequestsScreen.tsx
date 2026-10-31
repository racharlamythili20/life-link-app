// src/screens/RequestsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

import { isDonorCompatible } from '../utils/bloodCompatibility';

export default function RequestsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const filters = ['All', 'A+', 'B+', 'O+', 'AB+', 'critical', 'high'];

  const fetchRequests = async () => {
    try {
      const params = filter !== 'All' && ['critical', 'high', 'medium'].includes(filter)
        ? `?priority=${filter}` : filter !== 'All' ? `?bloodGroup=${filter}` : '';
      const { data } = await api.get(`/requests${params}`);
      setRequests(data.requests || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleAccept = async (id: string) => {
    try {
      await api.put(`/requests/${id}/accept`);
      Alert.alert('✅ Accepted!', 'Contact the patient to coordinate your donation.');
      fetchRequests();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to accept');
    }
  };

  const priorityColors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6',
  };

  const renderItem = ({ item }: any) => {
    const color = priorityColors[item.priority] || '#64748b';
    const u = user as any;
    const currentUserId = (u?._id || u?.id)?.toString();
    const myResponse = item.responses?.find(
      (r: any) => (r.donor?._id || r.donor?.id || r.donor)?.toString() === currentUserId
    );
    const hasAccepted = !!myResponse && myResponse.status === 'accepted';
    const hasDonated = !!myResponse && myResponse.status === 'donated';
    const anotherDonorAccepted = !hasAccepted && !hasDonated && item.responses?.some((r: any) => {
      const dId = (r.donor?._id || r.donor?.id || r.donor)?.toString();
      return dId !== currentUserId && (r.status === 'accepted' || r.status === 'donated');
    });
    const compatible = isDonorCompatible(user?.bloodGroup, item.bloodGroup);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('RequestDetail', { request: item, requestId: item._id })}
        style={[styles.card, { borderLeftColor: color }]}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <View style={[styles.bloodBadge, { borderColor: color }]}>
            <Text style={[styles.bloodText, { color }]}>{item.bloodGroup}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hospitalName} numberOfLines={1}>{item.hospitalName}</Text>
            <Text style={styles.patientName}>{item.patientName}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
            <Text style={[styles.priorityText, { color }]}>{item.priority?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>🩸 {item.unitsRequired} units needed ({item.unitsCollected} collected)</Text>
          {item.location?.address && (
            <Text style={styles.metaText} numberOfLines={1}>📍 {item.location.address.split(',').slice(0, 2).join(',')}</Text>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, {
            width: `${Math.min(100, (item.unitsCollected / item.unitsRequired) * 100)}%`,
            backgroundColor: color,
          }]} />
        </View>

        {hasAccepted && (
          <View style={styles.acceptedBanner}>
            <Text style={styles.acceptedText}>✅ You accepted this request</Text>
          </View>
        )}
        {anotherDonorAccepted && (
          <View style={[styles.acceptedBanner, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
            <Text style={[styles.acceptedText, { color: '#f87171' }]}>🔒 Accepted by another donor</Text>
          </View>
        )}
        {!hasAccepted && !anotherDonorAccepted && item.status === 'active' && user?.role === 'donor' && (
          <TouchableOpacity
            onPress={() => handleAccept(item._id)}
            style={[styles.acceptBtn, { borderColor: color + '60', backgroundColor: color + '15' }]}
          >
            <Text style={[styles.acceptText, { color }]}>✓ Accept & Donate</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🩸 Blood Requests</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EmergencyModal')} style={styles.newBtn}>
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={i => i}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item)}
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color="#ef4444" size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} tintColor="#ef4444" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🩸</Text>
              <Text style={styles.emptyTitle}>No requests found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '700' },
  newBtn: { backgroundColor: 'rgba(220,38,38,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(220,38,38,0.4)' },
  newBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterChipActive: { backgroundColor: 'rgba(220,38,38,0.2)', borderColor: 'rgba(220,38,38,0.5)' },
  filterText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#ef4444' },
  listContent: { padding: 16, gap: 14, paddingBottom: 100 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderLeftWidth: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  bloodBadge: { width: 46, height: 46, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220,38,38,0.1)' },
  bloodText: { fontWeight: '800', fontSize: 13 },
  hospitalName: { color: '#f1f5f9', fontWeight: '600', fontSize: 15, marginBottom: 2 },
  patientName: { color: '#64748b', fontSize: 12 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  cardMeta: { gap: 4, marginBottom: 12 },
  metaText: { color: '#64748b', fontSize: 12 },
  progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  acceptBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  acceptText: { fontWeight: '700', fontSize: 14 },
  acceptedBanner: { backgroundColor: 'rgba(34,197,94,0.1)', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  acceptedText: { color: '#22c55e', fontWeight: '600', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#94a3b8', fontSize: 18, fontWeight: '600' },
  emptyText: { color: '#4b5563', fontSize: 14, marginTop: 4 },
});
