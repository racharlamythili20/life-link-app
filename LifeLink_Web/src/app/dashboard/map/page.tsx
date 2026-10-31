// src/app/dashboard/map/page.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Droplets, Navigation, Filter } from 'lucide-react';
import api from '@/lib/axios';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// MapComponent is client-only (Leaflet doesn't SSR)
function LiveMap({ donors, requests, userLocation, donorLocations }: any) {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    mapInstanceRef.current = L.map(mapRef.current, {
      center: userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629],
      zoom: userLocation ? 13 : 5,
      zoomControl: false,
    });

    // Dark tile layer (free CartoDB)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CartoDB',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // User location
    if (userLocation) {
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.8)"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8], className: '',
      });
      const m = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map).bindPopup('<b>You</b>');
      markersRef.current.push(m);

      if (!hasCenteredRef.current) {
        map.setView([userLocation.lat, userLocation.lng], 13);
        hasCenteredRef.current = true;
      }
    }

    // Donor markers
    donors.forEach((donor: any) => {
      if (!donor.location?.coordinates?.length) return;
      const [lng, lat] = donor.location.coordinates;
      const icon = L.divIcon({
        html: `<div style="background:linear-gradient(135deg,#ef4444,#b91c1c);color:white;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid rgba(255,255,255,0.3);box-shadow:0 0 10px rgba(220,38,38,0.5)">${donor.bloodGroup}</div>`,
        className: '', iconAnchor: [20, 20],
      });
      const m = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${donor.name}</b><br>Blood: ${donor.bloodGroup}<br>Donations: ${donor.totalDonations}`);
      markersRef.current.push(m);
    });

    // Request markers
    requests.forEach((req: any) => {
      if (!req.location?.coordinates?.length) return;
      const [lng, lat] = req.location.coordinates;
      const color = req.priority === 'critical' ? '#ef4444' : req.priority === 'high' ? '#f97316' : '#eab308';
      const icon = L.divIcon({
        html: `<div style="background:${color};color:white;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;box-shadow:0 0 15px ${color}80;animation:pulse 2s infinite">🏥 ${req.bloodGroup}</div>`,
        className: '', iconAnchor: [30, 15],
      });
      const m = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${req.hospitalName}</b><br>Blood: ${req.bloodGroup}<br>Units: ${req.unitsRequired}`);
      markersRef.current.push(m);
    });

    // Real-time donor locations from socket
    Object.entries(donorLocations).forEach(([id, loc]: any) => {
      const [lng, lat] = loc.coordinates;
      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:#22c55e;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(34,197,94,0.8)"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6], className: '',
      });
      const m = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${loc.name}</b> (Live)<br>Blood: ${loc.bloodGroup}`);
      markersRef.current.push(m);
    });

  }, [donors, requests, userLocation, donorLocations]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '16px' }} />;
}

export default function MapPage() {
  const { user } = useAuthStore();
  const { donorLocations, updateLocation } = useSocketStore();
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Load Leaflet script
    if (typeof window !== 'undefined' && !(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        updateLocation(loc.lat, loc.lng);
        fetchNearby(loc.lat, loc.lng);
      },
      () => {
        // Default to Chennai fallback coordinates to avoid UI maps and filter state breakage
        const fallbackLoc = { lat: 13.0827, lng: 80.2707 };
        setUserLocation(fallbackLoc);
        updateLocation(fallbackLoc.lat, fallbackLoc.lng);
        fetchNearby(fallbackLoc.lat, fallbackLoc.lng);
      }
    );
  }, []);

  const fetchNearby = async (lat: number, lng: number) => {
    try {
      const bg = selectedBloodGroup !== 'All' ? selectedBloodGroup : '';
      const [donorRes, reqRes] = await Promise.all([
        api.get(`/donors/nearby?lat=${lat}&lng=${lng}&radius=${radius}${bg ? `&bloodGroup=${bg}` : ''}`),
        api.get(`/requests?lat=${lat}&lng=${lng}&radius=${radius}&status=active`),
      ]);
      setDonors(donorRes.data.donors || []);
      setRequests(reqRes.data.requests || []);
    } catch {
      toast.error('Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation) fetchNearby(userLocation.lat, userLocation.lng);
  }, [selectedBloodGroup, radius]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">
            <span className="text-gradient">LIVE</span> MAP
          </h1>
          <p className="text-slate-400 mt-1">Real-time donor and request locations</p>
        </div>
        <div className="live-badge"><span className="live-dot" />Live tracking</div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-slate-400 text-sm font-medium">Blood Group:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {BLOOD_GROUPS.map(bg => (
            <button
              key={bg}
              onClick={() => setSelectedBloodGroup(bg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                selectedBloodGroup === bg
                  ? 'border-red-500 bg-red-500/20 text-red-400'
                  : 'border-white/10 text-slate-400 hover:border-white/30'
              }`}
            >
              {bg}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-slate-400 text-sm">Radius: {radius}km</span>
          <input
            type="range" min="5" max="50" step="5" value={radius}
            onChange={e => setRadius(parseInt(e.target.value))}
            className="w-24 accent-red-500"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Donors Nearby', value: donors.length, color: 'text-red-400' },
          { icon: MapPin, label: 'Active Requests', value: requests.length, color: 'text-orange-400' },
          { icon: Navigation, label: 'Live Tracking', value: Object.keys(donorLocations).length, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-3">
            <s.icon size={20} className={s.color} />
            <div>
              <div className="font-display text-2xl font-black text-white">{s.value}</div>
              <div className="text-slate-500 text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card overflow-hidden" style={{ height: '520px' }}>
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400">Loading live map...</p>
              </div>
            </div>
          ) : mapLoaded ? (
            <LiveMap donors={donors} requests={requests} userLocation={userLocation} donorLocations={donorLocations} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              Loading map engine...
            </div>
          )}
        </div>

        {/* Sidebar list */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Droplets size={16} className="text-red-400" /> Nearby Donors ({donors.length})
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {donors.length === 0 ? (
                <p className="text-slate-500 text-sm">No donors found in this area</p>
              ) : donors.map(donor => (
                <div key={donor._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-all">
                  <div className="blood-badge text-xs w-10 h-10">{donor.bloodGroup}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{donor.name}</p>
                    <p className="text-slate-500 text-xs">{donor.totalDonations} donations</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${donor.isAvailable ? 'bg-green-400' : 'bg-slate-600'}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-orange-400" /> Active Requests ({requests.length})
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {requests.length === 0 ? (
                <p className="text-slate-500 text-sm">No active requests nearby</p>
              ) : requests.map(req => (
                <div key={req._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-all">
                  <div className="blood-badge text-xs w-10 h-10">{req.bloodGroup}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{req.hospitalName}</p>
                    <p className="text-slate-500 text-xs">{req.unitsRequired} units needed</p>
                  </div>
                  <span className={`priority-${req.priority} text-xs`}>{req.priority}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="glass-card p-4">
            <h3 className="font-semibold text-white mb-3">Map Legend</h3>
            <div className="space-y-2 text-sm">
              {[
                { color: '#3b82f6', label: 'Your Location' },
                { color: '#ef4444', label: 'Donors (by blood group)' },
                { color: '#22c55e', label: 'Live tracking donors' },
                { color: '#f97316', label: 'Active blood requests' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                  <span className="text-slate-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
