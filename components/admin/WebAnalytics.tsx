import React, { useState, useEffect } from 'react';
import { Globe, Users, Activity, HardDrive, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AnalyticsData {
  summary: {
    totalRequests: number;
    totalPageViews: number;
    uniqueVisitors: number;
    totalBytes: string;
  };
  dailyTrend: Array<{
    date: string;
    requests: number;
    uniques: number;
    pageViews: number;
  }>;
  topCountries: Array<{
    country: string;
    requests: number;
  }>;
  workerStats: {
    totalInvocations: number;
    errors: number;
  };
}

const WebAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30'>('7');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
      }

      const res = await fetch(`/api/admin/analytics?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}));
        throw new Error(errJson?.message || errJson?.error || `HTTP Error ${res.status}`);
      }

      const raw: any = await res.json();

      if (raw?.errors && raw.errors.length > 0) {
        throw new Error(raw.errors[0]?.message || 'GraphQL Error');
      }

      const zoneData = raw?.data?.viewer?.zones?.[0];
      const http1d = zoneData?.httpRequests1dGroups || [];
      const workerInv = raw?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];

      let totalReq = 0;
      let totalBytesRaw = 0;
      let totalViews = 0;
      let totalUniques = 0;
      const countryTotals: Record<string, number> = {};

      const trend = http1d.map((g: any) => {
        const req = g.sum?.requests || 0;
        const b = g.sum?.bytes || 0;
        const pv = g.sum?.pageViews || 0;
        const u = g.uniq?.uniques || 0;

        const cMap = g.sum?.countryMap || [];
        cMap.forEach((item: any) => {
          const cName = item.clientCountryName || 'Unknown';
          countryTotals[cName] = (countryTotals[cName] || 0) + (item.requests || 0);
        });

        totalReq += req;
        totalBytesRaw += b;
        totalViews += pv;
        totalUniques += u;

        return {
          date: g.dimensions?.date || '',
          requests: req,
          uniques: u,
          pageViews: pv
        };
      });

      const topCountries = Object.entries(countryTotals)
        .map(([country, requests]) => ({ country, requests }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      let workerTotal = 0;
      let workerErrors = 0;
      workerInv.forEach((w: any) => {
        workerTotal += w.sum?.requests || 0;
        workerErrors += w.sum?.errors || 0;
      });

      const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      setData({
        summary: {
          totalRequests: totalReq,
          totalPageViews: totalViews,
          uniqueVisitors: totalUniques,
          totalBytes: formatBytes(totalBytesRaw)
        },
        dailyTrend: trend,
        topCountries,
        workerStats: {
          totalInvocations: workerTotal,
          errors: workerErrors
        }
      });
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data Cloudflare Analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-serif">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-vintage-ink gap-4">
        <div>
          <h2 className="text-3xl font-blackletter tracking-tight">Cloudflare Web Analytics</h2>
          <p className="text-xs text-vintage-ink/60 font-mono mt-1">Domain: bombastype.com &amp; Worker: font.bombastype.workers.dev</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-vintage-ink bg-vintage-paper">
            {(['7', '14', '30'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3.5 py-1.5 text-xs font-bold font-mono transition-colors ${
                  timeRange === range ? 'bg-vintage-ink text-vintage-paper' : 'hover:bg-vintage-ink/10 text-vintage-ink'
                }`}
              >
                {range}D
              </button>
            ))}
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold border border-vintage-ink bg-vintage-paper hover:bg-vintage-ink hover:text-vintage-paper transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>SYNC DATA</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-red-700 bg-red-50/50 flex items-start gap-3 text-red-900 text-sm">
          <AlertCircle size={20} className="text-red-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold tracking-wider text-xs text-red-800 mb-1">API CONNECTION FAILED</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 border border-vintage-ink bg-vintage-paper/80 shadow-[3px_3px_0px_0px_rgba(40,30,20,0.15)]">
          <div className="flex items-center justify-between text-vintage-ink/60 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest">Unique Visitors</span>
            <Users size={16} className="text-vintage-ink" />
          </div>
          <div className="text-3xl font-black font-mono">
            {loading ? '...' : (data?.summary.uniqueVisitors.toLocaleString() || '0')}
          </div>
          <div className="text-[10px] text-vintage-ink/50 mt-2 font-mono">Zone bombastype.com</div>
        </div>

        <div className="p-6 border border-vintage-ink bg-vintage-paper/80 shadow-[3px_3px_0px_0px_rgba(40,30,20,0.15)]">
          <div className="flex items-center justify-between text-vintage-ink/60 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest">Total Requests</span>
            <Activity size={16} className="text-vintage-ink" />
          </div>
          <div className="text-3xl font-black font-mono">
            {loading ? '...' : (data?.summary.totalRequests.toLocaleString() || '0')}
          </div>
          <div className="text-[10px] text-vintage-ink/50 mt-2 font-mono">{data?.summary.totalPageViews.toLocaleString() || '0'} Pageviews</div>
        </div>

        <div className="p-6 border border-vintage-ink bg-vintage-paper/80 shadow-[3px_3px_0px_0px_rgba(40,30,20,0.15)]">
          <div className="flex items-center justify-between text-vintage-ink/60 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest">Bandwidth</span>
            <HardDrive size={16} className="text-vintage-ink" />
          </div>
          <div className="text-3xl font-black font-mono">
            {loading ? '...' : (data?.summary.totalBytes || '0 B')}
          </div>
          <div className="text-[10px] text-vintage-ink/50 mt-2 font-mono">Egress Edge Cloudflare</div>
        </div>

        <div className="p-6 border border-vintage-ink bg-vintage-paper/80 shadow-[3px_3px_0px_0px_rgba(40,30,20,0.15)]">
          <div className="flex items-center justify-between text-vintage-ink/60 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest">Worker Invocations</span>
            <Globe size={16} className="text-vintage-ink" />
          </div>
          <div className="text-3xl font-black font-mono">
            {loading ? '...' : (data?.workerStats.totalInvocations.toLocaleString() || '0')}
          </div>
          <div className="text-[10px] text-vintage-ink/50 mt-2 font-mono">{data?.workerStats.errors || 0} Error Executions</div>
        </div>
      </div>

      {/* DETAIL BREAKDOWNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAILY LOG TABLE */}
        <div className="border border-vintage-ink bg-vintage-paper p-6 shadow-[3px_3px_0px_0px_rgba(40,30,20,0.15)]">
          <h3 className="font-bold text-sm tracking-wider uppercase mb-4 pb-2 border-b border-vintage-ink/20">
            Aktivitas Harian
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-vintage-ink text-vintage-ink/60">
                  <th className="pb-2 font-bold">DATE</th>
                  <th className="pb-2 font-bold text-right">UNIQUES</th>
                  <th className="pb-2 font-bold text-right">REQUESTS</th>
                  <th className="pb-2 font-bold text-right">PAGEVIEWS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-ink/10">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-vintage-ink/40">Memuat log edge...</td>
                  </tr>
                ) : data?.dailyTrend.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-vintage-ink/40">Tidak ada data traffic</td>
                  </tr>
                ) : (
                  data?.dailyTrend.map((row, idx) => (
                    <tr key={idx} className="hover:bg-vintage-ink/5 transition-colors">
                      <td className="py-2.5 font-bold">{row.date}</td>
                      <td className="py-2.5 text-right font-medium">{row.uniques.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-medium">{row.requests.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-medium">{row.pageViews.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP COUNTRIES */}
        <div className="border border-vintage-ink bg-vintage-paper p-6 shadow-[3px_3px_0px_0px_rgba(40,30,20,0.15)]">
          <h3 className="font-bold text-sm tracking-wider uppercase mb-4 pb-2 border-b border-vintage-ink/20">
            Top Visitor Berdasarkan Negara
          </h3>
          <div className="space-y-3.5">
            {loading ? (
              <div className="py-6 text-center text-vintage-ink/40 text-xs font-mono">Memuat sebaran negara...</div>
            ) : data?.topCountries.length === 0 ? (
              <div className="py-6 text-center text-vintage-ink/40 text-xs font-mono">Belum ada request tercatat</div>
            ) : (
              data?.topCountries.map((c, idx) => {
                const maxVal = data.topCountries[0]?.requests || 1;
                const pct = Math.round((c.requests / maxVal) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-bold">{c.country}</span>
                      <span className="text-vintage-ink/60">{c.requests.toLocaleString()} req</span>
                    </div>
                    <div className="w-full bg-vintage-ink/10 h-2 border border-vintage-ink/30">
                      <div className="bg-vintage-ink h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebAnalytics;