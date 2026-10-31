// src/app/page.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Droplets, MapPin, Bell, Shield, Users, Activity, 
  ChevronRight, ArrowRight, Zap, Heart, Award 
} from 'lucide-react';
import { useSocketStore } from '@/store/socketStore';
import api from '@/lib/axios';

// Animated number counter
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const step = target / 80;
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          setCount(Math.floor(current));
          if (current >= target) clearInterval(timer);
        }, 20);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="font-display text-4xl md:text-5xl font-black text-gradient">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

// Blood drop SVG animation
function BloodDrops() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20 + 5}%`,
          }}
          animate={{
            y: ['0vh', '110vh'],
            rotate: [0, 10, -10, 0],
            opacity: [0, 0.6, 0.6, 0],
          }}
          transition={{
            duration: Math.random() * 8 + 6,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
        >
          <div
            className="blood-drop"
            style={{
              width: `${Math.random() * 16 + 8}px`,
              height: `${Math.random() * 20 + 12}px`,
              opacity: Math.random() * 0.5 + 0.3,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// Emergency request feed item
function FeedItem({ item, index }: { item: any; index: number }) {
  const priorityColor = {
    critical: 'border-red-500 bg-red-500/10',
    high: 'border-orange-500 bg-orange-500/10',
    medium: 'border-yellow-500 bg-yellow-500/10',
    low: 'border-blue-500 bg-blue-500/10',
  }[item.priority || 'medium'];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ delay: index * 0.1 }}
      className={`glass-card p-4 border ${priorityColor}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="blood-badge text-sm">{item.bloodGroup || 'O+'}</div>
          <div>
            <p className="text-white font-semibold text-sm">{item.hospitalName || 'City Hospital'}</p>
            <p className="text-slate-400 text-xs">{item.unitsRequired || 2} units needed</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`priority-${item.priority || 'medium'}`}>
            {item.priority || 'medium'}
          </span>
          <span className="text-slate-500 text-xs">{item.location?.address || 'Nearby'}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const { activeRequests } = useSocketStore();
  const [stats, setStats] = useState({ donors: 0, requests: 0, lives: 0, hospitals: 0 });
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);

  // Fallback demo feed
  const demoRequests = [
    { bloodGroup: 'O+', hospitalName: 'Apollo Hospital', unitsRequired: 3, priority: 'critical', location: { address: 'Chennai, TN' } },
    { bloodGroup: 'AB-', hospitalName: 'AIIMS Delhi', unitsRequired: 2, priority: 'high', location: { address: 'New Delhi' } },
    { bloodGroup: 'B+', hospitalName: 'Fortis Hospital', unitsRequired: 4, priority: 'medium', location: { address: 'Mumbai, MH' } },
    { bloodGroup: 'A+', hospitalName: 'Manipal Hospital', unitsRequired: 1, priority: 'high', location: { address: 'Bangalore, KA' } },
  ];

  const feedItems = activeRequests.length > 0 ? activeRequests.slice(0, 4) : demoRequests;

  useEffect(() => {
    api.get('/requests/stats').then(({ data }) => {
      setStats({
        donors: data.total || 12847,
        requests: data.active || 342,
        lives: data.fulfilled || 9621,
        hospitals: 156,
      });
    }).catch(() => {
      setStats({ donors: 12847, requests: 342, lives: 9621, hospitals: 156 });
    });
  }, []);

  const features = [
    { icon: Zap, title: 'Real-Time Matching', desc: 'AI-powered donor matching within seconds of an emergency request', color: 'text-yellow-400' },
    { icon: MapPin, title: 'GPS Proximity', desc: 'Find donors within your area using live GPS tracking', color: 'text-blue-400' },
    { icon: Bell, title: 'Instant Alerts', desc: 'Push notifications reach donors in under 3 seconds', color: 'text-red-400' },
    { icon: Shield, title: 'Verified Donors', desc: 'All donors are verified with blood group certificates', color: 'text-green-400' },
    { icon: Activity, title: 'Health Tracking', desc: 'Monitor eligibility, donation history & health metrics', color: 'text-purple-400' },
    { icon: Award, title: 'Rewards System', desc: 'Earn badges, points and certificates for every donation', color: 'text-orange-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-hidden">

      {/* ─── Navigation ──────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="blood-drop w-6 h-8" />
            <span className="font-display font-bold text-xl text-gradient">LIFELINK</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
            <Link href="#map" className="hover:text-white transition-colors">Live Map</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/register" className="btn-emergency text-sm py-2 px-5">
              Join Now
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ────────────────────────────────────── */}
      <motion.section
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative min-h-screen flex items-center justify-center pt-16"
      >
        {/* Background */}
        <div className="absolute inset-0 gradient-dark" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <BloodDrops />

        <div className="relative z-10 max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: CTA */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="live-badge mb-6 inline-flex"
            >
              <span className="live-dot" />
              LIVE EMERGENCY SYSTEM
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-5xl md:text-7xl font-black leading-tight mb-6"
            >
              <span className="text-white">SAVE</span>
              <br />
              <span className="text-gradient glow-red">LIVES</span>
              <br />
              <span className="text-white">IN REAL</span>
              <br />
              <span className="text-gradient">TIME</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-slate-400 text-lg md:text-xl max-w-xl mb-8 leading-relaxed"
            >
              The world's most advanced blood donation platform. Connect with nearby donors instantly,
              respond to emergencies in seconds, and save lives with technology.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4"
            >
              <Link href="/emergency" className="btn-emergency flex items-center gap-2 text-base">
                <Droplets size={20} />
                REQUEST BLOOD NOW
              </Link>
              <Link href="/donors" className="glass-card px-6 py-4 flex items-center gap-2 text-white font-semibold hover:bg-white/10 transition-colors text-base">
                Find Donors
                <ChevronRight size={18} />
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-8 mt-12 pt-8 border-t border-white/10"
            >
              {[
                { label: 'Donors', value: stats.donors.toLocaleString() },
                { label: 'Lives Saved', value: stats.lives.toLocaleString() },
                { label: 'Hospitals', value: stats.hospitals },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="font-display text-2xl font-black text-gradient">{value}</div>
                  <div className="text-slate-500 text-sm mt-1">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Live Feed */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="live-badge">
                <span className="live-dot" />
                LIVE REQUESTS
              </div>
              <Link href="/requests" className="text-sm text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            <AnimatePresence mode="popLayout">
              {feedItems.map((item, i) => (
                <FeedItem key={i} item={item} index={i} />
              ))}
            </AnimatePresence>

            <Link href="/emergency" className="block w-full btn-emergency text-center mt-6">
              🚨 POST EMERGENCY REQUEST
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ─── Statistics ──────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.08),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-red-500 font-semibold text-sm uppercase tracking-widest">Impact</span>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white mt-3">
              NUMBERS THAT <span className="text-gradient">MATTER</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Active Donors', value: 12847, suffix: '+' },
              { label: 'Lives Saved', value: 9621, suffix: '+' },
              { label: 'Hospitals', value: 156, suffix: '' },
              { label: 'Cities Covered', value: 48, suffix: '' },
            ].map(({ label, value, suffix }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card p-8 text-center"
              >
                <AnimatedCounter target={value} suffix={suffix} />
                <p className="text-slate-400 mt-3 font-medium">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-red-500 font-semibold text-sm uppercase tracking-widest">Technology</span>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white mt-3">
              POWERED BY <span className="text-gradient">INTELLIGENCE</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass-card p-8 group cursor-pointer"
              >
                <div className={`${feature.color} mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={40} />
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.08),transparent_60%)]" />
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-red-500 font-semibold text-sm uppercase tracking-widest">Process</span>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white mt-3">
              HOW IT <span className="text-gradient">WORKS</span>
            </h2>
          </motion.div>

          <div className="space-y-12">
            {[
              { step: '01', title: 'Post Emergency Request', desc: 'In one click, create a blood request with blood group, hospital location, and urgency level. Our AI instantly calculates priority score.' },
              { step: '02', title: 'AI Matches Nearby Donors', desc: 'Our algorithm scans all available donors within your specified radius, filtered by compatible blood groups and donation eligibility.' },
              { step: '03', title: 'Real-Time Notifications', desc: 'Matched donors receive push notifications instantly. They can accept the request with a single tap, starting the response timer.' },
              { step: '04', title: 'Coordinate & Donate', desc: 'Chat directly with the donor, get real-time ETA, and complete the donation. Earn badges, points, and digital certificates.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex gap-8 items-start"
              >
                <div className="flex-shrink-0 font-display text-6xl font-black text-gradient opacity-30">
                  {item.step}
                </div>
                <div className="glass-card p-6 flex-1">
                  <h3 className="font-display font-bold text-xl text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Emergency CTA ───────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 relative overflow-hidden"
            style={{ borderColor: 'rgba(220,38,38,0.4)' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.1),transparent_70%)]" />
            <div className="relative z-10">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-6xl mb-6"
              >
                🚨
              </motion.div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">
                NEED BLOOD <span className="text-gradient">NOW?</span>
              </h2>
              <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
                Don't wait. Every second counts in an emergency. Post your request and connect with
                verified donors near you instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/emergency" className="btn-emergency text-lg px-10 py-4">
                  🩸 EMERGENCY REQUEST
                </Link>
                <Link href="/register?role=donor" className="glass-card px-8 py-4 text-white font-semibold hover:bg-white/10 transition-colors">
                  Become a Donor
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="blood-drop w-5 h-7" />
                <span className="font-display font-bold text-xl text-gradient">LIFELINK</span>
              </div>
              <p className="text-slate-500 text-sm">
                Connecting blood donors with patients in real time. Every donation saves a life.
              </p>
            </div>
            {[
              { title: 'Platform', links: ['Find Donors', 'Post Request', 'Hospitals', 'Blood Banks'] },
              { title: 'Account', links: ['Register', 'Login', 'Dashboard', 'Settings'] },
              { title: 'Support', links: ['Help Center', 'Contact', 'Privacy Policy', 'Terms'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-white mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-slate-500 hover:text-red-400 text-sm transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 text-center text-slate-600 text-sm">
            © 2024 LifeLink. Made with ❤️ to save lives.
          </div>
        </div>
      </footer>
    </div>
  );
}
