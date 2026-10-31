'use client';
import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileCode, CheckCircle2 } from 'lucide-react';

export function Footer() {
  const [basePath, setBasePath] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/LifeLink_Web')) {
      setBasePath('/LifeLink_Web');
    }
  }, []);

  const zipUrl = `${basePath}/reports/latest/LifeLink_Web_Test_Reports.zip`;
  const excelUrl = `${basePath}/reports/latest/LifeLink_Web_500_Test_Report.xlsx`;
  const htmlUrl = `${basePath}/reports/latest/execution-report.html`;

  return (
    <footer className="border-t border-white/10 bg-slate-950/80 py-8 px-6 mt-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <div className="flex items-center justify-center md:justify-start gap-2 font-display text-lg font-black text-white">
            <span className="w-6 h-6 rounded-md bg-red-600 flex items-center justify-center text-xs">🩸</span>
            LifeLink Web Application
          </div>
          <p className="text-xs text-slate-400 mt-1">Real-time Emergency Blood Donation Platform</p>
        </div>

        {/* Testing & Reports Section */}
        <div className="glass-card p-4 border-emerald-500/20 bg-emerald-950/10 flex flex-col sm:flex-row items-center gap-4">
          <div className="text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Testing & Reports (500 Tests Passed)
            </div>
            <p className="text-[11px] text-slate-400">100% Pass Rate across 5 Testing Sections</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={zipUrl}
              download="LifeLink_Web_Test_Reports.zip"
              className="text-xs py-2 px-3.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
            >
              <Download size={14} /> Download Test Reports ZIP
            </a>
            <a
              href={htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 font-semibold transition-all flex items-center gap-1"
            >
              <FileCode size={13} /> HTML Report
            </a>
            <a
              href={excelUrl}
              download="LifeLink_Web_500_Test_Report.xlsx"
              className="text-xs py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 font-semibold transition-all flex items-center gap-1"
            >
              <FileSpreadsheet size={13} /> Excel
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
