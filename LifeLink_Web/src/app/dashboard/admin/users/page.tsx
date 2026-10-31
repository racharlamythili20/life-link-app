// src/app/dashboard/admin/users/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, Filter, Shield, ShieldOff, Check,
  Building2, AlertTriangle, Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

type Role = 'all' | 'donor' | 'receiver' | 'hospital' | 'admin';

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [blockModal, setBlockModal] = useState<{ user: any; open: boolean }>({ user: null, open: false });
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') { router.push('/dashboard'); return; }
    fetchUsers();
  }, [roleFilter, page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  };

  const handleBlock = async () => {
    try {
      await api.put(`/admin/users/${blockModal.user._id}/block`, { reason: blockReason });
      toast.success(`User ${blockModal.user.isBlocked ? 'unblocked' : 'blocked'}`);
      setBlockModal({ user: null, open: false });
      setBlockReason('');
      fetchUsers();
    } catch { toast.error('Action failed'); }
  };

  const handleVerifyHospital = async (userId: string) => {
    try {
      await api.put(`/admin/hospitals/${userId}/verify`);
      toast.success('Hospital verified!');
      fetchUsers();
    } catch { toast.error('Verification failed'); }
  };

  const ROLES: Role[] = ['all', 'donor', 'receiver', 'hospital', 'admin'];
  const roleColors: Record<string, string> = {
    donor: 'text-red-400 bg-red-500/10 border-red-500/30',
    receiver: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    hospital: 'text-green-400 bg-green-500/10 border-green-500/30',
    admin: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">
            User <span className="text-gradient">Management</span>
          </h1>
          <p className="text-slate-400 mt-1">Monitor and manage all platform users</p>
        </div>
        <div className="glass-card px-4 py-2 text-sm text-slate-400">
          Total: <span className="text-white font-bold">{users.length}</span> shown
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/40 text-sm transition-all"
          />
        </div>
        <div className="flex gap-2">
          {ROLES.map(r => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                roleFilter === r ? 'border-red-500 bg-red-500/20 text-red-400' : 'border-white/10 text-slate-400 hover:bg-white/5'
              }`}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['User', 'Role', 'Blood Group', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="skeleton h-4 rounded" style={{ width: `${60 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.map((u, i) => (
                <motion.tr
                  key={u._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`border-b border-white/5 hover:bg-white/3 transition-all ${u.isBlocked ? 'opacity-50' : ''}`}
                >
                  {/* User */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-600/20 flex items-center justify-center flex-shrink-0">
                        {u.profileImage
                          ? <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover rounded-xl" />
                          : <span className="text-red-400 font-bold text-sm">{u.name?.[0]?.toUpperCase()}</span>
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{u.name}</span>
                          {u.isVerified && <Check size={12} className="text-green-400" />}
                        </div>
                        <span className="text-slate-500 text-xs">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${roleColors[u.role] || 'text-slate-400 bg-slate-500/10 border-slate-500/30'}`}>
                      {u.role}
                    </span>
                  </td>

                  {/* Blood group */}
                  <td className="px-5 py-4">
                    {u.bloodGroup
                      ? <span className="text-red-400 font-bold text-sm">{u.bloodGroup}</span>
                      : <span className="text-slate-600 text-sm">—</span>
                    }
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        u.isBlocked ? 'bg-red-500' : u.isActive ? 'bg-green-400' : 'bg-slate-600'
                      }`} />
                      <span className={`text-xs font-medium ${
                        u.isBlocked ? 'text-red-400' : u.isActive ? 'text-green-400' : 'text-slate-500'
                      }`}>
                        {u.isBlocked ? 'Blocked' : u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-4">
                    <span className="text-slate-500 text-xs">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {u.role === 'hospital' && !u.hospitalInfo?.isVerifiedHospital && (
                        <button
                          onClick={() => handleVerifyHospital(u._id)}
                          className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all"
                          title="Verify Hospital"
                        >
                          <Building2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setBlockModal({ user: u, open: true })}
                        className={`p-1.5 rounded-lg border transition-all ${
                          u.isBlocked
                            ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                            : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                        }`}
                        title={u.isBlocked ? 'Unblock' : 'Block'}
                      >
                        {u.isBlocked ? <Shield size={14} /> : <ShieldOff size={14} />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {!loading && users.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No users found</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-40 text-sm">
            ← Prev
          </button>
          <span className="px-4 py-2 text-slate-400 text-sm">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-40 text-sm">
            Next →
          </button>
        </div>
      )}

      {/* Block Modal */}
      {blockModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 max-w-md w-full"
            style={{ borderColor: 'rgba(220,38,38,0.3)' }}
          >
            <h3 className="font-bold text-white text-lg mb-1">
              {blockModal.user?.isBlocked ? 'Unblock' : 'Block'} User
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {blockModal.user?.isBlocked
                ? `Unblock ${blockModal.user?.name}? They will regain access.`
                : `Block ${blockModal.user?.name}? They will lose access immediately.`
              }
            </p>
            {!blockModal.user?.isBlocked && (
              <textarea
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Reason for blocking (optional)"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/40 resize-none text-sm mb-4"
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setBlockModal({ user: null, open: false }); setBlockReason(''); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBlock}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm ${
                  blockModal.user?.isBlocked
                    ? 'bg-green-600 text-white hover:bg-green-500'
                    : 'bg-red-600 text-white hover:bg-red-500'
                }`}
              >
                {blockModal.user?.isBlocked ? 'Unblock' : 'Block User'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
