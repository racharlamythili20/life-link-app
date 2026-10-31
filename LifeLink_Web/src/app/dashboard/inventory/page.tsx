// src/app/dashboard/inventory/page.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Droplets, Plus, Minus, AlertTriangle, TrendingDown, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const getStockColor = (units: number) => {
  if (units === 0) return '#ef4444';
  if (units < 5) return '#f97316';
  if (units < 10) return '#eab308';
  return '#22c55e';
};

const getStockLabel = (units: number) => {
  if (units === 0) return { text: 'OUT OF STOCK', color: 'text-red-400 bg-red-500/10 border-red-500/30' };
  if (units < 5) return { text: 'CRITICAL LOW', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
  if (units < 10) return { text: 'LOW STOCK', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
  return { text: 'ADEQUATE', color: 'text-green-400 bg-green-500/10 border-green-500/30' };
};

export default function InventoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updateModal, setUpdateModal] = useState<{ open: boolean; bloodGroup: string; action: string }>({
    open: false, bloodGroup: '', action: 'added',
  });
  const [units, setUnits] = useState('1');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const { socket } = useSocketStore();

  const fetchInventory = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/hospitals/${user._id}/inventory`);
      setInventory(data.inventory);
    } catch (err: any) {
      // If inventory not found (404), show empty state — do NOT use fake data
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        setInventory(null);
      } else {
        toast.error('Failed to load inventory');
      }
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Real-time update: re-register when socket or fetchInventory changes
  useEffect(() => {
    if (!socket) return;
    socket.on('inventory_updated', fetchInventory);
    return () => { socket.off('inventory_updated', fetchInventory); };
  }, [socket, fetchInventory]);


  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await api.put('/hospitals/inventory', {
        bloodGroup: updateModal.bloodGroup,
        units: parseInt(units),
        action: updateModal.action,
        reason,
      });
      toast.success(`Inventory updated for ${updateModal.bloodGroup}`);
      setUpdateModal({ open: false, bloodGroup: '', action: 'added' });
      setUnits('1');
      setReason('');
      fetchInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
    setUpdating(false);
  };

  const chartData = BLOOD_GROUPS.map(bg => ({
    name: bg,
    units: inventory?.inventory[bg]?.units || 0,
    color: getStockColor(inventory?.inventory[bg]?.units || 0),
  }));

  const criticalCount = BLOOD_GROUPS.filter(bg => (inventory?.inventory[bg]?.units || 0) < 5).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">
            Blood <span className="text-gradient">Inventory</span>
          </h1>
          <p className="text-slate-400 mt-1">Manage your blood bank stock levels</p>
        </div>
        <div className="live-badge"><span className="live-dot" />Live</div>
      </div>

      {/* Critical alert */}
      {criticalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border-orange-500/40 bg-orange-500/5 flex items-center gap-4"
        >
          <AlertTriangle size={24} className="text-orange-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-orange-400 font-bold">Low Stock Alert</p>
            <p className="text-slate-400 text-sm">
              {criticalCount} blood group(s) are critically low:{' '}
              <span className="text-orange-400 font-semibold">
                {inventory?.criticalGroups?.join(', ')}
              </span>
            </p>
          </div>
          <button
            onClick={() => {
              const bg = inventory?.criticalGroups?.[0] || '';
              router.push(`/emergency?bloodGroup=${encodeURIComponent(bg)}`);
            }}
            className="px-4 py-2 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 text-sm font-medium hover:bg-orange-500/30 transition-all"
          >
            Post Request
          </button>
        </motion.div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'Total Units', value: inventory?.totalUnits || 0, icon: Droplets, color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Critical Low', value: criticalCount, icon: TrendingDown, color: 'text-red-400 bg-red-500/10' },
          { label: 'Blood Groups', value: BLOOD_GROUPS.length, icon: TrendingUp, color: 'text-green-400 bg-green-500/10' },
        ].map(s => (
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
              <div className="font-display text-3xl font-black text-white">{s.value}</div>
              <div className="text-slate-500 text-sm">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card p-6">
        <h3 className="font-display font-bold text-lg text-white mb-5">Stock Levels by Blood Group</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={32}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              formatter={(value: any) => [`${value} units`, 'Stock']}
            />
            <Bar dataKey="units" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Blood group cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {BLOOD_GROUPS.map((bg, i) => {
          const data = inventory?.inventory[bg] || { units: 0 };
          const stockLabel = getStockLabel(data.units);
          const color = getStockColor(data.units);

          return (
            <motion.div
              key={bg}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5"
              style={{ borderColor: color + '30' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="blood-badge" style={{ borderColor: color, color }}>{bg}</div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${stockLabel.color}`}>
                  {stockLabel.text}
                </span>
              </div>

              <div className="font-display text-4xl font-black mb-1" style={{ color }}>
                {data.units}
              </div>
              <div className="text-slate-500 text-xs mb-3">units available</div>

              {/* Stock bar */}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (data.units / 30) * 100)}%` }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUpdateModal({ open: true, bloodGroup: bg, action: 'added' })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all"
                >
                  <Plus size={12} /> Add
                </button>
                <button
                  onClick={() => setUpdateModal({ open: true, bloodGroup: bg, action: 'used' })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                >
                  <Minus size={12} /> Use
                </button>
              </div>

              {data.lastUpdated && (
                <p className="text-slate-600 text-xs mt-2 flex items-center gap-1">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(data.lastUpdated), { addSuffix: true })}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* History */}
      {inventory?.history?.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h3 className="font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="divide-y divide-white/5">
            {inventory.history.slice(0, 10).map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className={`w-2 h-2 rounded-full ${h.action === 'added' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1">
                  <span className="text-white text-sm font-medium">{h.bloodGroup}</span>
                  <span className="text-slate-400 text-sm"> — {h.action} {h.units} unit(s)</span>
                  {h.reason && <span className="text-slate-500 text-sm"> · {h.reason}</span>}
                </div>
                <span className="text-slate-600 text-xs">
                  {h.timestamp ? formatDistanceToNow(new Date(h.timestamp), { addSuffix: true }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Update Modal */}
      {updateModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 max-w-sm w-full"
            style={{ borderColor: 'rgba(220,38,38,0.3)' }}
          >
            <h3 className="font-bold text-white text-lg mb-1">
              {updateModal.action === 'added' ? '➕ Add' : '➖ Use'} Blood Units
            </h3>
            <p className="text-slate-400 text-sm mb-5">
              Blood Group: <span className="text-red-400 font-bold">{updateModal.bloodGroup}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Number of Units</label>
                <input
                  type="number" min="1" max="50" value={units}
                  onChange={e => setUnits(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/40 text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Reason (optional)</label>
                <input
                  type="text" value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="e.g., Received from donation drive"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/40 text-sm transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setUpdateModal({ open: false, bloodGroup: '', action: 'added' })}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center ${
                  updateModal.action === 'added' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
                } disabled:opacity-60`}
              >
                {updating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : updateModal.action === 'added' ? 'Add Units' : 'Deduct Units'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
