// src/app/dashboard/layout.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Droplets, MapPin, Bell, MessageSquare,
  Settings, LogOut, User, Activity, Building2, ShieldCheck,
  Trophy, AlertCircle, Award
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

const NAV_ITEMS = {
  donor: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/requests', icon: Droplets, label: 'Blood Requests' },
    { href: '/dashboard/map', icon: MapPin, label: 'Live Map' },
    { href: '/dashboard/donations', icon: Activity, label: 'My Donations' },
    { href: '/dashboard/discounts', icon: Award, label: 'Redeem Points' },
    { href: '/dashboard/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    { href: '/dashboard/profile', icon: User, label: 'Profile' },
  ],
  receiver: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/emergency', icon: AlertCircle, label: 'Emergency Request' },
    { href: '/dashboard/requests', icon: Droplets, label: 'My Requests' },
    { href: '/dashboard/map', icon: MapPin, label: 'Find Donors' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    { href: '/dashboard/profile', icon: User, label: 'Profile' },
  ],
  hospital: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/inventory', icon: Droplets, label: 'Blood Inventory' },
    { href: '/dashboard/requests', icon: Activity, label: 'Requests' },
    { href: '/dashboard/discounts', icon: Award, label: 'Discounts Applied' },
    { href: '/dashboard/map', icon: MapPin, label: 'Live Map' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Alerts' },
    { href: '/dashboard/profile', icon: Building2, label: 'Hospital Profile' },
  ],
  admin: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/admin/users', icon: User, label: 'Users' },
    { href: '/dashboard/admin/requests', icon: Droplets, label: 'Requests' },
    { href: '/dashboard/admin/hospitals', icon: Building2, label: 'Hospitals' },
    { href: '/dashboard/admin/fraud', icon: ShieldCheck, label: 'Fraud Alerts' },
    { href: '/dashboard/map', icon: MapPin, label: 'Live Map' },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocketStore();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Sync latest user profile details (points, donation count, badges) from backend once on mount
      api.get('/auth/me')
        .then(({ data }) => {
          useAuthStore.getState().updateUser(data.user);
        })
        .catch(() => {});
    }
  }, []);

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role as keyof typeof NAV_ITEMS] || NAV_ITEMS.donor;

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 h-full w-64 glass border-r border-white/5 z-40 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="blood-drop w-6 h-8" />
            <span className="font-display font-bold text-lg text-gradient">LIFELINK</span>
          </Link>
          <div className="flex items-center gap-2 mt-3">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-slate-500">{isConnected ? 'Connected' : 'Reconnecting...'}</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center overflow-hidden">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-red-400 font-bold text-sm">{user.name[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm truncate">{user.name}</p>
              <div className="flex items-center gap-2">
                {user.bloodGroup && (
                  <span className="text-xs text-red-400 font-bold">{user.bloodGroup}</span>
                )}
                <span className="text-xs text-slate-500 capitalize">{user.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={18} className={active ? 'text-red-400' : 'text-slate-500 group-hover:text-white'} />
                {item.label}
                {active && (
                  <motion.div layoutId="nav-indicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-white/5 space-y-1">
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Settings size={18} /> Settings
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="ml-64 flex-1 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
