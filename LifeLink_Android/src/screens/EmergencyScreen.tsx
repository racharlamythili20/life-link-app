// src/screens/EmergencyScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PRIORITIES = [
  { id: 'critical', label: '🚨 Critical', color: '#ef4444' },
  { id: 'high', label: '⚠️ High', color: '#f97316' },
  { id: 'medium', label: '🔔 Medium', color: '#eab308' },
  { id: 'low', label: '📋 Low', color: '#3b82f6' },
];

export default function EmergencyScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [donorsNotified, setDonorsNotified] = useState(0);
  const [gettingLoc, setGettingLoc] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [form, setForm] = useState({
    patientName: '', contactNumber: '', bloodGroup: '',
    unitsRequired: '1', hospitalName: '', medicalReason: '', priority: 'medium',
  });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const getLocation = async () => {
    setGettingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Location permission required'); setGettingLoc(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const address = [geo?.street, geo?.city, geo?.region].filter(Boolean).join(', ');
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude, address });
    } catch { Alert.alert('Error', 'Could not get location'); }
    setGettingLoc(false);
  };

  const handleSubmit = async () => {
    if (!location) return Alert.alert('Location Required', 'Please get your location first');
    if (!form.bloodGroup) return Alert.alert('Blood Group Required', 'Please select a blood group');
    if (!form.patientName || !form.contactNumber || !form.hospitalName) {
      return Alert.alert('Required Fields', 'Please fill all required fields');
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/requests', {
        ...form,
        unitsRequired: parseInt(form.unitsRequired),
        location: { type: 'Point', coordinates: [location.lng, location.lat], address: location.address },
        isEmergency: form.priority === 'critical',
      });
      setDonorsNotified(data.donorsNotified || 0);
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send request');
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <LinearGradient colors={['#1a0505', '#0a0a0f']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 80 }}>✅</Text>
        <Text style={styles.successTitle}>REQUEST SENT!</Text>
        <Text style={styles.successSub}>
          Broadcast to <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 28 }}>{donorsNotified}</Text> nearby donors
        </Text>
        <View style={styles.successBtns}>
          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.primaryBtn}>
            <LinearGradient colors={['#dc2626', '#7f1d1d']} style={styles.btnGrad}>
              <Text style={styles.btnText}>Go to Dashboard</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setSubmitted(false); setForm({ patientName: '', contactNumber: '', bloodGroup: '', unitsRequired: '1', hospitalName: '', medicalReason: '', priority: 'medium' }); setLocation(null); }} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>New Request</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚨 Emergency Request</Text>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.formContent}>

          {/* Priority */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚡ Urgency Level</Text>
            <View style={styles.priorityGrid}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p.id} onPress={() => update('priority', p.id)}
                  style={[styles.priorityChip, form.priority === p.id && { borderColor: p.color, backgroundColor: p.color + '20' }]}>
                  <Text style={[styles.priorityChipText, form.priority === p.id && { color: p.color }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Blood Group */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🩸 Blood Group *</Text>
            <View style={styles.bgGrid}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity key={bg} onPress={() => update('bloodGroup', bg)}
                  style={[styles.bgChip, form.bloodGroup === bg && styles.bgChipActive]}>
                  <Text style={[styles.bgText, form.bloodGroup === bg && styles.bgTextActive]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.unitsLabel}>Units Required: <Text style={styles.unitsValue}>{form.unitsRequired}</Text></Text>
            <View style={styles.unitsRow}>
              {['1', '2', '3', '4', '5'].map(n => (
                <TouchableOpacity key={n} onPress={() => update('unitsRequired', n)}
                  style={[styles.unitBtn, form.unitsRequired === n && styles.unitBtnActive]}>
                  <Text style={[styles.unitText, form.unitsRequired === n && styles.unitTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Patient Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 Patient Information</Text>
            {[
              { key: 'patientName', placeholder: 'Patient Name *', keyboard: 'default' },
              { key: 'contactNumber', placeholder: 'Contact Number *', keyboard: 'phone-pad' },
              { key: 'hospitalName', placeholder: 'Hospital Name *', keyboard: 'default' },
              { key: 'medicalReason', placeholder: 'Medical Reason (optional)', keyboard: 'default' },
            ].map(f => (
              <TextInput
                key={f.key}
                value={(form as any)[f.key]}
                onChangeText={v => update(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor="#4b5563"
                keyboardType={f.keyboard as any}
                style={styles.input}
              />
            ))}
          </View>

          {/* Location */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Hospital Location</Text>
            <TouchableOpacity onPress={getLocation} disabled={gettingLoc} style={styles.locBtn}>
              {gettingLoc ? <ActivityIndicator color="#3b82f6" size="small" /> : <Text style={{ fontSize: 18 }}>📍</Text>}
              <Text style={styles.locBtnText}>{gettingLoc ? 'Getting location...' : 'Use Current GPS Location'}</Text>
            </TouchableOpacity>
            {location && (
              <View style={styles.locSuccess}>
                <Text style={styles.locSuccessText}>✅ {location.address}</Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.9} style={{ marginBottom: 40 }}>
            <LinearGradient colors={['#dc2626', '#7f1d1d']} style={styles.submitBtn}>
              {submitting
                ? <ActivityIndicator color="white" />
                : <Text style={styles.submitText}>🚨  SEND EMERGENCY REQUEST</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 8 },
  backText: { color: '#94a3b8', fontSize: 14 },
  headerTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  formContent: { padding: 16, gap: 16 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardTitle: { color: '#f1f5f9', fontWeight: '700', fontSize: 16, marginBottom: 14 },
  priorityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  priorityChip: { flex: 1, minWidth: 120, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  priorityChipText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  bgChip: { width: 62, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  bgChipActive: { borderColor: '#ef4444', backgroundColor: 'rgba(220,38,38,0.2)' },
  bgText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  bgTextActive: { color: '#ef4444' },
  unitsLabel: { color: '#94a3b8', fontSize: 14, marginBottom: 10 },
  unitsValue: { color: '#ef4444', fontWeight: '800' },
  unitsRow: { flexDirection: 'row', gap: 10 },
  unitBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  unitBtnActive: { borderColor: '#ef4444', backgroundColor: 'rgba(220,38,38,0.2)' },
  unitText: { color: '#64748b', fontWeight: '700', fontSize: 16 },
  unitTextActive: { color: '#ef4444' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#f1f5f9', fontSize: 14, marginBottom: 10 },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', padding: 14 },
  locBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  locSuccess: { marginTop: 10, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  locSuccessText: { color: '#22c55e', fontSize: 13 },
  submitBtn: { borderRadius: 16, padding: 20, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  successTitle: { color: '#ffffff', fontSize: 32, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  successSub: { color: '#94a3b8', fontSize: 18, textAlign: 'center', marginBottom: 32 },
  successBtns: { width: '100%', gap: 12 },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  btnGrad: { padding: 18, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { padding: 18, alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  secondaryBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
});
