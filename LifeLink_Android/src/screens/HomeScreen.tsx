// src/screens/HomeScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Animated, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import api from '../services/api';

const { width } = Dimensions.get('window');

// Animated stat card
function StatCard({ label, value, emoji, color }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, []);
  return (
    <Animated.View style={[styles.statCard, { transform: [{ scale: anim }], borderColor: color + '40' }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// Request feed item
function FeedItem({ req, onPress }: { req: any; onPress: () => void }) {
  const priorityColors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6',
  };
  const color = priorityColors[req.priority] || '#64748b';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.feedCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
        <View style={styles.feedLeft}>
          <View style={[styles.bloodBadge, { borderColor: color }]}>
            <Text style={[styles.bloodBadgeText, { color }]}>{req.bloodGroup}</Text>
          </View>
          <View style={styles.feedInfo}>
            <Text style={styles.feedHospital} numberOfLines={1}>{req.hospitalName}</Text>
            <Text style={styles.feedDetails}>{req.unitsRequired} units · {req.location?.address?.split(',')[0]}</Text>
          </View>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: color + '20', borderColor: color + '60' }]}>
          <Text style={[styles.priorityText, { color }]}>{req.priority?.toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { user, updateUser } = useAuthStore();
  const { socket, activeRequests } = useSocketStore();
  const [stats, setStats] = useState({ active: 0, fulfilled: 0, donors: 0 });
  const [dbRequests, setDbRequests] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/requests/stats');
      setStats({ active: data.active || 0, fulfilled: data.fulfilled || 0, donors: data.totalDonors || data.total || 0 });
    } catch {}

    // Fetch live requests from other accounts!
    try {
      const { data } = await api.get('/requests?status=active');
      const allRequests = data.requests || [];
      const others = allRequests.filter((req: any) => {
        const requesterId = req.requestedBy?._id || req.requestedBy;
        return requesterId !== user?._id;
      });
      setDbRequests(others);
    } catch (err) {
      console.log('Error loading requests:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    if (!socket) return;

    socket.on('new_request', fetchStats);
    socket.on('request_accepted', fetchStats);
    socket.on('request_fulfilled', fetchStats);
    socket.on('donor_reward_update', (data: any) => {
      fetchStats();
      if (data?.rewardPoints !== undefined && user) {
        updateUser({ rewardPoints: data.rewardPoints, totalDonations: data.totalDonations });
      }
    });

    return () => {
      socket.off('new_request', fetchStats);
      socket.off('request_accepted', fetchStats);
      socket.off('request_fulfilled', fetchStats);
      socket.off('donor_reward_update');
    };
  }, [socket]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Morning';
    if (hours < 17) return 'Afternoon';
    return 'Evening';
  };

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Hero Header */}
        <LinearGradient colors={['#1a0505', '#0a0a0f']} style={styles.hero}>
          <SafeAreaView>
            <Animated.View style={{ opacity: headerOpacity }}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.greeting}>Good {getGreeting()} 👋</Text>
                  <Text style={styles.heroName}>{user?.name?.split(' ')[0]}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Notifications')}
                  style={styles.notifButton}
                >
                  <Text style={{ fontSize: 22 }}>🔔</Text>
                  <View style={styles.notifDot} />
                </TouchableOpacity>
              </View>

              {/* Blood group & availability */}
              <View style={styles.heroRow}>
                {user?.bloodGroup && (
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{user.bloodGroup}</Text>
                  </View>
                )}
                {user?.role === 'donor' && (
                  <View style={[styles.availBadge, { backgroundColor: user?.isAvailable ? '#22c55e20' : '#64748b20' }]}>
                    <View style={[styles.availDot, { backgroundColor: user?.isAvailable ? '#22c55e' : '#64748b' }]} />
                    <Text style={[styles.availText, { color: user?.isAvailable ? '#22c55e' : '#64748b' }]}>
                      {user?.isAvailable ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Emergency CTA */}
            <TouchableOpacity
              onPress={() => navigation.navigate('EmergencyModal')}
              style={styles.emergencyCTA}
              activeOpacity={0.9}
            >
              <LinearGradient colors={['#dc2626', '#7f1d1d']} style={styles.emergencyGrad}>
                <Text style={styles.emergencyIcon}>🚨</Text>
                <View>
                  <Text style={styles.emergencyTitle}>EMERGENCY BLOOD REQUEST</Text>
                  <Text style={styles.emergencySubtitle}>Broadcast to nearby donors instantly</Text>
                </View>
                <Text style={styles.emergencyArrow}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard label="Active" value={stats.active} emoji="🩸" color="#ef4444" />
            <StatCard label="Saved" value={stats.fulfilled} emoji="✅" color="#22c55e" />
            <StatCard label="Donors" value={stats.donors} emoji="👥" color="#3b82f6" />
          </View>

          {/* Donor personal stats */}
          {user?.role === 'donor' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Impact</Text>
              <View style={styles.impactCard}>
                <LinearGradient colors={['rgba(220,38,38,0.15)', 'rgba(127,29,29,0.1)']} style={styles.impactGrad}>
                  <View style={styles.impactRow}>
                    {[
                      { label: 'Donations', value: user.totalDonations || 0 },
                      { label: 'Points', value: user.rewardPoints || 0 },
                      { label: 'Badges', value: user.badges?.length || 0 },
                    ].map((item, i) => (
                      <View key={item.label} style={[styles.impactItem, i > 0 && styles.impactBorder]}>
                        <Text style={styles.impactValue}>{item.value}</Text>
                        <Text style={styles.impactLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {[
                { label: '🗺 Find Donors', screen: 'Map', color: '#1e3a5f' },
                { label: '🎁 Discounts', screen: 'Discounts', color: '#701a75' },
                { label: '🏆 Leaderboard', screen: 'Leaderboard', color: '#451a03' },
                { label: '💉 History', screen: 'DonationHistory', color: '#2d1b69' },
              ].map(action => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => navigation.navigate(action.screen)}
                  style={[styles.actionCard, { backgroundColor: action.color }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Live Request Feed */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Requests</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            {dbRequests.length === 0 ? (
              <View style={styles.emptyRequestsCard}>
                <Text style={styles.emptyRequestsText}>No active requests from other accounts</Text>
              </View>
            ) : (
              dbRequests.slice(0, 5).map(req => (
                <FeedItem
                  key={req._id}
                  req={req}
                  onPress={() => navigation.navigate('RequestDetail', { request: req, requestId: req._id })}
                />
              ))
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('Requests')}
              style={styles.viewAllBtn}
            >
              <Text style={styles.viewAllText}>View all requests →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  hero: { paddingBottom: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 10, marginBottom: 12 },
  greeting: { color: '#94a3b8', fontSize: 14, marginBottom: 2 },
  heroName: { color: '#ffffff', fontSize: 26, fontWeight: '800' },
  notifButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#0a0a0f' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  heroBadge: { backgroundColor: 'rgba(220,38,38,0.2)', borderRadius: 10, borderWidth: 2, borderColor: 'rgba(220,38,38,0.5)', paddingHorizontal: 14, paddingVertical: 6 },
  heroBadgeText: { color: '#ef4444', fontWeight: '800', fontSize: 16 },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 12, fontWeight: '600' },
  emergencyCTA: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', elevation: 8, shadowColor: '#dc2626', shadowOpacity: 0.4, shadowRadius: 12 },
  emergencyGrad: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  emergencyIcon: { fontSize: 32 },
  emergencyTitle: { color: '#ffffff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  emergencySubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  emergencyArrow: { color: 'rgba(255,255,255,0.6)', fontSize: 28, marginLeft: 'auto' },
  content: { padding: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center' },
  statEmoji: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  impactCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)' },
  impactGrad: { padding: 20 },
  impactRow: { flexDirection: 'row' },
  impactItem: { flex: 1, alignItems: 'center' },
  impactBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  impactValue: { color: '#ef4444', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  impactLabel: { color: '#94a3b8', fontSize: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: (width - 52) / 2, borderRadius: 14, padding: 18 },
  actionText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  feedCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  feedLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  bloodBadge: { width: 46, height: 46, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220,38,38,0.1)' },
  bloodBadgeText: { fontWeight: '800', fontSize: 13 },
  feedInfo: { flex: 1 },
  feedHospital: { color: '#f1f5f9', fontWeight: '600', fontSize: 14, marginBottom: 3 },
  feedDetails: { color: '#64748b', fontSize: 12 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { color: '#ef4444', fontSize: 10, fontWeight: '700' },
  viewAllBtn: { marginTop: 6, alignItems: 'center', padding: 12 },
  viewAllText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  emptyRequestsCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 24, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 10 },
  emptyRequestsText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
});
