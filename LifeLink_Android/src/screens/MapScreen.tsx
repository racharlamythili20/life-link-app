// src/screens/MapScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../services/api';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';

const { width, height } = Dimensions.get('window');
const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function MapScreen({ navigation }: any) {
  const { updateLocation, donorLocations } = useSocketStore();
  const { user } = useAuthStore();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [radius, setRadius] = useState(10);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      updateLocation(coords.latitude, coords.longitude);
      fetchNearby(coords.latitude, coords.longitude);

      // Watch location defensively
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 },
        (loc) => {
          if (loc?.coords) {
            updateLocation(loc.coords.latitude, loc.coords.longitude);
          }
        }
      ).catch(() => {});
    } catch (error) {
      console.log('Error initializing location, using fallback:', error);
      // Graceful fallback to default coordinates to avoid app crashing
      const fallbackCoords = { latitude: 13.0827, longitude: 80.2707 }; // Chennai fallback
      setUserLocation(fallbackCoords);
      updateLocation(fallbackCoords.latitude, fallbackCoords.longitude);
      fetchNearby(fallbackCoords.latitude, fallbackCoords.longitude);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearby = async (lat: number, lng: number) => {
    try {
      const bg = selectedFilter !== 'All' ? `&bloodGroup=${selectedFilter}` : '';
      const [donorRes, reqRes] = await Promise.all([
        api.get(`/donors/nearby?lat=${lat}&lng=${lng}&radius=${radius}${bg}&limit=30`),
        api.get(`/requests?lat=${lat}&lng=${lng}&radius=${radius}&status=active&limit=20`),
      ]);
      setDonors(donorRes.data.donors || []);
      setRequests(reqRes.data.requests || []);
    } catch {}
    setLoading(false);
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }, 800);
    }
  };

  const priorityColors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <Text style={styles.headerTitle}>🗺 Live Donor Map</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </SafeAreaView>

      {/* Blood group filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {BLOOD_GROUPS.map(bg => (
          <TouchableOpacity
            key={bg}
            onPress={() => {
              setSelectedFilter(bg);
              if (userLocation) fetchNearby(userLocation.latitude, userLocation.longitude);
            }}
            style={[styles.filterChip, selectedFilter === bg && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, selectedFilter === bg && styles.filterTextActive]}>{bg}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading live map...</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={userLocation ? {
            ...userLocation,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          } : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 20, longitudeDelta: 20 }}
          customMapStyle={darkMapStyle}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* Search radius circle */}
          {userLocation && (
            <Circle
              center={userLocation}
              radius={radius * 1000}
              fillColor="rgba(220,38,38,0.05)"
              strokeColor="rgba(220,38,38,0.3)"
              strokeWidth={1}
            />
          )}

          {/* Donor markers */}
          {donors.map(donor => {
            if (!donor.location?.coordinates?.length) return null;
            const [lng, lat] = donor.location.coordinates;
            return (
              <Marker
                key={donor._id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => setSelectedMarker({ type: 'donor', data: donor })}
              >
                <View style={[styles.donorMarker, { borderColor: '#ef4444' }]}>
                  <Text style={styles.donorMarkerText}>{donor.bloodGroup}</Text>
                </View>
              </Marker>
            );
          })}

          {/* Request markers */}
          {requests.map(req => {
            if (!req.location?.coordinates?.length) return null;
            const [lng, lat] = req.location.coordinates;
            const color = priorityColors[req.priority] || '#64748b';
            return (
              <Marker
                key={req._id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => navigation.navigate('RequestDetail', { request: req, requestId: req._id })}
              >
                <View style={[styles.requestMarker, { backgroundColor: color + '20', borderColor: color }]}>
                  <Text style={styles.requestMarkerEmoji}>🏥</Text>
                  <Text style={[styles.requestMarkerText, { color }]}>{req.bloodGroup}</Text>
                </View>
              </Marker>
            );
          })}

          {/* Real-time donor locations from socket */}
          {Object.entries(donorLocations).map(([id, loc]: any) => {
            if (!loc?.coordinates || loc.coordinates.length < 2) return null;
            return (
              <Marker
                key={`live-${id}`}
                coordinate={{ latitude: loc.coordinates[1], longitude: loc.coordinates[0] }}
                title={`${loc.name || 'Live Donor'} (Live)`}
                description={`Blood: ${loc.bloodGroup || 'Unknown'}`}
              >
                <View style={styles.liveMarker}>
                  <View style={styles.livePulse} />
                </View>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={centerOnUser} style={styles.controlBtn}>
          <Text style={{ fontSize: 22 }}>📍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('EmergencyModal')}
          style={[styles.controlBtn, styles.emergencyBtn]}
        >
          <Text style={{ fontSize: 22 }}>🚨</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{donors.length}</Text>
          <Text style={styles.statLbl}>Donors</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{requests.length}</Text>
          <Text style={styles.statLbl}>Requests</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{Object.keys(donorLocations).length}</Text>
          <Text style={styles.statLbl}>Live</Text>
        </View>
      </View>

      {/* Selected marker popup */}
      {selectedMarker && (
        <TouchableOpacity
          style={styles.markerPopup}
          onPress={() => setSelectedMarker(null)}
          activeOpacity={1}
        >
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>{selectedMarker.data.name}</Text>
            <Text style={styles.popupSub}>
              {selectedMarker.type === 'donor'
                ? `Blood: ${selectedMarker.data.bloodGroup} · ${selectedMarker.data.totalDonations} donations`
                : `Needs: ${selectedMarker.data.bloodGroup} · ${selectedMarker.data.unitsRequired} units`}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedMarker(null);
                if (selectedMarker.type === 'donor') {
                  // Navigate to chat
                }
              }}
              style={styles.popupBtn}
            >
              <Text style={styles.popupBtnText}>
                {selectedMarker.type === 'donor' ? 'Contact Donor' : 'Accept Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { color: '#ef4444', fontSize: 10, fontWeight: '700' },
  filterScroll: { maxHeight: 52 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterChipActive: { backgroundColor: 'rgba(220,38,38,0.2)', borderColor: 'rgba(220,38,38,0.5)' },
  filterText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#ef4444' },
  map: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 14 },
  controls: { position: 'absolute', right: 16, bottom: 130, gap: 12 },
  controlBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#111118', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', elevation: 4 },
  emergencyBtn: { backgroundColor: '#7f1d1d', borderColor: 'rgba(220,38,38,0.4)' },
  statsBar: { flexDirection: 'row', backgroundColor: '#111118', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingVertical: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#ef4444', fontSize: 18, fontWeight: '800' },
  statLbl: { color: '#64748b', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  donorMarker: { backgroundColor: 'rgba(220,38,38,0.15)', borderRadius: 8, borderWidth: 2, paddingHorizontal: 8, paddingVertical: 5 },
  donorMarkerText: { color: '#ef4444', fontWeight: '800', fontSize: 12 },
  requestMarker: { borderRadius: 10, borderWidth: 2, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 3 },
  requestMarkerEmoji: { fontSize: 12 },
  requestMarkerText: { fontWeight: '700', fontSize: 11 },
  liveMarker: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  livePulse: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.3)', position: 'absolute' },
  markerPopup: { position: 'absolute', bottom: 80, left: 16, right: 16 },
  popupCard: { backgroundColor: '#111118', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', elevation: 10 },
  popupTitle: { color: '#f1f5f9', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  popupSub: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  popupBtn: { backgroundColor: 'rgba(220,38,38,0.2)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(220,38,38,0.4)' },
  popupBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});
