// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Share, Linking, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, updateUser } = useAuthStore();
  const [toggling, setToggling] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const toggleAvailability = async () => {
    setToggling(true);
    try {
      const { data } = await api.put('/donors/availability');
      updateUser({ isAvailable: data.isAvailable });
    } catch {
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setToggling(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // 📄 Certificate PDF Generator
  const generateCertificate = async () => {
    setDownloadingCert(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; text-align: center; padding: 40px; background-color: #0a0a0f; color: #ffffff; }
            .certificate-container { border: 8px double #dc2626; padding: 40px; border-radius: 20px; background: linear-gradient(135deg, #111118 0%, #1a0505 100%); }
            .logo { font-size: 42px; font-weight: 900; color: #ef4444; letter-spacing: 4px; margin-bottom: 10px; }
            .title { font-size: 28px; text-transform: uppercase; color: #f8fafc; margin-top: 20px; font-weight: bold; }
            .subtitle { font-size: 16px; color: #94a3b8; margin-bottom: 30px; }
            .name { font-size: 34px; font-weight: bold; color: #ef4444; border-bottom: 2px solid #ef4444; display: inline-block; padding-bottom: 5px; margin: 20px 0; }
            .body-text { font-size: 16px; color: #cbd5e1; line-height: 1.6; margin: 20px 40px; }
            .details { margin-top: 30px; display: flex; justify-content: space-around; }
            .detail-box { background: rgba(255,255,255,0.05); padding: 15px 25px; border-radius: 10px; border: 1px solid rgba(239,68,68,0.3); }
            .footer { margin-top: 50px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="certificate-container">
            <div class="logo">🩸 LIFELINK</div>
            <div class="title">Certificate of Appreciation</div>
            <div class="subtitle">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>
            <div class="name">${user?.name || 'Valued Donor'}</div>
            <div class="body-text">
              In deep appreciation for your voluntary blood donation and extraordinary commitment to saving human lives. Your selfless contribution brings hope and life to patients in emergency care.
            </div>
            <div class="details">
              <div class="detail-box">
                <div style="font-size: 12px; color: #94a3b8;">BLOOD GROUP</div>
                <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${user?.bloodGroup || 'A+'}</div>
              </div>
              <div class="detail-box">
                <div style="font-size: 12px; color: #94a3b8;">TOTAL DONATIONS</div>
                <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${user?.totalDonations || 1}</div>
              </div>
              <div class="detail-box">
                <div style="font-size: 12px; color: #94a3b8;">ISSUED DATE</div>
                <div style="font-size: 14px; font-weight: bold; color: #cbd5e1;">${new Date().toLocaleDateString()}</div>
              </div>
            </div>
            <div class="footer">
              Authorized by LifeLink Medical Network • Verified Digital Certificate
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Certificate Error', 'Could not generate certificate PDF.');
    } finally {
      setDownloadingCert(false);
    }
  };

  // 📱 Share App Function
  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'LifeLink - Save Lives',
        message: `🩸 Join me on LifeLink! Connect with nearby blood donors and hospitals to save lives in emergency situations. Download now: https://lifelink.app`,
      });
    } catch {}
  };

  const menuItems = [
    { icon: '💉', label: 'Donation History', onPress: () => navigation.navigate('DonationHistory') },
    { icon: '🎁', label: 'Treatment Discounts & Vouchers', onPress: () => navigation.navigate('Discounts') },
    { icon: '🏆', label: 'Leaderboard', onPress: () => navigation.navigate('Leaderboard') },
    { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    {
      icon: '📄',
      label: downloadingCert ? 'Generating PDF...' : 'Download Certificate',
      onPress: generateCertificate,
      loading: downloadingCert,
    },
    { icon: '📱', label: 'Share App', onPress: handleShareApp },
    { icon: '❓', label: 'Help & Support', onPress: () => setShowHelpModal(true) },
    { icon: '🔒', label: 'Privacy Policy', onPress: () => setShowPrivacyModal(true) },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <Text style={styles.headerTitle}>My Profile</Text>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Hero */}
        <LinearGradient colors={['rgba(220,38,38,0.2)', 'transparent']} style={styles.heroSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.heroRow}>
            {user?.bloodGroup && (
              <View style={styles.bloodBadge}>
                <Text style={styles.bloodBadgeText}>{user.bloodGroup}</Text>
              </View>
            )}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats */}
        {user?.role === 'donor' && (
          <View style={styles.statsRow}>
            {[
              { label: 'Donations', value: user.totalDonations || 0 },
              { label: 'Points', value: user.rewardPoints || 0 },
              { label: 'Badges', value: user.badges?.length || 0 },
            ].map((s, i) => (
              <View key={s.label} style={[styles.statItem, i > 0 && styles.statBorder]}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Availability toggle (donors) */}
        {user?.role === 'donor' && (
          <View style={styles.availCard}>
            <View>
              <Text style={styles.availTitle}>Available to Donate</Text>
              <Text style={styles.availSubtitle}>
                {user?.isAvailable ? 'You can receive emergency requests' : 'You won\'t receive requests'}
              </Text>
            </View>
            {toggling
              ? <ActivityIndicator color="#22c55e" />
              : <Switch
                  value={user?.isAvailable || false}
                  onValueChange={toggleAvailability}
                  trackColor={{ false: '#374151', true: '#15803d' }}
                  thumbColor={user?.isAvailable ? '#22c55e' : '#64748b'}
                />
            }
          </View>
        )}

        {/* Badges */}
        {user?.badges && user.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏅 Badges</Text>
            <View style={styles.badgesRow}>
              {user.badges.map((b: any) => (
                <View key={b.name} style={styles.badge}>
                  <Text style={styles.badgeIcon}>{b.icon}</Text>
                  <Text style={styles.badgeLabel}>{b.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.onPress}
                disabled={item.loading}
                style={[styles.menuItem, i < menuItems.length - 1 && styles.menuBorder]}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.loading ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <Text style={styles.menuArrow}>›</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ❓ Help & Support Modal */}
      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>❓ Help & Support</Text>
            <Text style={styles.modalSub}>We are here 24/7 for emergency blood coordination support.</Text>

            <TouchableOpacity style={styles.supportOption} onPress={() => Linking.openURL('tel:108')}>
              <Text style={styles.supportIcon}>📞</Text>
              <View>
                <Text style={styles.supportTitle}>Emergency Helpline (108)</Text>
                <Text style={styles.supportDesc}>Instant ambulance & medical response</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportOption} onPress={() => Linking.openURL('mailto:support@lifelink.org')}>
              <Text style={styles.supportIcon}>✉️</Text>
              <View>
                <Text style={styles.supportTitle}>Email Support</Text>
                <Text style={styles.supportDesc}>support@lifelink.org</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.faqSection}>
              <Text style={styles.faqTitle}>Frequently Asked Questions:</Text>
              <Text style={styles.faqItem}>• <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Who can donate?</Text> Healthy adults 18-65 yrs, weighing 50+ kg.</Text>
              <Text style={styles.faqItem}>• <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Donation Interval?</Text> Minimum 90 days between whole blood donations.</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowHelpModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🔒 Privacy Policy Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔒 Privacy Policy</Text>
            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              <Text style={styles.privacyText}>
                <Text style={{ fontWeight: 'bold', color: '#ef4444' }}>LifeLink Data Protection Guarantee:</Text>{'\n\n'}
                1. <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Location Data Usage:</Text> Your GPS location is exclusively used to match nearby emergency blood requests and calculate distance radii.{'\n\n'}
                2. <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Contact Privacy:</Text> Phone numbers and contact info are shared ONLY when you explicitly accept a blood request.{'\n\n'}
                3. <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Data Security:</Text> All requests and user tokens are encrypted using SSL/TLS and industry standard JWT authentication protocols.{'\n\n'}
                4. <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>Availability Control:</Text> You can turn off your availability at any time in your profile settings.
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.closeBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  headerTitle: { color: '#f1f5f9', fontSize: 22, fontWeight: '800', padding: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 28, paddingBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(220,38,38,0.2)', borderWidth: 3, borderColor: 'rgba(220,38,38,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#ef4444', fontSize: 32, fontWeight: '800' },
  userName: { color: '#f1f5f9', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  userEmail: { color: '#64748b', fontSize: 14, marginBottom: 12 },
  heroRow: { flexDirection: 'row', gap: 10 },
  bloodBadge: { backgroundColor: 'rgba(220,38,38,0.2)', borderRadius: 10, borderWidth: 2, borderColor: 'rgba(220,38,38,0.5)', paddingHorizontal: 16, paddingVertical: 6 },
  bloodBadgeText: { color: '#ef4444', fontWeight: '800', fontSize: 16 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6 },
  roleText: { color: '#94a3b8', fontWeight: '600', fontSize: 12, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, margin: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  statValue: { color: '#ef4444', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#64748b', fontSize: 12 },
  availCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, marginHorizontal: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  availTitle: { color: '#f1f5f9', fontWeight: '600', fontSize: 15, marginBottom: 3 },
  availSubtitle: { color: '#64748b', fontSize: 12 },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' },
  badgeIcon: { fontSize: 16 },
  badgeLabel: { color: '#a78bfa', fontWeight: '600', fontSize: 13 },
  menuCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  menuIcon: { fontSize: 20, width: 30 },
  menuLabel: { flex: 1, color: '#f1f5f9', fontSize: 15 },
  menuArrow: { color: '#4b5563', fontSize: 20 },
  logoutBtn: { margin: 16, marginTop: 20, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#111118', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalSub: { color: '#94a3b8', fontSize: 13, marginBottom: 16 },
  supportOption: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  supportIcon: { fontSize: 24 },
  supportTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  supportDesc: { color: '#64748b', fontSize: 12 },
  faqSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  faqTitle: { color: '#ef4444', fontWeight: '700', fontSize: 13, marginBottom: 6 },
  faqItem: { color: '#94a3b8', fontSize: 12, marginBottom: 6, lineHeight: 18 },
  privacyText: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  closeBtn: { marginTop: 16, backgroundColor: '#ef4444', borderRadius: 12, padding: 14, alignItems: 'center' },
  closeBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
