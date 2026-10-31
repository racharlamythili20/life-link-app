// src/app/dashboard/discounts/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Building2, Stethoscope, Gift, History, DollarSign, Calendar, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

export default function DiscountsPage() {
  const { user, updateUser } = useAuthStore();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalDiscounts, setHospitalDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    hospitalId: '',
    treatmentName: '',
    points: '',
  });

  const fetchHospitals = async () => {
    try {
      const { data } = await api.get('/hospitals');
      setHospitals(data.hospitals || []);
    } catch {
      toast.error('Failed to load hospital list');
    }
  };

  const fetchHospitalDiscounts = async () => {
    try {
      const { data } = await api.get('/hospitals/discounts');
      setHospitalDiscounts(data.discounts || []);
    } catch {
      toast.error('Failed to load applied discounts');
    }
  };

  const syncProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      updateUser(data.user);
    } catch {}
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (user?.role === 'donor') {
        await Promise.all([fetchHospitals(), syncProfile()]);
      } else if (user?.role === 'hospital') {
        await fetchHospitalDiscounts();
      }
      setLoading(false);
    };
    init();
  }, [user?.role]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hospitalId || !form.treatmentName || !form.points) {
      return toast.error('Please fill in all redemption fields');
    }

    const pts = parseInt(form.points);
    if (isNaN(pts) || pts <= 0) {
      return toast.error('Points must be a positive number');
    }

    if (pts > (user?.rewardPoints || 0)) {
      return toast.error(`Insufficient points. You only have ${user?.rewardPoints} points.`);
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/donors/redeem', {
        hospitalId: form.hospitalId,
        treatmentName: form.treatmentName,
        points: pts,
      });
      updateUser(data.user);
      toast.success('Discount applied successfully! Persistent notification sent to hospital.');
      setForm({ hospitalId: '', treatmentName: '', points: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Redemption failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ─── PATIENT / RECEIVER VIEW ─────────────────────────────────
  if (user?.role === 'receiver') {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 pt-12">
        <div className="w-20 h-20 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
          <Heart size={40} className="animate-pulse" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-black text-white">
            Medical <span className="text-gradient">Treatment Discounts</span>
          </h1>
          <p className="text-slate-400 mt-2 max-w-md mx-auto">
            Discounts on hospital treatments are earned by active blood donors as a reward for saving lives.
          </p>
        </div>
        <div className="glass-card p-6 border-slate-800 text-left space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Gift size={18} className="text-red-400" /> How It Works
          </h3>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-red-400">•</span> Donate blood to help critical patients in your area.
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">•</span> Receive 100 reward points for every completed donation.
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">•</span> Redeem points to generate treatment vouchers valid at partner hospitals.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // ─── HOSPITAL VIEW ──────────────────────────────────────────
  if (user?.role === 'hospital') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-black text-white">
            Discounts <span className="text-gradient">Applied</span>
          </h1>
          <p className="text-slate-400 mt-1">Treatment discounts applied to your hospital by blood donors</p>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-xs font-bold uppercase tracking-wider bg-white/2">
                  <th className="px-6 py-4">Donor Name</th>
                  <th className="px-6 py-4">Treatment Type</th>
                  <th className="px-6 py-4">Points Redeemed</th>
                  <th className="px-6 py-4">Discount Amount</th>
                  <th className="px-6 py-4">Date Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {hospitalDiscounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      No treatment discounts applied to your hospital yet
                    </td>
                  </tr>
                ) : (
                  hospitalDiscounts.map((discount, i) => (
                    <tr key={i} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{discount.donorName}</td>
                      <td className="px-6 py-4 text-slate-300">{discount.treatmentName}</td>
                      <td className="px-6 py-4 text-yellow-400 font-bold">{discount.pointsRedeemed} pts</td>
                      <td className="px-6 py-4 text-green-400 font-bold">₹{discount.discountAmount}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(discount.redeemedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── DONOR VIEW ─────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-black text-white uppercase tracking-tight">
          Redeem <span className="text-gradient">Reward Points</span>
        </h1>
        <p className="text-slate-400">Apply your points for discounts on hospital treatments</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Points Display */}
        <div className="glass-card p-6 border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 mb-4">
              <Award size={24} />
            </div>
            <h2 className="text-slate-400 text-sm font-medium">Available Balance</h2>
            <p className="font-display text-5xl font-black text-white mt-2">
              {user?.rewardPoints || 0}
            </p>
          </div>
          <p className="text-slate-500 text-xs mt-6">
            1 Point = ₹1 Treatment Discount. Points are earned by completing registered blood donations.
          </p>
        </div>

        {/* Redemption Form */}
        <div className="md:col-span-2 glass-card p-6 space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
            <Gift size={18} className="text-red-400" /> Apply Treatment Voucher
          </h3>

          <form onSubmit={handleRedeem} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Select Hospital</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <select
                    value={form.hospitalId}
                    onChange={e => setForm(p => ({ ...p, hospitalId: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-red-500/50 appearance-none transition-all text-sm"
                  >
                    <option value="" className="bg-slate-950 text-slate-500">Choose Hospital...</option>
                    {hospitals.map(h => (
                      <option key={h._id} value={h._id} className="bg-slate-950 text-white">
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Treatment/Procedure</label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    value={form.treatmentName}
                    onChange={e => setForm(p => ({ ...p, treatmentName: e.target.value }))}
                    placeholder="e.g. Dental Care, Consultation"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2 uppercase font-semibold">Points to Redeem</label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="number"
                  min="1"
                  max={user?.rewardPoints || 0}
                  value={form.points}
                  onChange={e => setForm(p => ({ ...p, points: e.target.value }))}
                  placeholder={`Max: ${user?.rewardPoints || 0}`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || (user?.rewardPoints || 0) <= 0}
              className="btn-emergency w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Gift size={16} /> Redeem Treatment Discount
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Redemption History */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
          <History size={18} className="text-red-400" /> Redemption History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <th className="pb-3">Hospital</th>
                <th className="pb-3">Treatment</th>
                <th className="pb-3">Points Redeemed</th>
                <th className="pb-3">Discount Amount</th>
                <th className="pb-3">Redeemed Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {!(user as any)?.redemptions || (user as any).redemptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pt-6 text-center text-slate-500">
                    No points redeemed yet
                  </td>
                </tr>
              ) : (
                (user as any).redemptions.map((redemption: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 font-medium text-white">{redemption.hospitalName}</td>
                    <td className="py-3">{redemption.treatmentName}</td>
                    <td className="py-3 text-yellow-400 font-bold">{redemption.pointsRedeemed} pts</td>
                    <td className="py-3 text-green-400 font-bold">₹{redemption.discountAmount}</td>
                    <td className="py-3 text-slate-500">
                      {new Date(redemption.redeemedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
