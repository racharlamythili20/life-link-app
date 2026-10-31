'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Droplets, Calendar, Download, ShieldCheck, AlertTriangle, ArrowRight, Activity, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';

export default function DonationsPage() {
  const { user } = useAuthStore();
  const [donations, setDonations] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [donationsRes, eligibilityRes] = await Promise.all([
          api.get('/donors/me/donations').catch(() => ({ data: { donations: [] } })),
          api.get('/donors/me/eligibility').catch(() => ({ data: { eligible: true, reasons: [] } }))
        ]);
        
        // Handle mock responses or actual arrays
        setDonations(donationsRes.data?.donations || []);
        setEligibility(eligibilityRes.data || { eligible: true, reasons: [] });
      } catch (err) {
        console.error('Failed to fetch data', err);
        toast.error('Failed to load your donation data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const downloadCertificate = (donation: any) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Background styling
      doc.setFillColor(10, 10, 15); // Dark medical theme background
      doc.rect(0, 0, 297, 210, 'F');

      // Decorative borders
      doc.setDrawColor(220, 38, 38); // Red accent
      doc.setLineWidth(2);
      doc.rect(10, 10, 277, 190);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.rect(15, 15, 267, 180);

      // Blood Drop Icon Placeholder (Red Circle)
      doc.setFillColor(220, 38, 38);
      doc.circle(148.5, 30, 4, 'F');

      // Title
      doc.setTextColor(220, 38, 38); // Red
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(36);
      doc.text('CERTIFICATE OF APPRECIATION', 148.5, 50, { align: 'center' });

      // Subtitle
      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(16);
      doc.text('PROUDLY PRESENTED TO', 148.5, 70, { align: 'center' });

      // Donor Name
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(32);
      doc.text((user?.name || 'Valued Donor').toUpperCase(), 148.5, 90, { align: 'center' });

      // Divider Line
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.line(80, 105, 217, 105);

      // Description
      doc.setTextColor(200, 200, 200);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text('For selflessly donating blood and demonstrating an outstanding commitment', 148.5, 125, { align: 'center' });
      doc.text('to saving lives and supporting community health at:', 148.5, 135, { align: 'center' });

      // Hospital Name
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text((donation.hospitalName || 'LifeLink Network Hospital').toUpperCase(), 148.5, 150, { align: 'center' });

      // Details Block
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      const dateStr = format(new Date(donation.createdAt || Date.now()), 'MMMM dd, yyyy');
      doc.text(`Blood Group: ${donation.bloodGroup || user?.bloodGroup || 'O+'}   |   Date: ${dateStr}`, 148.5, 165, { align: 'center' });

      // Signatures Area
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(24);
      doc.text('LIFELINK', 60, 180, { align: 'center' });
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      doc.line(40, 185, 80, 185);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Official Platform', 60, 190, { align: 'center' });

      doc.setTextColor(220, 38, 38);
      doc.setFontSize(24);
      doc.text('Verified', 237, 180, { align: 'center' });
      doc.line(217, 185, 257, 185);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Authorized Signature', 237, 190, { align: 'center' });

      // Save PDF
      doc.save(`LifeLink_Donation_Certificate_${dateStr.replace(/ /g, '_')}.pdf`);
      toast.success('Certificate downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate certificate. Please try again.');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-black text-white uppercase tracking-tight">
          My <span className="text-gradient">Donations</span>
        </h1>
        <p className="text-slate-400">Track your impact, download certificates, and view your eligibility status.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Droplets size={80} />
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <Activity size={24} />
          </div>
          <div className="font-display text-4xl font-black text-white mb-1">
            {user?.totalDonations || 0}
          </div>
          <div className="text-slate-400 font-medium">Total Donations</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Award size={80} />
          </div>
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 mb-4">
            <Award size={24} />
          </div>
          <div className="font-display text-4xl font-black text-white mb-1">
            {user?.rewardPoints || 0}
          </div>
          <div className="text-slate-400 font-medium">Reward Points</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`glass-card p-6 border relative overflow-hidden ${
            loading ? 'border-slate-700 bg-white/5' :
            eligibility?.eligible ? 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent' : 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent'
          }`}
        >
          {loading ? (
            <div className="space-y-4">
              <div className="skeleton h-12 w-12 rounded-xl" />
              <div className="skeleton h-8 w-24" />
              <div className="skeleton h-4 w-32" />
            </div>
          ) : eligibility?.eligible ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 mb-4">
                <ShieldCheck size={24} />
              </div>
              <div className="font-display text-2xl font-black text-green-400 mb-2">Eligible to Donate</div>
              <p className="text-slate-400 text-sm">You are fully eligible to respond to live requests and save lives.</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                <AlertTriangle size={24} />
              </div>
              <div className="font-display text-xl font-bold text-orange-400 mb-2">Cool-down Period</div>
              <div className="text-slate-400 text-sm space-y-1">
                {eligibility?.reasons?.map((reason: string, idx: number) => (
                  <p key={idx} className="flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">•</span> {reason}
                  </p>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Donation History List */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Calendar className="text-red-500" /> Donation History
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 flex gap-4 h-32 skeleton" />
            ))}
          </div>
        ) : donations.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {donations.map((donation: any, idx: number) => (
                <motion.div
                  key={donation._id || idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-white/5 transition-colors border border-white/5 hover:border-red-500/30"
                >
                  <div className="flex items-center gap-5">
                    <div className="blood-badge flex-shrink-0 text-lg w-14 h-14">{donation.bloodGroup || user?.bloodGroup || 'O+'}</div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{donation.hospitalName || 'Emergency Patient'}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} className="text-red-400" />
                          {format(new Date(donation.createdAt || Date.now()), 'MMM dd, yyyy - p')}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-blue-400" />
                          {donation.location?.address || 'LifeLink Verified Network'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold flex items-center gap-2 mr-2">
                      <ShieldCheck size={16} /> Completed
                    </div>
                    <button
                      onClick={() => downloadCertificate(donation)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold hover:from-red-500 hover:to-red-400 transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
                    >
                      <Download size={18} /> Certificate
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 text-center border-dashed border-2 border-white/10"
          >
            <div className="w-20 h-20 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-6">
              <Droplets size={40} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Donations Yet</h3>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              Your donation history is empty. Every drop counts. Ready to step up and save a life today?
            </p>
            <Link href="/dashboard/map" className="inline-flex items-center gap-2 btn-emergency px-8">
              Find Nearby Requests <ArrowRight size={18} />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
