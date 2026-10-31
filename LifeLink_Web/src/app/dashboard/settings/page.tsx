// src/app/dashboard/settings/page.tsx
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Bell, Activity, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    age: user?.age ? String(user.age) : '',
    weight: user?.weight ? String(user.weight) : '',
    hasChronicDisease: user?.hasChronicDisease || false,
    notificationPreferences: {
      emergency: user?.notificationPreferences?.emergency ?? true,
      reminders: user?.notificationPreferences?.reminders ?? true,
      updates: user?.notificationPreferences?.updates ?? true,
    },
  });

  const updateField = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const updateNotify = (k: string, v: boolean) => 
    setForm(p => ({
      ...p,
      notificationPreferences: {
        ...p.notificationPreferences,
        [k]: v,
      },
    }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        phone: form.phone ? form.phone.replace(/\s+/g, '') : '',
        notificationPreferences: form.notificationPreferences,
      };

      if (user?.role === 'donor') {
        payload.age = form.age ? parseInt(form.age) : undefined;
        payload.weight = form.weight ? parseInt(form.weight) : undefined;
        payload.hasChronicDisease = form.hasChronicDisease;
      }

      const { data } = await api.put('/donors/profile', payload);
      updateUser(data.user);
      toast.success('Settings saved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
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

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-black text-white">
          Account <span className="text-gradient">Settings</span>
        </h1>
        <p className="text-slate-400 mt-1">Manage your account preferences and notification settings</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
            <User size={18} className="text-red-400" /> Personal Profile
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  required
                  placeholder="Your Name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="Phone Number"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {user?.role === 'donor' && (
            <>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Age</label>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={form.age}
                    onChange={e => updateField('age', e.target.value)}
                    placeholder="Age (18-65)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    min="45"
                    value={form.weight}
                    onChange={e => updateField('weight', e.target.value)}
                    placeholder="Weight in kg"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="chronic"
                  checked={form.hasChronicDisease}
                  onChange={e => updateField('hasChronicDisease', e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 text-red-600 focus:ring-red-500 bg-white/5"
                />
                <label htmlFor="chronic" className="text-sm text-slate-300 select-none">
                  I have a chronic disease/condition (affects donor eligibility)
                </label>
              </div>
            </>
          )}
        </div>

        {/* Donor Availability Card */}
        {user?.role === 'donor' && (
          <div className="glass-card p-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-green-400" /> Donation Availability
              </h3>
              <p className="text-slate-400 text-sm mt-1">Appear on the live map for urgent blood requests</p>
            </div>
            <button
              type="button"
              onClick={toggleAvailability}
              disabled={toggling}
              className={`px-5 py-2 rounded-xl text-sm font-bold border transition-all ${
                user.isAvailable
                  ? 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  : 'border-slate-700 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {toggling ? 'Updating...' : user.isAvailable ? 'Available' : 'Unavailable'}
            </button>
          </div>
        )}

        {/* Notifications Preferences */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
            <Bell size={18} className="text-red-400" /> Notification Preferences
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Emergency Alerts</p>
                <p className="text-slate-500 text-xs mt-0.5">Receive immediate notifications for critical blood requests near you</p>
              </div>
              <input
                type="checkbox"
                checked={form.notificationPreferences.emergency}
                onChange={e => updateNotify('emergency', e.target.checked)}
                className="w-10 h-5 rounded-full text-red-600 focus:ring-red-500 bg-white/5 border-white/10"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Donation Reminders</p>
                <p className="text-slate-500 text-xs mt-0.5">Get reminded when you become eligible to donate again</p>
              </div>
              <input
                type="checkbox"
                checked={form.notificationPreferences.reminders}
                onChange={e => updateNotify('reminders', e.target.checked)}
                className="w-10 h-5 rounded-full text-red-600 focus:ring-red-500 bg-white/5 border-white/10"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Platform Updates</p>
                <p className="text-slate-500 text-xs mt-0.5">Get news about newly unlocked achievements, leaderboards, and features</p>
              </div>
              <input
                type="checkbox"
                checked={form.notificationPreferences.updates}
                onChange={e => updateNotify('updates', e.target.checked)}
                className="w-10 h-5 rounded-full text-red-600 focus:ring-red-500 bg-white/5 border-white/10"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-emergency px-6 py-3 flex items-center gap-2 font-semibold disabled:opacity-60"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} /> Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
