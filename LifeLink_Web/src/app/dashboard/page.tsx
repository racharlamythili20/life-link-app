// src/app/dashboard/page.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { Droplets, Users, Activity, Award, AlertCircle, TrendingUp, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import api from '@/lib/axios';

// Stat card component
function StatCard({ icon: Icon, label, value, delta, color, loading }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="glass-card p-6"
    >
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-8 w-8 rounded-lg" />
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-4 w-16" />
        </div>
      ) : (
        <>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
            <Icon size={20} />
          </div>
          <div className="font-display text-3xl font-black text-white mb-1">{value}</div>
          <div className="text-slate-400 text-sm">{label}</div>
          {delta && (
            <div className="flex items-center gap-1 mt-2 text-green-400 text-xs font-medium">
              <TrendingUp size={12} />
              {delta}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [stats, setStats] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user?._id) return;
    try {
      const endpoint = user.role === 'admin' ? '/admin/stats' : '/requests/stats';
      const [statsRes, feedRes] = await Promise.all([
        api.get(endpoint),
        api.get('/requests?status=active&limit=6'),
      ]);
      setStats(statsRes.data);
      setRecentRequests(feedRes.data.requests || []);
    } catch {
      setStats({ total: 0, active: 0, fulfilled: 0, emergency: 0, byBloodGroup: [], totalDonors: 0, totalHospitals: 0 });
      setRecentRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.role]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_emergency_request', fetchStats);
    socket.on('request_feed_update', fetchStats);
    socket.on('request_accepted', fetchStats);
    socket.on('request_fulfilled', fetchStats);
    socket.on('request_cancelled', fetchStats);
    socket.on('inventory_updated', fetchStats);
    return () => {
      socket.off('new_emergency_request', fetchStats);
      socket.off('request_feed_update', fetchStats);
      socket.off('request_accepted', fetchStats);
      socket.off('request_fulfilled', fetchStats);
      socket.off('request_cancelled', fetchStats);
      socket.off('inventory_updated', fetchStats);
    };
  }, [socket, fetchStats]);

  // Demo chart data
  const areaData = [
    { month: 'Aug', requests: 120, fulfilled: 98 },
    { month: 'Sep', requests: 145, fulfilled: 120 },
    { month: 'Oct', requests: 189, fulfilled: 155 },
    { month: 'Nov', requests: 210, fulfilled: 175 },
    { month: 'Dec', requests: 265, fulfilled: 220 },
    { month: 'Jan', requests: 342, fulfilled: 198 },
  ];

  const donorStats = [
    { label: 'Total Donations', value: user?.totalDonations || 0, icon: Droplets, color: 'bg-red-600/20 text-red-400' },
    { label: 'Reward Points', value: user?.rewardPoints || 0, icon: Award, color: 'bg-yellow-600/20 text-yellow-400' },
    { label: 'Badges Earned', value: user?.badges?.length || 0, icon: Award, color: 'bg-purple-600/20 text-purple-400' },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},{' '}
            <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-400 mt-1">
            {(stats?.emergency ?? 0) > 0
              ? `${stats.emergency} active emergency request${stats.emergency > 1 ? 's' : ''} nearby`
              : 'All systems operational • No critical alerts'}
          </p>
        </div>
        {user?.role === 'donor' && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${
            user.isAvailable
              ? 'border-green-500/40 bg-green-500/10 text-green-400'
              : 'border-slate-700 bg-white/5 text-slate-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${user.isAvailable ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
            {user.isAvailable ? 'Available to Donate' : 'Not Available'}
          </div>
        )}
      </div>

      {/* ── Emergency Alert Banner ── */}
      {(stats?.emergency ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-4 border-red-500/50 bg-red-500/5"
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-2xl"
            >
              🚨
            </motion.div>
            <div className="flex-1">
              <p className="text-red-400 font-bold">Critical Emergency Alert</p>
              <p className="text-slate-400 text-sm">
                {stats.emergency} active emergency blood request{stats.emergency > 1 ? 's' : ''} right now
              </p>
            </div>
            <Link href="/dashboard/requests" className="btn-emergency py-2 px-5 text-sm">
              View Requests
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={AlertCircle} label="Active Requests" value={stats?.active ?? '—'} color="bg-red-600/20 text-red-400" loading={loading} delta="+12% this week" />
        <StatCard icon={Activity} label="Fulfilled Today" value={stats?.fulfilled ?? '—'} color="bg-green-600/20 text-green-400" loading={loading} delta="+8% vs yesterday" />
        <StatCard icon={Users} label="Donors Online" value={stats?.totalDonors ?? '—'} color="bg-blue-600/20 text-blue-400" loading={loading} />
        <StatCard icon={AlertCircle} label="Emergency Active" value={stats?.emergency ?? '—'} color="bg-orange-600/20 text-orange-400" loading={loading} />
      </div>

      {/* ── Donor Personal Stats (for donors) ── */}
      {user?.role === 'donor' && (
        <div className="grid grid-cols-3 gap-5">
          {donorStats.map(s => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={22} />
              </div>
              <div>
                <div className="font-display text-2xl font-black text-white">{s.value}</div>
                <div className="text-slate-400 text-sm">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Request Activity</h3>
              <p className="text-slate-500 text-sm mt-0.5">Requests vs fulfilled (6 months)</p>
            </div>
            <div className="live-badge"><span className="live-dot" />Live</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fulGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc' }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <Area type="monotone" dataKey="requests" stroke="#ef4444" fill="url(#reqGrad)" strokeWidth={2} name="Requests" />
              <Area type="monotone" dataKey="fulfilled" stroke="#22c55e" fill="url(#fulGrad)" strokeWidth={2} name="Fulfilled" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Blood group pie chart */}
        <div className="glass-card p-6">
          <h3 className="font-display font-bold text-lg text-white mb-2">By Blood Group</h3>
          <p className="text-slate-500 text-sm mb-4">Active requests distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={stats?.byBloodGroup || []}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={70}
                dataKey="count" nameKey="_id"
              >
                {(stats?.byBloodGroup || []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {(stats?.byBloodGroup || []).slice(0, 4).map((item: any, i: number) => (
              <div key={item._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-slate-400 text-sm">{item._id}</span>
                </div>
                <span className="text-white text-sm font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live Request Feed ── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h3 className="font-display font-bold text-lg text-white">Live Request Feed</h3>
            <div className="live-badge"><span className="live-dot" />Live</div>
          </div>
          <Link href="/dashboard/requests" className="text-sm text-red-400 hover:text-red-300 transition-colors">
            View all →
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Droplets size={40} className="mx-auto mb-3 opacity-30" />
            <p>No active requests right now</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {recentRequests.slice(0, 6).map((req: any, i) => (
              <motion.div
                key={req._id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-all cursor-pointer border border-white/5"
              >
                <div className="blood-badge text-xs">{req.bloodGroup}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{req.hospitalName}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={10} />
                    <span className="truncate">{req.location?.address || 'Location TBD'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`priority-${req.priority}`}>{req.priority}</span>
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <Clock size={10} /> {req.unitsRequired}u
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/emergency', label: '🚨 Emergency Request', color: 'from-red-600 to-red-800', glow: true },
          { href: '/dashboard/map', label: '🗺 Live Donor Map', color: 'from-blue-600 to-blue-900' },
          { href: '/dashboard/donations', label: '💉 My Donations', color: 'from-purple-600 to-purple-900' },
          { href: '/dashboard/leaderboard', label: '🏆 Leaderboard', color: 'from-yellow-600 to-yellow-900' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className={`bg-gradient-to-br ${action.color} p-5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105 hover:shadow-lg text-center ${action.glow ? 'glow-red' : ''}`}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
