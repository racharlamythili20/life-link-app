// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ROLES = [
  { id: 'donor', label: '🩸 Blood Donor' },
  { id: 'receiver', label: '🏥 Patient/Receiver' },
  { id: 'hospital', label: '🏨 Hospital' },
];

export default function RegisterScreen({ navigation }: any) {
  const { register, isLoading } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'donor', bloodGroup: '', phone: '' });
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleRegister = async () => {
    if (submitting || isLoading) return;
    if (!form.name || !form.email || !form.password) return Alert.alert('Error', 'Fill all required fields');
    if (form.role === 'donor' && !form.bloodGroup) return Alert.alert('Error', 'Please select your blood group');
    
    setSubmitting(true);
    try {
      await register(form);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.response?.data?.error || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#1a0505', '#0a0a0f']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
          </View>

          <View style={styles.card}>
            {/* Role selection */}
            <Text style={styles.label}>I am a...</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity key={r.id} onPress={() => update('role', r.id)}
                  style={[styles.roleChip, form.role === r.id && styles.roleChipActive]}>
                  <Text style={[styles.roleText, form.role === r.id && styles.roleTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Basic info */}
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'John Doe', keyboard: 'default' },
              { key: 'email', label: 'Email *', placeholder: 'you@example.com', keyboard: 'email-address' },
              { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', keyboard: 'phone-pad' },
              { key: 'password', label: 'Password *', placeholder: 'Min 8 characters', keyboard: 'default', secure: true },
            ].map(f => (
              <View key={f.key} style={styles.inputGroup}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  value={(form as any)[f.key]}
                  onChangeText={v => update(f.key, v)}
                  placeholder={f.placeholder}
                  placeholderTextColor="#4b5563"
                  keyboardType={f.keyboard as any}
                  secureTextEntry={!!f.secure}
                  autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                  style={styles.input}
                />
              </View>
            ))}

            {/* Blood group (donors only) */}
            {form.role === 'donor' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Blood Group *</Text>
                <View style={styles.bgGrid}>
                  {BLOOD_GROUPS.map(bg => (
                    <TouchableOpacity key={bg} onPress={() => update('bloodGroup', bg)}
                      style={[styles.bgChip, form.bloodGroup === bg && styles.bgChipActive]}>
                      <Text style={[styles.bgText, form.bloodGroup === bg && styles.bgTextActive]}>{bg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity onPress={handleRegister} disabled={isLoading || submitting} activeOpacity={0.9} style={{ marginTop: 8 }}>
              <LinearGradient colors={['#dc2626', '#7f1d1d']} style={styles.submitBtn}>
                {isLoading || submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>🩸  Create Account</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backBtn: { padding: 8 },
  backText: { color: '#94a3b8', fontSize: 22 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '800' },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)' },
  roleRow: { gap: 8, marginBottom: 20 },
  roleChip: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
  roleChipActive: { borderColor: 'rgba(220,38,38,0.6)', backgroundColor: 'rgba(220,38,38,0.1)' },
  roleText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
  roleTextActive: { color: '#ef4444' },
  inputGroup: { marginBottom: 14 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#f1f5f9', fontSize: 15 },
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bgChip: { width: 62, paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  bgChipActive: { borderColor: '#ef4444', backgroundColor: 'rgba(220,38,38,0.15)' },
  bgText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  bgTextActive: { color: '#ef4444' },
  submitBtn: { borderRadius: 14, padding: 18, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: '800', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
});
