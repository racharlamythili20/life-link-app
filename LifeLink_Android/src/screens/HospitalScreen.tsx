// src/screens/HospitalScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, FlatList, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BLOOD_COLORS: Record<string, string> = {
  'A+': '#ef4444', 'A-': '#f97316', 'B+': '#8b5cf6',
  'B-': '#3b82f6', 'AB+': '#ec4899', 'AB-': '#06b6d4',
  'O+': '#22c55e', 'O-': '#f59e0b',
};

export default function HospitalScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ activeRequests: 0, totalRequests: 0 });
  const [requests, setRequests] = useState<any[]>([]);

  // Modal State for Inventory Actions
  const [showStockModal, setShowStockModal] = useState(false);
  const [modalAction, setModalAction] = useState<'added' | 'used'>('added');
  const [selectedBg, setSelectedBg] = useState('A+');
  const [unitsInput, setUnitsInput] = useState('1');
  const [reasonInput, setReasonInput] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);

  useEffect(() => {
    fetchHospitalData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchHospitalData();
    }, [])
  );

  useEffect(() => {
    if (!socket) return;
    const handleInventoryUpdate = (data: any) => {
      console.log('[INV TRACE] socket inventory_updated payload:', JSON.stringify(data));
      if (data?.inventory) {
        const invMap: Record<string, number> = {};
        Object.keys(data.inventory).forEach(bg => {
          const val = data.inventory[bg];
          if (val !== undefined && val !== null) {
            invMap[bg] = typeof val === 'object' ? (val?.units ?? 0) : (val ?? 0);
          }
        });
        console.log('[INV TRACE] Merging inventory map into state:', invMap);
        setInventory((prev: Record<string, number>) => ({ ...prev, ...invMap }));
      } else if (data?.bloodGroup && data?.newInventoryQuantity !== undefined) {
        console.log(`[INV TRACE] Updating single bloodGroup ${data.bloodGroup} = ${data.newInventoryQuantity}`);
        setInventory((prev: Record<string, number>) => ({
          ...prev,
          [data.bloodGroup]: data.newInventoryQuantity
        }));
      } else {
        fetchHospitalData();
      }
    };

    socket.on('inventory_updated', handleInventoryUpdate);
    socket.on('new_request', fetchHospitalData);
    socket.on('request_accepted', fetchHospitalData);
    socket.on('request_fulfilled', fetchHospitalData);

    return () => {
      socket.off('inventory_updated', handleInventoryUpdate);
      socket.off('new_request', fetchHospitalData);
      socket.off('request_accepted', fetchHospitalData);
      socket.off('request_fulfilled', fetchHospitalData);
    };
  }, [socket]);

  const fetchHospitalData = async () => {
    try {
      const u = user as any;
      const hospitalId = u?._id || u?.id;

      // 1. PRIMARY CANONICAL INVENTORY FETCH: Dedicated inventory endpoint
      if (hospitalId) {
        try {
          const { data: invData } = await api.get(`/hospitals/${hospitalId}/inventory`);
          const invObj = invData?.inventory?.inventory || invData?.inventory;
          if (invObj) {
            const invMap: Record<string, number> = {};
            Object.keys(invObj).forEach(bg => {
              const val = invObj[bg];
              invMap[bg] = typeof val === 'object' ? (val?.units ?? 0) : (val ?? 0);
            });
            setInventory((prev: Record<string, number>) => ({ ...prev, ...invMap }));
          }
        } catch (err: any) {
          console.log('[CANONICAL INVENTORY FETCH ERROR]', err.message);
        }
      }

      // 2. Fetch stats (activeRequests & totalRequests)
      try {
        const { data: statsData } = await api.get('/hospitals/dashboard/stats');
        if (statsData) {
          setStats({
            activeRequests: statsData.activeRequests || 0,
            totalRequests: statsData.totalRequests || 0,
          });
        }
      } catch (err: any) {
        console.log('[STATS FETCH ERROR]', err.message);
      }

      // 3. Fetch hospital's requests
      if (hospitalId) {
        try {
          const { data: reqData } = await api.get(`/requests?requestedBy=${hospitalId}&status=all`);
          setRequests(reqData?.requests || []);
        } catch {}
      }

    } catch (err: any) {
      console.log('[HOSPITAL DASHBOARD FETCH ERROR]', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateStock = async () => {
    const units = parseInt(unitsInput);
    if (isNaN(units) || units <= 0) {
      return Alert.alert('Invalid Units', 'Please enter a valid number of units.');
    }

    setSubmittingStock(true);
    try {
      const { data } = await api.put('/hospitals/inventory', {
        bloodGroup: selectedBg,
        units,
        action: modalAction,
        reason: reasonInput || `${modalAction === 'added' ? 'Stock addition' : 'Patient blood usage'}`,
      });

      if (data.inventory?.inventory) {
        const invMap: Record<string, number> = {};
        Object.keys(data.inventory.inventory).forEach(bg => {
          invMap[bg] = data.inventory.inventory[bg].units || 0;
        });
        setInventory((prev: Record<string, number>) => ({ ...prev, ...invMap }));
      }

      Alert.alert('✅ Success', `Inventory updated successfully! (${selectedBg}: ${modalAction === 'added' ? '+' : '-'}${units} units)`);
      setShowStockModal(false);
      setUnitsInput('1');
      setReasonInput('');
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.error || 'Failed to update inventory.');
    } finally {
      setSubmittingStock(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHospitalData();
  };

  const openStockModal = (bg: string, action: 'added' | 'used') => {
    setSelectedBg(bg);
    setModalAction(action);
    setShowStockModal(true);
  };

  const totalInventoryUnits = Object.values(inventory).reduce((a: number, b: number) => a + b, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏥 Hospital Dashboard</Text>
          <Text style={styles.headerSub}>{user?.name || 'Medical Center'}</Text>
        </View>
        <TouchableOpacity style={styles.emergencyBtn} onPress={() => navigation.navigate('EmergencyModal')}>
          <Text style={styles.emergencyBtnText}>🚨 New Patient Request</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalInventoryUnits}</Text>
            <Text style={styles.statLabel}>Total Units in Stock</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.activeRequests}</Text>
            <Text style={styles.statLabel}>Active Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.totalRequests}</Text>
            <Text style={styles.statLabel}>Total Created</Text>
          </View>
        </View>

        {/* Live Blood Inventory Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🩸 Real-Time Blood Inventory</Text>
          <TouchableOpacity onPress={() => openStockModal('A+', 'added')}>
            <Text style={styles.addStockLink}>+ Manage Stock</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inventoryGrid}>
          {BLOOD_GROUPS.map(bg => {
            const count = inventory[bg] || 0;
            const color = BLOOD_COLORS[bg] || '#ef4444';
            return (
              <View key={bg} style={[styles.bgCard, { borderColor: color + '44' }]}>
                <View style={[styles.bgHeader, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.bgTitle, { color }]}>{bg}</Text>
                </View>
                <Text style={styles.unitsCount}>{count}</Text>
                <Text style={styles.unitsLabel}>units in stock</Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.stockActionBtn} onPress={() => openStockModal(bg, 'added')}>
                    <Text style={{ color: '#22c55e', fontWeight: 'bold' }}>+ Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stockActionBtn} onPress={() => openStockModal(bg, 'used')}>
                    <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>- Use</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Recent Hospital Requests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 Hospital Patient Requests</Text>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No requests created yet. Tap "New Patient Request" above to broadcast a blood request to nearby donors.</Text>
          </View>
        ) : (
          requests.map((req: any) => (
            <TouchableOpacity
              key={req._id}
              style={styles.requestCard}
              onPress={() => navigation.navigate('RequestDetail', { request: req, requestId: req._id })}
            >
              <View style={styles.reqTop}>
                <Text style={styles.patientName}>{req.patientName || 'Patient Request'}</Text>
                <View style={[styles.statusTag, req.status === 'fulfilled' ? styles.statusFulfilled : styles.statusActive]}>
                  <Text style={styles.statusText}>{req.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.reqDetail}>
                Group: <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>{req.bloodGroup}</Text> | Required: {req.unitsRequired} units | Donors Accepted: {req.responses?.length || 0}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Stock Management Modal */}
      <Modal visible={showStockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalAction === 'added' ? '📥 Add Blood Stock' : '📤 Record Blood Consumption'}
            </Text>
            <Text style={styles.modalSub}>
              {modalAction === 'added' ? 'Increase inventory units upon receiving blood.' : 'Deduct inventory units when blood is used for a patient.'}
            </Text>

            <Text style={styles.fieldLabel}>Select Blood Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setSelectedBg(bg)}
                  style={[styles.bgChip, selectedBg === bg && styles.bgChipSelected]}
                >
                  <Text style={[styles.bgChipText, selectedBg === bg && styles.bgChipTextSelected]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Number of Units</Text>
            <TextInput
              style={styles.modalInput}
              value={unitsInput}
              onChangeText={setUnitsInput}
              keyboardType="number-pad"
              placeholder="e.g. 2"
              placeholderTextColor="#475569"
            />

            <Text style={styles.fieldLabel}>Notes / Patient Ref (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={reasonInput}
              onChangeText={setReasonInput}
              placeholder="e.g. Surgery unit dispatch"
              placeholderTextColor="#475569"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowStockModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleUpdateStock} disabled={submittingStock}>
                {submittingStock ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {modalAction === 'added' ? 'Confirm Addition' : 'Deduct Units'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  emergencyBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  emergencyBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  scroll: { flex: 1, padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#111118', padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center',
  },
  statValue: { color: '#22c55e', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 2, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  addStockLink: { color: '#3b82f6', fontWeight: '700', fontSize: 13 },
  inventoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  bgCard: {
    width: '48%', backgroundColor: '#111118', borderRadius: 14, borderWidth: 1,
    padding: 12, alignItems: 'center',
  },
  bgHeader: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
  bgTitle: { fontSize: 16, fontWeight: '900' },
  unitsCount: { color: '#f8fafc', fontSize: 24, fontWeight: '900' },
  unitsLabel: { color: '#64748b', fontSize: 11, marginBottom: 8 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'center' },
  stockActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  requestCard: {
    backgroundColor: '#111118', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  reqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  patientName: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusActive: { backgroundColor: 'rgba(59,130,246,0.15)' },
  statusFulfilled: { backgroundColor: 'rgba(34,197,94,0.15)' },
  statusText: { color: '#3b82f6', fontSize: 10, fontWeight: '800' },
  reqDetail: { color: '#94a3b8', fontSize: 12 },
  emptyCard: { backgroundColor: '#111118', padding: 20, borderRadius: 14, alignItems: 'center' },
  emptyText: { color: '#64748b', textAlign: 'center', fontSize: 13, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#111118', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  modalSub: { color: '#64748b', fontSize: 12, marginBottom: 16 },
  fieldLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  bgChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 8,
  },
  bgChipSelected: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' },
  bgChipText: { color: '#64748b', fontWeight: '700' },
  bgChipTextSelected: { color: '#ef4444' },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 10,
    color: '#f8fafc', fontSize: 14, marginBottom: 14,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelBtnText: { color: '#94a3b8', fontWeight: '600' },
  confirmBtn: { flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '800' },
});
