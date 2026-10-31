// src/app/emergency/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MapPin, Droplets, AlertCircle, Clock, Users, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PRIORITIES = [
  { id: 'critical', label: '🚨 Critical', desc: 'Life at immediate risk', color: 'border-red-500 bg-red-500/15' },
  { id: 'high', label: '⚠️ High', desc: 'Surgery / ICU within 6 hrs', color: 'border-orange-500 bg-orange-500/15' },
  { id: 'medium', label: '🔔 Medium', desc: 'Needed within 24 hours', color: 'border-yellow-500 bg-yellow-500/15' },
  { id: 'low', label: '📋 Low', desc: 'Scheduled procedure', color: 'border-blue-500 bg-blue-500/15' },
];

// Countdown timer for emergencies
function EmergencyTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <div className="font-display text-4xl font-black text-red-400">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}

export default function EmergencyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [donorsNotified, setDonorsNotified] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [form, setForm] = useState({
    patientName: '', contactNumber: '', bloodGroup: '', unitsRequired: '1',
    hospitalName: '', medicalReason: '', priority: 'medium', isEmergency: false,
    requiredBy: '',
  });

  const update = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const bg = searchParams.get('bloodGroup');
      if (bg) {
        setForm(p => ({ ...p, bloodGroup: bg }));
      }
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'hospital') {
      setForm(p => ({
        ...p,
        hospitalName: user.name,
        contactNumber: user.phone || '',
      }));
    }
  }, [user]);

  const getLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Reverse geocode with Nominatim (free)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&email=support@lifelink.com`);
          const data = await res.json();
          setLocation({ lat, lng, address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        } catch {
          setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        }
        setGettingLocation(false);
      },
      () => { toast.error('Could not get location. Please enter manually.'); setGettingLocation(false); }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return toast.error('Please set hospital location');
    if (!form.bloodGroup) return toast.error('Please select blood group');

    setSubmitting(true);
    try {
      const { data } = await api.post('/requests', {
        ...form,
        unitsRequired: parseInt(form.unitsRequired),
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat],
          address: location.address,
        },
        isEmergency: form.priority === 'critical',
      });

      setDonorsNotified(data.donorsNotified || 0);
      setSubmitted(true);
      toast.success(`Emergency request sent to ${data.donorsNotified} donors!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.15),transparent_60%)]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-lg w-full text-center relative z-10"
          style={{ borderColor: 'rgba(34,197,94,0.4)' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-7xl mb-6"
          >
            ✅
          </motion.div>
          <h2 className="font-display text-3xl font-black text-white mb-3">REQUEST SENT!</h2>
          <p className="text-slate-400 mb-6">
            Your emergency blood request has been broadcast to{' '}
            <span className="text-red-400 font-bold text-xl">{donorsNotified}</span> nearby donors.
          </p>

          <div className="glass p-4 rounded-xl mb-6">
            <p className="text-slate-400 text-sm mb-2">Searching for donors...</p>
            <EmergencyTimer seconds={600} />
            <p className="text-slate-500 text-xs mt-1">Estimated response time</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-emergency w-full"
            >
              Track in Dashboard
            </button>
            <button
              onClick={() => { setSubmitted(false); setStep(1); }}
              className="w-full py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all"
            >
              Post Another Request
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.12),transparent_50%)]" />

      {/* Header */}
      <div className="relative z-10 border-b border-white/5 glass">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white">← Back</button>
          <div className="flex items-center gap-2">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <AlertCircle className="text-red-400" size={22} />
            </motion.div>
            <span className="font-display font-bold text-lg text-white">EMERGENCY BLOOD REQUEST</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Priority Selection */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-400" /> Urgency Level
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {PRIORITIES.map(p => (
                <button
                  key={p.id} type="button"
                  onClick={() => update('priority', p.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.priority === p.id ? p.color : 'border-white/10 bg-white/5 hover:bg-white/8'
                  }`}
                >
                  <div className="font-semibold text-white text-sm">{p.label}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Blood Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Droplets size={20} className="text-red-400" /> Blood Requirements
            </h3>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">Blood Group Required *</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map(bg => (
                  <button
                    key={bg} type="button"
                    onClick={() => update('bloodGroup', bg)}
                    className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                      form.bloodGroup === bg
                        ? 'border-red-500 bg-red-500/20 text-red-400'
                        : 'border-white/10 text-slate-400 hover:border-white/30'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Units Required: <span className="text-red-400 font-bold">{form.unitsRequired}</span></label>
              <input
                type="range" min="1" max="10" value={form.unitsRequired}
                onChange={e => update('unitsRequired', e.target.value)}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 unit</span><span>10 units</span>
              </div>
            </div>
          </motion.div>

          {/* Patient Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
            <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Users size={20} className="text-blue-400" /> Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Patient Name *</label>
                <input
                  required value={form.patientName} onChange={e => update('patientName', e.target.value)}
                  placeholder="Patient's full name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Contact Number *</label>
                <input
                  required value={form.contactNumber} onChange={e => update('contactNumber', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Hospital Name *</label>
                <input
                  required value={form.hospitalName} onChange={e => update('hospitalName', e.target.value)}
                  placeholder="Apollo Hospital, Chennai"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Needed By</label>
                <input
                  type="datetime-local" value={form.requiredBy} onChange={e => update('requiredBy', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-slate-300 mb-2">Medical Reason</label>
                <textarea
                  value={form.medicalReason} onChange={e => update('medicalReason', e.target.value)}
                  placeholder="e.g., Emergency surgery, accident victim..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all resize-none"
                />
              </div>
            </div>
          </motion.div>

          {/* Hospital Location */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-green-400" /> Hospital Location
            </h3>

            <button
              type="button" onClick={getLocation} disabled={gettingLocation}
              className="flex items-center gap-3 px-5 py-3 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-400 font-medium hover:bg-blue-500/20 transition-all disabled:opacity-60 mb-3"
            >
              {gettingLocation ? (
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              ) : <MapPin size={18} />}
              {gettingLocation ? 'Getting location...' : 'Use Current Location (GPS)'}
            </button>

            {location && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                📍 {location.address}
              </motion.div>
            )}

            {!location && (
              <p className="text-slate-500 text-sm">Or{' '}
                <button type="button" className="text-blue-400 hover:underline" onClick={() => toast('Manual location entry coming soon')}>
                  enter location manually
                </button>
              </p>
            )}
          </motion.div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={submitting || !location || !form.bloodGroup || !form.patientName || !form.contactNumber || !form.hospitalName}
            whileTap={{ scale: 0.98 }}
            className="btn-emergency w-full flex items-center justify-center gap-3 text-lg py-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Broadcasting to donors...</>
            ) : (
              <><AlertCircle size={22} /> 🚨 SEND EMERGENCY REQUEST</>
            )}
          </motion.button>

          <p className="text-center text-slate-500 text-sm">
            Your request will be instantly broadcast to all nearby compatible donors within {form.priority === 'critical' ? '20' : '10'} km
          </p>
        </form>
      </div>
    </div>
  );
}
