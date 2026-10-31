// mobile/src/screens/DiscountsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl
} from 'react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function DiscountsScreen({ navigation }: any) {
  const { user, updateUser } = useAuthStore();
  const isDonor = user?.role === 'donor';
  const isHospital = user?.role === 'hospital';
  const isReceiver = user?.role === 'receiver';

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalDiscounts, setHospitalDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedHospital, setSelectedHospital] = useState('');
  const [treatmentName, setTreatmentName] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState('');

  const loadData = async () => {
    try {
      if (isDonor) {
        const [hospRes, meRes] = await Promise.all([
          api.get('/hospitals'),
          api.get('/auth/me').catch(() => null)
        ]);
        setHospitals(hospRes.data?.hospitals || []);
        if (meRes?.data?.user) updateUser(meRes.data.user);
      } else if (isHospital) {
        const { data } = await api.get('/hospitals/discounts');
        setHospitalDiscounts(data?.discounts || []);
      }
    } catch (err: any) {
      console.log('[DISCOUNTS FETCH ERROR]', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRedeem = async () => {
    if (!selectedHospital || !treatmentName.trim() || !pointsToRedeem) {
      Alert.alert('Required Fields', 'Please fill in all redemption fields.');
      return;
    }

    const pts = parseInt(pointsToRedeem);
    if (isNaN(pts) || pts <= 0) {
      Alert.alert('Invalid Points', 'Please enter a valid positive number of points.');
      return;
    }

    if (pts > (user?.rewardPoints || 0)) {
      Alert.alert('Insufficient Balance', `You currently have ${user?.rewardPoints || 0} reward points.`);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/donors/redeem', {
        hospitalId: selectedHospital,
        treatmentName: treatmentName.trim(),
        points: pts,
      });

      if (data?.user) updateUser(data.user);
      Alert.alert('🎉 Success', 'Treatment discount applied successfully!');
      setSelectedHospital('');
      setTreatmentName('');
      setPointsToRedeem('');
      loadData();
    } catch (err: any) {
      Alert.alert('Redemption Failed', err.response?.data?.error || 'Could not redeem discount.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Loading Discounts & Vouchers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Treatment Discounts</Text>
          <Text style={styles.headerSubtitle}>
            {isDonor ? 'Redeem Points for Hospital Vouchers' : isHospital ? 'Discounts Applied to Your Hospital' : 'How Rewards Work'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
      >
        {/* DONOR VIEW */}
        {isDonor && (
          <>
            {/* Points Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available Reward Points</Text>
              <Text style={styles.balanceValue}>{user?.rewardPoints || 0} pts</Text>
              <Text style={styles.balanceHint}>1 Point = ₹1 Treatment Discount at Partner Hospitals</Text>
            </View>

            {/* Redemption Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>🎁 Redeem Treatment Voucher</Text>

              {/* Hospital Picker */}
              <Text style={styles.label}>Select Hospital</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hospitalList}>
                {hospitals.map(h => (
                  <TouchableOpacity
                    key={h._id}
                    onPress={() => setSelectedHospital(h._id)}
                    style={[styles.hospitalChip, selectedHospital === h._id && styles.hospitalChipSelected]}
                  >
                    <Text style={[styles.hospitalChipText, selectedHospital === h._id && styles.hospitalChipTextSelected]}>
                      🏥 {h.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Treatment Name Input */}
              <Text style={styles.label}>Treatment / Procedure</Text>
              <TextInput
                style={styles.input}
                value={treatmentName}
                onChangeText={setTreatmentName}
                placeholder="e.g. Dental Checkup, General Surgery"
                placeholderTextColor="#64748b"
              />

              {/* Points Input */}
              <Text style={styles.label}>Points to Redeem (Max: {user?.rewardPoints || 0})</Text>
              <TextInput
                style={styles.input}
                value={pointsToRedeem}
                onChangeText={setPointsToRedeem}
                placeholder="Enter points..."
                placeholderTextColor="#64748b"
                keyboardType="numeric"
              />

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleRedeem}
                disabled={submitting || (user?.rewardPoints || 0) <= 0}
                style={[styles.submitButton, (submitting || (user?.rewardPoints || 0) <= 0) && styles.disabledButton]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Redeem Treatment Discount</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Redemption History */}
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>📜 Redemption History</Text>
              {!(user as any)?.redemptions || (user as any).redemptions.length === 0 ? (
                <Text style={styles.emptyText}>No treatment discounts redeemed yet.</Text>
              ) : (
                (user as any).redemptions.map((item: any, idx: number) => (
                  <View key={idx} style={styles.historyItem}>
                    <View>
                      <Text style={styles.historyHosp}>{item.hospitalName}</Text>
                      <Text style={styles.historyTreatment}>{item.treatmentName}</Text>
                      <Text style={styles.historyDate}>{new Date(item.redeemedAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.historyPts}>-{item.pointsRedeemed} pts</Text>
                      <Text style={styles.historyAmount}>₹{item.discountAmount} Off</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* HOSPITAL VIEW */}
        {isHospital && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>🏥 Applied Donor Discounts</Text>
            {hospitalDiscounts.length === 0 ? (
              <Text style={styles.emptyText}>No discounts applied to your hospital yet.</Text>
            ) : (
              hospitalDiscounts.map((discount: any, idx: number) => (
                <View key={idx} style={styles.historyItem}>
                  <View>
                    <Text style={styles.historyHosp}>Donor: {discount.donorName}</Text>
                    <Text style={styles.historyTreatment}>{discount.treatmentName}</Text>
                    <Text style={styles.historyDate}>{new Date(discount.redeemedAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.historyPts}>{discount.pointsRedeemed} pts</Text>
                    <Text style={styles.historyAmount}>₹{discount.discountAmount} Discount</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* PATIENT VIEW */}
        {isReceiver && (
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>❤️</Text>
            <Text style={styles.infoTitle}>Donor Treatment Rewards</Text>
            <Text style={styles.infoDesc}>
              Blood donors earn 100 reward points for every completed donation, which can be redeemed for discounts on hospital procedures and consultations.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#111118',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backButton: { paddingRight: 16 },
  backIcon: { fontSize: 24, color: '#f8fafc' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  scrollContent: { padding: 16 },
  balanceCard: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: { color: '#eab308', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  balanceValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4 },
  balanceHint: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  formCard: {
    backgroundColor: '#111118',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  hospitalList: { flexDirection: 'row', marginBottom: 12 },
  hospitalChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  hospitalChipSelected: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  hospitalChipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  hospitalChipTextSelected: { color: '#fff' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: { opacity: 0.4 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  historyCard: {
    backgroundColor: '#111118',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  historyTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', marginVertical: 16 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyHosp: { color: '#fff', fontSize: 14, fontWeight: '700' },
  historyTreatment: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  historyDate: { color: '#64748b', fontSize: 11, marginTop: 2 },
  historyPts: { color: '#eab308', fontSize: 13, fontWeight: '800' },
  historyAmount: { color: '#22c55e', fontSize: 14, fontWeight: '800', marginTop: 2 },
  infoCard: {
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  infoIcon: { fontSize: 40, marginBottom: 12 },
  infoTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
  infoDesc: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
