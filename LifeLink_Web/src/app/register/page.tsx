// src/app/register/page.tsx
'use client';
import { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, Lock, Phone, Droplets, Building2, Users, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { signInWithGoogle } from '@/lib/firebase';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const ROLES = [
  { id: 'donor', icon: Droplets, label: 'Blood Donor', desc: 'I want to donate blood and save lives', color: 'border-red-500 bg-red-500/10' },
  { id: 'receiver', icon: Users, label: 'Patient / Receiver', desc: 'I or someone I know needs blood', color: 'border-blue-500 bg-blue-500/10' },
  { id: 'hospital', icon: Building2, label: 'Hospital / Blood Bank', desc: 'Manage blood inventory and requests', color: 'border-green-500 bg-green-500/10' },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, firebaseLogin, isLoading } = useAuthStore();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    role: searchParams.get('role') || 'donor',
    name: '', email: '', password: '', phone: '',
    bloodGroup: '', age: '', weight: '',
  });

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || isLoading) return;
    setSubmitting(true);
    try {
      await register({
        ...form,
        age: form.age ? parseInt(form.age) : undefined,
        weight: form.weight ? parseInt(form.weight) : undefined,
      } as any);
      toast.success('Account created! Please verify your email.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err?.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.1),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="blood-drop w-8 h-10" />
            <span className="font-display text-2xl font-black text-gradient">LIFELINK</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Join thousands saving lives every day</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s < step ? 'bg-green-500 text-white' :
                s === step ? 'bg-red-600 text-white' :
                'bg-white/10 text-slate-500'
              }`}>
                {s < step ? <Check size={14} /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-8" style={{ borderColor: 'rgba(220,38,38,0.2)' }}>
          <AnimatePresence mode="wait">

            {/* ── Step 1: Role Selection ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-white mb-2">I am a...</h2>
                <p className="text-slate-400 text-sm mb-6">Select your role to personalize your experience</p>

                <div className="space-y-3 mb-8">
                  {ROLES.map(role => (
                    <button
                      key={role.id}
                      onClick={() => update('role', role.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        form.role === role.id ? role.color : 'border-white/10 bg-white/5 hover:bg-white/8'
                      }`}
                    >
                      <role.icon size={24} className={form.role === role.id ? 'text-white' : 'text-slate-400'} />
                      <div>
                        <div className="font-semibold text-white">{role.label}</div>
                        <div className="text-slate-400 text-sm">{role.desc}</div>
                      </div>
                      {form.role === role.id && (
                        <Check size={20} className="ml-auto text-white" />
                      )}
                    </button>
                  ))}
                </div>

                <button onClick={handleNext} className="btn-emergency w-full flex items-center justify-center gap-2">
                  Continue <ArrowRight size={18} />
                </button>

                <div className="relative my-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-white/10" />
                    <span className="text-slate-500 text-sm">or</span>
                    <div className="flex-1 border-t border-white/10" />
                  </div>
                </div>

                <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white font-medium">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </motion.div>
            )}

            {/* ── Step 2: Basic Info ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-white mb-6">Your Details</h2>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="text" required value={form.name} onChange={e => update('name', e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="password" required value={form.password} onChange={e => update('password', e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleBack} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5">
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button onClick={handleNext} disabled={!form.name || !form.email || !form.password} className="btn-emergency flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Health Info (donors) / Hospital Info ── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-white mb-6">
                  {form.role === 'donor' ? 'Health Information' : 'Additional Info'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                  {form.role === 'donor' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Blood Group *</label>
                        <div className="grid grid-cols-4 gap-2">
                          {BLOOD_GROUPS.map(bg => (
                            <button
                              key={bg} type="button"
                              onClick={() => update('bloodGroup', bg)}
                              className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                form.bloodGroup === bg
                                  ? 'border-red-500 bg-red-500/20 text-red-400'
                                  : 'border-white/10 text-slate-400 hover:border-white/20'
                              }`}
                            >
                              {bg}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-300 mb-2">Age</label>
                          <input
                            type="number" min="18" max="65" value={form.age} onChange={e => update('age', e.target.value)}
                            placeholder="25"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-300 mb-2">Weight (kg)</label>
                          <input
                            type="number" min="45" value={form.weight} onChange={e => update('weight', e.target.value)}
                            placeholder="70"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleBack} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5">
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button type="submit" disabled={isLoading || submitting || (form.role === 'donor' && !form.bloodGroup)} className="btn-emergency flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                      {isLoading || submitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><Droplets size={18} /> Create Account</>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-slate-500 text-sm mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-red-400 hover:text-red-300">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
