// src/screens/DonationHistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Donation {
  _id: string;
  bloodGroup: string;
  hospitalName: string;
  unitsGiven: number;
  donatedAt: string;
  rewardPoints: number;
  certificate?: string;
}

const BLOOD_COLORS: Record<string, string> = {
  'A+': '#ef4444', 'A-': '#f97316', 'B+': '#8b5cf6',
  'B-': '#3b82f6', 'AB+': '#ec4899', 'AB-': '#06b6d4',
  'O+': '#22c55e', 'O-': '#f59e0b',
};

export default function DonationHistoryScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, points: 0, lives: 0 });

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/donors/me/donations');
      setDonations(data.donations || []);
      const total = data.donations?.length || 0;
      const points = data.donations?.reduce((s: number, d: Donation) => s + (d.rewardPoints || 0), 0) || 0;
      setStats({ total, points, lives: total * 3 });
    } catch {
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  const renderDonation = ({ item }: { item: Donation }) => {
    const color = BLOOD_COLORS[item.bloodGroup] || '#ef4444';
    return (
      <View style={styles.card}>
        <View style={[styles.bloodDot, { backgroundColor: color }]}>
          <Text style={styles.bloodTxt}>{item.bloodGroup}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.hospital}>{item.hospitalName}</Text>
          <Text style={styles.date}>{new Date(item.donatedAt).toLocaleDateString()}</Text>
          <Text style={styles.units}>{item.unitsGiven} unit(s) donated</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsIcon}>⭐</Text>
          <Text style={styles.pointsTxt}>+{item.rewardPoints}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donation History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard icon="🩸" value={stats.total} label="Donations" />
        <StatCard icon="⭐" value={stats.points} label="Points" />
        <StatCard icon="❤️" value={stats.lives} label="Lives Saved" />
      </View>

      {loading ? (
        <ActivityIndicator color="#ef4444" style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={donations}
          keyExtractor={i => i._id}
          renderItem={renderDonation}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🩸</Text>
              <Text style={styles.emptyTitle}>No Donations Yet</Text>
              <Text style={styles.emptySubtitle}>Your donation history will appear here after you donate blood.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', padding: 16, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: '#111118', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#111118', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  bloodDot: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  bloodTxt: { color: '#fff', fontSize: 14, fontWeight: '900' },
  cardInfo: { flex: 1 },
  hospital: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  date: { color: '#64748b', fontSize: 12, marginTop: 2 },
  units: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  pointsBadge: { alignItems: 'center' },
  pointsIcon: { fontSize: 16 },
  pointsTxt: { color: '#f59e0b', fontSize: 14, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
