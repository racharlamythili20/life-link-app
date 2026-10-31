// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen({ navigation }: any) {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill all fields');
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.error || 'Invalid credentials');
    }
  };

  return (
    <LinearGradient colors={['#1a0505', '#0a0a0f', '#0a0a0f']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

            {/* Logo */}
            <View style={styles.logoArea}>
              <View style={styles.bloodDrop} />
              <Text style={styles.logoText}>LIFELINK</Text>
              <Text style={styles.tagline}>Save Lives. Every Second Counts.</Text>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSubtitle}>Sign in to your account</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  value={email} onChangeText={setEmail}
                  placeholder="you@example.com" placeholderTextColor="#4b5563"
                  keyboardType="email-address" autoCapitalize="none"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passContainer}>
                  <TextInput
                    value={password} onChangeText={setPassword}
                    placeholder="••••••••" placeholderTextColor="#4b5563"
                    secureTextEntry={!showPass}
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    <Text style={{ fontSize: 18 }}>{showPass ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity onPress={() => {}} style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.9}>
                <LinearGradient colors={['#dc2626', '#7f1d1d']} style={styles.submitBtn}>
                  {isLoading
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.submitText}>🩸  Sign In</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>Register Free</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  bloodDrop: { width: 36, height: 48, backgroundColor: '#dc2626', borderRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderTopLeftRadius: 18, borderTopRightRadius: 4, transform: [{ rotate: '180deg' }], marginBottom: 12, shadowColor: '#dc2626', shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  logoText: { color: '#ef4444', fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  tagline: { color: '#64748b', fontSize: 13, marginTop: 6 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)', marginBottom: 24 },
  cardTitle: { color: '#f1f5f9', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSubtitle: { color: '#64748b', fontSize: 14, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#f1f5f9', fontSize: 15, marginBottom: 0 },
  passContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingRight: 8 },
  eyeBtn: { padding: 10 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { color: '#ef4444', fontSize: 13 },
  submitBtn: { borderRadius: 14, padding: 18, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: '800', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
});
