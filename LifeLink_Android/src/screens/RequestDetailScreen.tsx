// src/screens/RequestDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Linking, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { isDonorCompatible } from '../utils/bloodCompatibility';

const BLOOD_COLORS: Record<string, string> = {
  'A+': '#ef4444', 'A-': '#f97316', 'B+': '#8b5cf6',
  'B-': '#3b82f6', 'AB+': '#ec4899', 'AB-': '#06b6d4',
  'O+': '#22c55e', 'O-': '#f59e0b',
};

export default function RequestDetailScreen({ route, navigation }: any) {
  const { request: initialRequest, requestId } = route.params || {};
  const [request, setRequest] = useState<any>(initialRequest || null);
  const [loading, setLoading] = useState(!initialRequest && !!requestId);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [completing, setCompleting] = useState(false);

  const { user, updateUser } = useAuthStore();
  const { socket } = useSocketStore();

  const idToFetch = requestId || initialRequest?._id;

  useEffect(() => {
    if (idToFetch) {
      fetchRequestDetails(idToFetch);
    }
  }, [idToFetch]);

  // Real-time socket synchronization for request updates
  useEffect(() => {
    if (!socket || !idToFetch) return;

    socket.emit('join_request', idToFetch);

    const handleUpdate = () => {
      fetchRequestDetails(idToFetch);
    };

    socket.on('request_accepted', handleUpdate);
    socket.on('request_fulfilled', handleUpdate);

    return () => {
      socket.emit('leave_request', idToFetch);
      socket.off('request_accepted', handleUpdate);
      socket.off('request_fulfilled', handleUpdate);
    };
  }, [socket, idToFetch]);

  const fetchRequestDetails = async (id: string) => {
    try {
      const { data } = await api.get(`/requests/${id}`);
      if (data.request) {
        setRequest(data.request);
      }
    } catch (err: any) {
      console.log('Error fetching request details:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (idToFetch) {
      setRefreshing(true);
      fetchRequestDetails(idToFetch);
    }
  };

  const responses = request?.responses || [];
  const u = user as any;
  const currentUserId = (u?._id || u?.id)?.toString();

  const myResponse = responses.find((r: any) => {
    const donorId = (r.donor?._id || r.donor?.id || r.donor)?.toString();
    return donorId && currentUserId && donorId === currentUserId;
  });

  const accepted = !!myResponse && myResponse?.status === 'accepted';
  const donated = !!myResponse && myResponse?.status === 'donated';
  const anotherDonorAccepted = !accepted && !donated && responses.some((r: any) => {
    const dId = (r.donor?._id || r.donor?.id || r.donor)?.toString();
    return dId !== currentUserId && (r.status === 'accepted' || r.status === 'donated');
  });

  const isCompatible = isDonorCompatible(user?.bloodGroup, request?.bloodGroup);
  const isRequester = (request?.requestedBy?._id || request?.requestedBy)?.toString() === currentUserId;
  const isHospitalStaff = user?.role === 'hospital';

  // 🩸 ACCEPT REQUEST WORKFLOW
  const handleAccept = async () => {
    Alert.alert('Confirm Donation', 'Are you sure you want to accept this blood request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept Request',
        style: 'default',
        onPress: async () => {
          setAccepting(true);
          try {
            const { data } = await api.put(`/requests/${request._id}/accept`);
            Alert.alert('✅ Accepted!', 'You have accepted the request. The requester will be notified in real time.');
            if (data.request) setRequest(data.request);
            fetchRequestDetails(request._id);
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to accept request.');
          } finally {
            setAccepting(false);
          }
        },
      },
    ]);
  };

  // 💉 COMPLETE DONATION WORKFLOW (Updates request, hospital inventory, donor points +100, badges)
  const handleCompleteDonation = async () => {
    Alert.alert(
      'Complete Blood Donation',
      'Confirm that you have completed giving blood for this request? This will award +100 reward points and update hospital inventory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Donation Completed',
          style: 'default',
          onPress: async () => {
            setCompleting(true);
            try {
              const { data } = await api.put(`/requests/${request._id}/complete`, { units: request.unitsRequired || 1 });

              // Update donor local points & total donations
              if (user) {
                updateUser({
                  totalDonations: (user.totalDonations || 0) + 1,
                  rewardPoints: (user.rewardPoints || 0) + 100,
                });
              }

              Alert.alert('🎉 Donation Complete!', 'Thank you! You earned +100 reward points. Hospital inventory has been updated.');
              fetchRequestDetails(request._id);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to mark donation complete.');
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  const contactNumber = request?.contactNumber || request?.contactPhone || request?.requestedBy?.phone;

  const handleCall = (phoneNum?: string) => {
    const num = phoneNum || contactNumber;
    if (num) {
      Linking.openURL(`tel:${num}`);
    }
  };

  const openChat = (recipientId?: string, recipientName?: string) => {
    navigation.navigate('Chat', {
      requestId: request._id,
      recipientId: recipientId || (request.requestedBy?._id || request.requestedBy),
      recipientName: recipientName || request.patientName || 'Requester',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>Request not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const urgencyColor = request.urgency === 'critical' || request.priority === 'critical' ? '#ef4444'
    : request.urgency === 'high' || request.priority === 'high' ? '#f97316' : '#22c55e';
  const bloodColor = BLOOD_COLORS[request.bloodGroup] || '#ef4444';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
      >
        {/* Blood Group & Priority Header */}
        <View style={styles.bloodBadgeContainer}>
          <View style={[styles.bloodBadge, { backgroundColor: bloodColor + '22', borderColor: bloodColor }]}>
            <Text style={[styles.bloodGroup, { color: bloodColor }]}>{request.bloodGroup}</Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '22' }]}>
            <Text style={[styles.urgencyText, { color: urgencyColor }]}>
              {(request.priority || request.urgency || 'normal').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.card}>
          <InfoRow label="Patient Name" value={request.patientName || 'Anonymous'} />
          <InfoRow label="Hospital" value={request.hospitalName || 'Not specified'} />
          <InfoRow label="Units Required" value={`${request.unitsRequired || 1} unit(s)`} />
          <InfoRow label="Units Collected" value={`${request.unitsCollected || 0} unit(s)`} />
          <InfoRow label="Required By" value={request.requiredBy ? new Date(request.requiredBy).toLocaleDateString() : 'Urgent'} />
        </View>

        {request.medicalReason || request.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Medical Reason / Notes</Text>
            <Text style={styles.notes}>{request.medicalReason || request.notes}</Text>
          </View>
        ) : null}

        {/* Location */}
        {request.location?.address && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>📍 Location</Text>
            <Text style={styles.value}>{request.location.address}</Text>
          </View>
        )}

        {/* Request Status */}
        <View style={styles.card}>
          <InfoRow label="Status" value={(request.status || 'active').toUpperCase()} />
          <InfoRow label="Posted On" value={request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Recently'} />
        </View>

        {/* Accepted Donors List (For Requesters & Hospital Staff) */}
        {(isRequester || isHospitalStaff || responses.length > 0) && (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>👥 Accepted Donors ({responses.length})</Text>
            {responses.length === 0 ? (
              <Text style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>No donors have accepted this request yet.</Text>
            ) : (
              responses.map((resp: any, index: number) => {
                const donorObj = typeof resp.donor === 'object' ? resp.donor : {};
                return (
                  <View key={resp._id || index} style={styles.donorRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.donorName}>{donorObj.name || 'Anonymous Donor'}</Text>
                      <Text style={styles.donorMeta}>
                        Group: {donorObj.bloodGroup || request.bloodGroup} • Status: <Text style={{ color: resp.status === 'donated' ? '#22c55e' : '#eab308', fontWeight: 'bold' }}>{resp.status.toUpperCase()}</Text>
                      </Text>
                    </View>
                    <View style={styles.donorActionBtns}>
                      {donorObj.phone && (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleCall(donorObj.phone)}>
                          <Text style={{ fontSize: 16 }}>📞</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]} onPress={() => openChat(donorObj._id, donorObj.name)}>
                        <Text style={{ fontSize: 16 }}>💬</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Action Buttons Section */}
        <View style={styles.actions}>
          {/* Call Requester */}
          {contactNumber && !isRequester && (
            <TouchableOpacity style={styles.callBtn} onPress={() => handleCall()}>
              <Text style={styles.callBtnText}>📞 Call Requester ({contactNumber})</Text>
            </TouchableOpacity>
          )}

          {/* Chat with Requester */}
          {!isRequester && (
            <TouchableOpacity style={styles.chatBtn} onPress={() => openChat()}>
              <Text style={styles.chatBtnText}>💬 Live Emergency Chat</Text>
            </TouchableOpacity>
          )}

          {/* Donor accepted state */}
          {accepted && (
            <View style={styles.acceptedBox}>
              <Text style={styles.acceptedText}>✅ You accepted this blood request!</Text>
              <Text style={styles.acceptedSub}>Coordinate with requester above, then complete your donation below.</Text>
              <TouchableOpacity
                style={[styles.completeDonationBtn, completing && { opacity: 0.6 }]}
                onPress={handleCompleteDonation}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.completeDonationBtnText}>💉 Mark Donation Completed (+100 Pts)</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Donation fulfilled state */}
          {donated && (
            <View style={[styles.acceptedBox, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22c55e' }]}>
              <Text style={[styles.acceptedText, { color: '#22c55e' }]}>🎉 Donation Completed!</Text>
              <Text style={styles.acceptedSub}>You earned +100 reward points. Thank you for saving lives!</Text>
            </View>
          )}

          {/* Another Donor accepted state */}
          {anotherDonorAccepted && (
            <View style={[styles.acceptedBox, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
              <Text style={[styles.acceptedText, { color: '#f87171' }]}>🔒 Accepted by another donor</Text>
            </View>
          )}

          {/* Accept Button for eligible donors */}
          {!accepted && !donated && !anotherDonorAccepted && request.status === 'active' && user?.role === 'donor' && (
            isCompatible ? (
              <TouchableOpacity
                style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
                onPress={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.acceptBtnText}>🩸 Accept Request</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.acceptedBox, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                <Text style={[styles.acceptedText, { color: '#f87171' }]}>⚠️ Incompatible Blood Group</Text>
                <Text style={styles.acceptedSub}>
                  Your blood group ({user?.bloodGroup || 'unknown'}) cannot donate to a patient needing {request.bloodGroup}.
                </Text>
              </View>
            )
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
  scroll: { flex: 1, padding: 16 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  errorText: { color: '#64748b', fontSize: 16 },
  bloodBadgeContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  bloodBadge: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  bloodGroup: { fontSize: 22, fontWeight: '900' },
  urgencyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  urgencyText: { fontSize: 12, fontWeight: '800' },
  card: {
    backgroundColor: '#111118', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeading: { color: '#f8fafc', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  cardLabel: { color: '#64748b', fontSize: 13 },
  value: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  notes: { color: '#94a3b8', fontSize: 14, marginTop: 4, lineHeight: 20 },
  donorRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  donorName: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  donorMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  donorActionBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  actions: { marginTop: 8, marginBottom: 40, gap: 12 },
  callBtn: {
    backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  callBtnText: { color: '#3b82f6', fontWeight: '700', fontSize: 15 },
  chatBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  chatBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  acceptBtn: {
    backgroundColor: '#ef4444', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  acceptBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  acceptedBox: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 16, padding: 16, alignItems: 'center',
  },
  acceptedText: { color: '#22c55e', fontWeight: '800', fontSize: 16, marginBottom: 4 },
  acceptedSub: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: 14 },
  completeDonationBtn: {
    backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
    width: '100%', alignItems: 'center',
  },
  completeDonationBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },
});
