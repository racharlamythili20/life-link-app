// src/screens/LeaderboardScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface LeaderEntry {
  _id: string;
  name: string;
  profileImage?: string;
  totalDonations: number;
  rewardPoints: number;
  bloodGroup?: string;
  badges: Array<{ name: string; icon: string }>;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const BLOOD_COLORS: Record<string, string> = {
  'A+': '#ef4444', 'A-': '#f97316', 'B+': '#8b5cf6',
  'B-': '#3b82f6', 'AB+': '#ec4899', 'AB-': '#06b6d4',
  'O+': '#22c55e', 'O-': '#f59e0b',
};

export default function LeaderboardScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data } = await api.get('/donors/leaderboard');
      const list = data.leaders || data.leaderboard || [];
      setEntries(list);
      const rank = list.findIndex((e: LeaderEntry) => e._id === user?._id);
      if (rank !== undefined && rank >= 0) setMyRank(rank + 1);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const renderEntry = ({ item, index }: { item: LeaderEntry; index: number }) => {
    const isMe = item._id === user?._id;
    const medal = MEDALS[index] || null;
    const bgColor = BLOOD_COLORS[item.bloodGroup || ''] || '#ef4444';

    return (
      <View style={[styles.row, isMe && styles.myRow]}>
        {/* Rank */}
        <View style={styles.rankBox}>
          {medal
            ? <Text style={styles.medal}>{medal}</Text>
            : <Text style={styles.rank}>#{index + 1}</Text>
          }
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: bgColor + '44', borderColor: bgColor }]}>
          <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || '?'}</Text>
        </View>

        {/* Name & badges */}
        <View style={styles.nameBox}>
          <Text style={[styles.name, isMe && styles.myName]} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.badgeRow}>
            {item.badges?.slice(0, 3).map(b => b.icon).join(' ')}
            {item.bloodGroup && <Text style={{ color: bgColor }}> {item.bloodGroup}</Text>}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsBox}>
          <Text style={styles.points}>⭐ {item.rewardPoints}</Text>
          <Text style={styles.donationCount}>🩸 {item.totalDonations}</Text>
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
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
        <View style={{ width: 60 }} />
      </View>

      {myRank && (
        <View style={styles.myRankBanner}>
          <Text style={styles.myRankText}>Your Rank: #{myRank}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#ef4444" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={i => i._id}
          renderItem={renderEntry}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No data available yet. Start donating!</Text>
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
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  myRankBanner: {
    backgroundColor: '#ef444422', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#ef444444',
  },
  myRankText: { color: '#ef4444', fontSize: 16, fontWeight: '800' },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111118', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  myRow: {
    borderColor: '#ef4444', backgroundColor: '#ef444411',
  },
  rankBox: { width: 36, alignItems: 'center' },
  rank: { color: '#64748b', fontSize: 16, fontWeight: '700' },
  medal: { fontSize: 24 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  nameBox: { flex: 1 },
  name: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  myName: { color: '#ef4444' },
  badgeRow: { color: '#64748b', fontSize: 12, marginTop: 2 },
  statsBox: { alignItems: 'flex-end', gap: 2 },
  points: { color: '#f59e0b', fontSize: 14, fontWeight: '700' },
  donationCount: { color: '#94a3b8', fontSize: 12 },
  empty: { color: '#475569', textAlign: 'center', marginTop: 60, fontSize: 14 },
});
