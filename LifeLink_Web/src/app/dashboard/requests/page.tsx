// src/app/dashboard/requests/page.tsx
'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, MapPin, Clock, Users, Filter, Search, Check, X, Phone, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { formatDistanceToNow } from 'date-fns';

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PRIORITIES = ['All', 'critical', 'high', 'medium', 'low'];

const canDonateTo = (donorGroup: string, requestGroup: string) => {
  const matrix: Record<string, string[]> = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
  };
  return matrix[donorGroup]?.includes(requestGroup) ?? false;
};

interface RequestCardProps {
  req: any;
  onAccept: (id: string) => Promise<void>;
  onComplete: (id: string, units?: number) => Promise<void>;
  onFulfill?: (id: string) => Promise<void>;
  userId: string;
  userRole?: string;
}

function RequestCard({ req, onAccept, onComplete, onFulfill, userId, userRole }: RequestCardProps) {
  const [accepting, setAccepting] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);

  // Find this user's own response (donor who clicked accept)
  const myResponse = req.responses?.find(
    (r: any) => (r.donor?._id || r.donor)?.toString() === userId?.toString()
  );
  // True ONLY if another donor (not this user) has accepted
  const anyResponseAccepted = !myResponse && req.responses?.some((r: any) => r.status === 'accepted');

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept(req._id);
      toast.success('Request accepted! Contact the patient to coordinate.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to accept');
    } finally {
      setAccepting(false);
    }
  };

  const handleFulfill = async () => {
    if (!onFulfill) return;
    setFulfilling(true);
    try {
      await onFulfill(req._id);
      toast.success('Patient request fulfilled successfully from your inventory!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fulfill request');
    } finally {
      setFulfilling(false);
    }
  };

  const priorityStyle = {
    critical: 'border-red-500/60 bg-red-500/5',
    high: 'border-orange-500/40 bg-orange-500/5',
    medium: 'border-yellow-500/30 bg-yellow-500/5',
    low: 'border-blue-500/30 bg-blue-500/5',
  }[req.priority as 'critical' | 'high' | 'medium' | 'low'] || 'border-white/10';

  const isOwnRequest = (req.requestedBy?._id || req.requestedBy)?.toString() === userId?.toString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-5 border ${priorityStyle}`}
    >
      <div className="flex items-start gap-4">
        <div className="blood-badge flex-shrink-0">{req.bloodGroup}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-white">{req.hospitalName}</h3>
            <span className={`priority-${req.priority} flex-shrink-0`}>{req.priority}</span>
          </div>

          <p className="text-slate-400 text-sm mb-3">
            Patient: <span className="text-white">{req.patientName}</span>
            {req.medicalReason && <span className="text-slate-500"> · {req.medicalReason}</span>}
          </p>

          <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-4">
            <span className="flex items-center gap-1">
              <Droplets size={12} className="text-red-400" />
              {req.unitsRequired} units needed ({req.unitsCollected} collected)
            </span>
            {req.location?.address && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {req.location.address.substring(0, 40)}{req.location.address.length > 40 ? '...' : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDistanceToNow(new Date(req.createdAt))} ago
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {req.responses?.length || 0} responses
            </span>
          </div>

          <div className="mb-3 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Units collected</span>
              <span>{req.unitsCollected}/{req.unitsRequired}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((req.unitsCollected / req.unitsRequired) * 100, 100)}%` }}
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Donor: show their own accepted/donated state */}
            {myResponse ? (
              <div className="flex items-center gap-2 text-sm">
                {myResponse.status === 'accepted' && (
                  <>
                    <span className="flex items-center gap-1 text-green-400">
                      <Check size={14} /> Accepted — You are assigned
                    </span>
                    <a href={`tel:${req.contactNumber}`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-all">
                      <Phone size={12} /> Call Patient
                    </a>
                    <button
                      onClick={() => onComplete(req._id, req.unitsRequired)}
                      className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-all"
                    >
                      Mark Donated
                    </button>
                  </>
                )}
                {myResponse.status === 'donated' && (
                  <span className="flex items-center gap-1 text-purple-400"><Check size={14} /> You Donated ✓ (+{req.unitsRequired || myResponse.units} units to hospital)</span>
                )}
              </div>
            ) : anyResponseAccepted ? (
              // Another donor already accepted
              <span className="text-orange-400 text-sm flex items-center gap-1.5 font-bold uppercase tracking-wide">
                <X size={14} className="text-red-500" /> Accepted by another donor
              </span>
            ) : userRole === 'donor' && req.status === 'active' ? (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="btn-emergency py-2 px-5 text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {accepting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                Accept & Donate
              </button>
            ) : userRole === 'hospital' && !isOwnRequest && req.status === 'active' ? (
              <button
                onClick={handleFulfill}
                disabled={fulfilling}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-green-500/10"
              >
                {fulfilling ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Heart size={14} />}
                Fulfill from Inventory
              </button>
            ) : (req.status !== 'active') ? (
              <span className="text-green-400 text-sm flex items-center gap-1 font-semibold capitalize">
                <Check size={14} /> Status: {req.status}
              </span>
            ) : null}

            <a
              href={`tel:${req.contactNumber}`}
              className="ml-auto p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Phone size={16} />
            </a>
          </div>

          {/* Hospital: show accepted donor details */}
          {userRole === 'hospital' && isOwnRequest && req.responses && req.responses.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Responded Donors:</p>
              {req.responses.map((resp: any, idx: number) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white/2 p-2.5 rounded-lg border border-white/5">
                  <span className="text-white font-medium">
                    {resp.donor?.name || 'Anonymous Donor'} ({resp.donor?.bloodGroup || 'Group TBD'})
                  </span>
                  <span className="text-slate-400">
                    Status: <span className="text-green-400 font-bold capitalize">{resp.status}</span>
                  </span>
                  {resp.donor?.phone && (
                    <a href={`tel:${resp.donor.phone}`} className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                      <Phone size={10} /> {resp.donor.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function RequestsPage() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ bloodGroup: 'All', priority: 'All', search: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'mine' | 'patients'>('mine');

  // Use useCallback with all deps so socket listener always has fresh fetch function
  const fetchRequests = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filters.bloodGroup !== 'All') params.set('bloodGroup', filters.bloodGroup);
      if (filters.priority !== 'All') params.set('priority', filters.priority);

      if (user.role === 'receiver') {
        // Patient: see all their own requests
        params.set('requestedBy', user._id);
        params.set('status', 'all');
      } else if (user.role === 'donor') {
        // Donor sees both active (to accept) and their responded requests
        params.set('status', 'all');
      } else if (user.role === 'hospital') {
        if (activeTab === 'mine') {
          params.set('requestedBy', user._id);
          params.set('status', 'all');
        } else {
          // Patient requests feed: active only, not created by this hospital
          params.set('status', 'active');
        }
      }

      const { data } = await api.get(`/requests?${params}`);
      let fetched = data.requests || [];

      // For donors: keep only active requests (not yet accepted) + their own responded ones
      if (user.role === 'donor') {
        fetched = fetched.filter((r: any) => {
          const myResp = r.responses?.find(
            (resp: any) => (resp.donor?._id || resp.donor)?.toString() === user._id?.toString()
          );
          if (myResp) return true; // always show requests donor responded to
          return r.status === 'active'; // only show active to accept
        });
      }

      setRequests(fetched);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error('fetchRequests error:', err);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.role, filters, page, activeTab]);

  // Fetch on mount + whenever deps change
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time socket listeners — re-register whenever fetchRequests changes (which captures latest deps)
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => fetchRequests();

    socket.on('new_emergency_request', handleUpdate);
    socket.on('request_feed_update', handleUpdate);
    socket.on('request_accepted', handleUpdate);
    socket.on('request_fulfilled', handleUpdate);
    socket.on('request_cancelled', handleUpdate);
    socket.on('inventory_updated', handleUpdate);

    return () => {
      socket.off('new_emergency_request', handleUpdate);
      socket.off('request_feed_update', handleUpdate);
      socket.off('request_accepted', handleUpdate);
      socket.off('request_fulfilled', handleUpdate);
      socket.off('request_cancelled', handleUpdate);
      socket.off('inventory_updated', handleUpdate);
    };
  }, [socket, fetchRequests]);

  const handleAccept = async (id: string) => {
    try {
      await api.put(`/requests/${id}/accept`);
      await fetchRequests();
    } catch (err: any) {
      throw err;
    }
  };

  const handleComplete = async (id: string, units?: number) => {
    try {
      const req = requests.find(r => r._id === id);
      const donateUnits = units || req?.unitsRequired || 1;
      await api.put(`/requests/${id}/complete`, { units: donateUnits });
      toast.success('Donation completed! +100 points awarded.');
      await fetchRequests();
      // Refresh donor profile for updated points
      try {
        const { data } = await api.get('/auth/me');
        useAuthStore.getState().updateUser(data.user);
      } catch {}
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to complete donation');
    }
  };

  const handleFulfill = async (id: string) => {
    try {
      await api.put(`/requests/${id}/fulfill`);
      await fetchRequests();
    } catch (err: any) {
      throw err;
    }
  };

  // Filter/search on the fetched data
  const filtered = requests.filter(r => {
    const matchesSearch = !filters.search ||
      r.hospitalName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      r.patientName?.toLowerCase().includes(filters.search.toLowerCase());
    if (!matchesSearch) return false;

    // For hospital "patients" tab: exclude hospital's own requests
    if (user?.role === 'hospital' && activeTab === 'patients') {
      const isOwn = (r.requestedBy?._id || r.requestedBy)?.toString() === user._id?.toString();
      return !isOwn;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">
            Blood <span className="text-gradient">Requests</span>
          </h1>
          <p className="text-slate-400 mt-1">Real-time database requests logs and feeds</p>
        </div>
        <div className="live-badge"><span className="live-dot" />LIVE FEED</div>
      </div>

      {/* Hospital Tab Selector */}
      {user?.role === 'hospital' && (
        <div className="flex border-b border-white/5 pb-1 gap-4">
          <button
            onClick={() => { setActiveTab('mine'); setPage(1); }}
            className={`pb-2.5 text-sm font-semibold tracking-tight transition-all relative ${activeTab === 'mine' ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Created by Us
            {activeTab === 'mine' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400 rounded-full" />}
          </button>
          <button
            onClick={() => { setActiveTab('patients'); setPage(1); }}
            className={`pb-2.5 text-sm font-semibold tracking-tight transition-all relative ${activeTab === 'patients' ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Patient Requests
            {activeTab === 'patients' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400 rounded-full" />}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search by hospital or patient name..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/40 transition-all text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Blood:</span>
            {BLOOD_GROUPS.map(bg => (
              <button key={bg} onClick={() => setFilters(f => ({ ...f, bloodGroup: bg }))}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${filters.bloodGroup === bg ? 'border-red-500 bg-red-500/20 text-red-400' : 'border-white/10 text-slate-500 hover:border-white/20'}`}
              >{bg}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Priority:</span>
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => setFilters(f => ({ ...f, priority: p }))}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all capitalize ${filters.priority === p ? 'border-orange-500 bg-orange-500/20 text-orange-400' : 'border-white/10 text-slate-500 hover:border-white/20'}`}
              >{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Request List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="flex gap-4">
                <div className="skeleton w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-48" />
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-4 w-64" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Droplets size={48} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-white font-semibold mb-2">No requests found</h3>
          <p className="text-slate-500 text-sm">
            {user?.role === 'receiver' ? 'You have not created any blood requests yet.' :
             user?.role === 'donor' ? 'No compatible blood requests available right now.' :
             'No requests available. Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {filtered.map(req => (
              <RequestCard
                key={req._id}
                req={req}
                userId={user?._id || ''}
                userRole={user?.role}
                onAccept={handleAccept}
                onComplete={handleComplete}
                onFulfill={handleFulfill}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all ${page === i + 1 ? 'border-red-500 bg-red-500/20 text-red-400' : 'border-white/10 text-slate-500 hover:bg-white/5'}`}
            >{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
