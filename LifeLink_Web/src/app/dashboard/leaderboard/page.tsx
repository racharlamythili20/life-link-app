// src/app/dashboard/leaderboard/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Droplets, Award, Crown } from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/donors/leaderboard')
      .then(({ data }) => setLeaders(data.leaders || []))
      .catch(() => {
        // Demo data
        setLeaders([
          { _id: '1', name: 'Arjun Sharma', bloodGroup: 'O+', totalDonations: 48, rewardPoints: 4800, badges: [{name:'Hero'},{name:'Legend'}] },
          { _id: '2', name: 'Priya Patel', bloodGroup: 'A+', totalDonations: 36, rewardPoints: 3600, badges: [{name:'Life Saver'}] },
          { _id: '3', name: 'Rahul Kumar', bloodGroup: 'B+', totalDonations: 29, rewardPoints: 2900, badges: [{name:'Hero'}] },
          { _id: '4', name: 'Sneha Reddy', bloodGroup: 'AB-', totalDonations: 22, rewardPoints: 2200, badges: [] },
          { _id: '5', name: 'Vikram Singh', bloodGroup: 'O-', totalDonations: 18, rewardPoints: 1800, badges: [] },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const rankColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
  const rankBg = ['border-yellow-500/40 bg-yellow-500/5', 'border-slate-500/40 bg-slate-500/5', 'border-amber-600/40 bg-amber-600/5'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">
            <span className="text-gradient">LEADERBOARD</span>
          </h1>
          <p className="text-slate-400 mt-1">Top blood donors making a difference</p>
        </div>
        <Trophy size={32} className="text-yellow-400" />
      </div>

      {/* Top 3 podium */}
      {leaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[leaders[1], leaders[0], leaders[2]].map((leader, i) => {
            const realRank = i === 0 ? 2 : i === 1 ? 1 : 3;
            return (
              <motion.div
                key={leader._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card p-6 text-center border ${rankBg[realRank - 1]} ${i === 1 ? 'scale-105 -mt-4' : ''}`}
              >
                {realRank === 1 && (
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="text-3xl mb-2"
                  >
                    👑
                  </motion.div>
                )}
                <div className={`font-display text-5xl font-black ${rankColors[realRank - 1]} mb-3`}>
                  #{realRank}
                </div>
                <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center mx-auto mb-3">
                  <span className="font-bold text-xl text-red-400">{leader.name[0]}</span>
                </div>
                <p className="font-semibold text-white">{leader.name}</p>
                <div className="blood-badge mx-auto mt-2 text-xs">{leader.bloodGroup}</div>
                <div className="mt-3">
                  <div className="font-display text-2xl font-black text-white">{leader.totalDonations}</div>
                  <div className="text-slate-500 text-xs">donations</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center gap-2">
          <Award size={18} className="text-yellow-400" />
          <h3 className="font-semibold text-white">All Rankings</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {leaders.map((leader, i) => {
              const isMe = leader._id === user?._id;
              return (
                <motion.div
                  key={leader._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-4 p-4 hover:bg-white/3 transition-all ${isMe ? 'bg-red-500/5 border-l-2 border-red-500' : ''}`}
                >
                  <div className={`font-display text-xl font-black w-10 text-center ${
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'
                  }`}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-600/20 flex items-center justify-center">
                    <span className="text-red-400 font-bold">{leader.name[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{leader.name}</span>
                      {isMe && <span className="text-xs text-red-400 font-medium">(You)</span>}
                      {leader.badges?.slice(0, 2).map((b: any) => (
                        <span key={b.name} className="text-xs bg-purple-500/20 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded-full">
                          {b.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="text-red-400 font-bold">{leader.bloodGroup}</span>
                      <span>{leader.rewardPoints?.toLocaleString()} pts</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-xl font-black text-white">{leader.totalDonations}</div>
                    <div className="text-slate-500 text-xs">donations</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
