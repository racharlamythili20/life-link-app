// src/app/dashboard/profile/page.tsx
'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Droplets, MapPin, Calendar, Award, Upload, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [eligibility, setEligibility] = useState<any>(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bloodGroup: user?.bloodGroup || '',
    age: '',
    weight: '',
  });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/donors/profile', form);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async () => {
    setToggling(true);
    try {
      const { data } = await api.put('/donors/availability');
      updateUser({ isAvailable: data.isAvailable });
      toast.success(data.message);
    } catch {
      toast.error('Failed to update availability');
    } finally {
      setToggling(false);
    }
  };

  const checkEligibility = async () => {
    try {
      const { data } = await api.get('/donors/me/eligibility');
      setEligibility(data);
    } catch {
      toast.error('Failed to check eligibility');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ profileImage: data.url });
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Upload failed');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-black text-white">
          My <span className="text-gradient">Profile</span>
        </h1>
        <p className="text-slate-400 mt-1">Manage your donor information</p>
      </div>

      {/* Avatar */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-red-600/20 border-2 border-red-600/30 flex items-center justify-center overflow-hidden">
              {user?.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-3xl font-black text-red-400">{user?.name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <Upload size={14} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              {user?.bloodGroup && <div className="blood-badge text-sm">{user.bloodGroup}</div>}
              <span className="text-slate-500 text-sm capitalize">{user?.role}</span>
              {user?.isVerified && (
                <span className="flex items-center gap-1 text-green-400 text-xs">
                  <Check size={12} /> Verified
                </span>
              )}
            </div>
          </div>

          {/* Availability toggle (donors only) */}
          {user?.role === 'donor' && (
            <div className="ml-auto text-center">
              <button
                onClick={toggleAvailability}
                disabled={toggling}
                className={`relative w-14 h-7 rounded-full border-2 transition-all ${
                  user?.isAvailable ? 'bg-green-500/20 border-green-500' : 'bg-white/5 border-white/20'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all ${
                  user?.isAvailable ? 'bg-green-400 translate-x-7' : 'bg-slate-500'
                }`} />
              </button>
              <p className="text-xs text-slate-500 mt-1.5">
                {user?.isAvailable ? 'Available' : 'Unavailable'}
              </p>
            </div>
          )}
        </div>

        {/* Stats row for donors */}
        {user?.role === 'donor' && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
            {[
              { label: 'Total Donations', value: user?.totalDonations || 0, icon: Droplets },
              { label: 'Reward Points', value: user?.rewardPoints || 0, icon: Award },
              { label: 'Badges', value: user?.badges?.length || 0, icon: Award },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-display text-2xl font-black text-gradient">{s.value}</div>
                <div className="text-slate-500 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badges */}
      {user?.badges && user.badges.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">🏅 Badges Earned</h3>
          <div className="flex flex-wrap gap-3">
            {user.badges.map((b: any) => (
              <div key={b.name} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-medium text-sm">
                {b.icon} {b.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit form */}
      <form onSubmit={handleSave} className="glass-card p-6 space-y-5">
        <h3 className="font-semibold text-white mb-2">Edit Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input value={form.name} onChange={e => update('name', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all" />
            </div>
          </div>
        </div>

        {user?.role === 'donor' && (
          <>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Blood Group</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map(bg => (
                  <button key={bg} type="button" onClick={() => update('bloodGroup', bg)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                      form.bloodGroup === bg ? 'border-red-500 bg-red-500/20 text-red-400' : 'border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >{bg}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Age</label>
                <input type="number" min="18" max="65" value={form.age} onChange={e => update('age', e.target.value)} placeholder="25"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Weight (kg)</label>
                <input type="number" min="45" value={form.weight} onChange={e => update('weight', e.target.value)} placeholder="70"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all" />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-emergency flex items-center gap-2 py-2.5 px-6 disabled:opacity-60 text-sm">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
            Save Changes
          </button>
          {user?.role === 'donor' && (
            <button type="button" onClick={checkEligibility}
              className="px-6 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-all">
              Check Eligibility
            </button>
          )}
        </div>
      </form>

      {/* Eligibility result */}
      {eligibility && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card p-5 border ${eligibility.eligible ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{eligibility.eligible ? '✅' : '❌'}</span>
            <h4 className={`font-bold ${eligibility.eligible ? 'text-green-400' : 'text-red-400'}`}>
              {eligibility.eligible ? 'You are eligible to donate!' : 'Not eligible to donate right now'}
            </h4>
          </div>
          {!eligibility.eligible && (
            <ul className="space-y-1">
              {eligibility.reasons.map((r: string) => (
                <li key={r} className="text-slate-400 text-sm flex items-center gap-2">
                  <span className="text-red-400">•</span> {r}
                </li>
              ))}
            </ul>
          )}
          {eligibility.nextEligibleDate && (
            <p className="text-slate-500 text-sm mt-2 flex items-center gap-1">
              <Calendar size={14} />
              Next eligible: {new Date(eligibility.nextEligibleDate).toLocaleDateString()}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
