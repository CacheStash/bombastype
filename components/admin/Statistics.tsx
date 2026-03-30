/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { Download, ChevronLeft, ChevronRight, Filter, Calendar, Users, TrendingUp } from 'lucide-react';

// --- TYPES & INTERFACES ---
interface OrderData {
  id: string;
  transaction_id: string;
  download_type: 'trial' | 'full';
  download_date: string;
  font_name: string;
  buyer_email: string;
  usages: string[];
  metadata: {
    price_at_purchase?: number;
  };
}

interface SubscriberData {
  email: string;
  source: string;
  status: string;
  created_at: string;
}

interface ChartPoint {
  date?: string;
  name?: string;
  amount?: number;
  count?: number;
  value?: number;
}

interface StatsResult {
  lineData: ChartPoint[];
  barData: ChartPoint[];
  pieData: ChartPoint[];
  totalRevenue: number;
}

// Vintage Palette for Charts
const COLORS = ['#2c241a', '#8b6b4a', '#4a3c2c', '#c2b280', '#5c4d3c', '#a69076'];

const Statistics: React.FC = () => {
  const [salesData, setSalesData] = useState<OrderData[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [subPage, setSubPage] = useState(1);
  const [subCount, setSubCount] = useState(0);
  const itemsPerPage = 10;

  // Filters State
  const [dateRange, setDateRange] = useState('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [fontFilter, setFontFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchSalesData();
  }, [dateRange, customStart, customEnd, fontFilter, typeFilter]);

  useEffect(() => {
    fetchSubscribers();
  }, [subPage]);

  const fetchSalesData = async () => {
    setLoading(true);
    let query = supabase.from('admin_order_view').select('*');

    if (dateRange !== 'custom') {
      const now = new Date();
      let startDate = new Date();
      
      if (dateRange === 'weekly') startDate.setDate(now.getDate() - 7);
      else if (dateRange === 'monthly') startDate.setMonth(now.getMonth() - 1);
      else if (dateRange === 'yearly') startDate.setFullYear(now.getFullYear() - 1);
      
      query = query.gte('download_date', startDate.toISOString());
    } else if (customStart && customEnd) {
      query = query.gte('download_date', new Date(customStart).toISOString())
                   .lte('download_date', new Date(customEnd).toISOString());
    }

    if (fontFilter !== 'all') query = query.eq('font_name', fontFilter);
    if (typeFilter !== 'all') query = query.eq('download_type', typeFilter);

    const { data } = await query.order('download_date', { ascending: true });
    if (data) setSalesData(data as OrderData[]);
    setLoading(false);
  };

  const fetchSubscribers = async () => {
    const from = (subPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    const { data, count } = await supabase
      .from('fontsubscribers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (data) {
      setSubscribers(data as SubscriberData[]);
      setSubCount(count || 0);
    }
  };

  const stats: StatsResult = useMemo(() => {
    const initialAccumulator = {
      revenueOverTime: {} as Record<string, number>,
      salesPerFont: {} as Record<string, number>,
      usageDist: {} as Record<string, number>,
      totalRevenue: 0
    };

    const processed = salesData.reduce((acc, curr) => {
      const date = new Date(curr.download_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const price = curr.metadata?.price_at_purchase || 0;
      
      acc.revenueOverTime[date] = (acc.revenueOverTime[date] || 0) + price;
      acc.salesPerFont[curr.font_name] = (acc.salesPerFont[curr.font_name] || 0) + 1;
      
      curr.usages?.forEach((u: string) => {
        acc.usageDist[u] = (acc.usageDist[u] || 0) + 1;
      });

      acc.totalRevenue += price;
      return acc;
    }, initialAccumulator);

    const lineData: ChartPoint[] = Object.keys(processed.revenueOverTime).map(date => ({ 
      date, 
      amount: processed.revenueOverTime[date] 
    }));
    
    const barData: ChartPoint[] = Object.keys(processed.salesPerFont).map(name => ({ 
      name, 
      count: processed.salesPerFont[name] 
    }));
    
    const pieData: ChartPoint[] = Object.keys(processed.usageDist).map(name => ({ 
      name, 
      value: processed.usageDist[name] 
    }));

    return { lineData, barData, pieData, totalRevenue: processed.totalRevenue };
  }, [salesData]);

  const exportSubscribersCSV = () => {
    const headers = ['Email', 'Source', 'Status', 'Date'];
    const csv = [
      headers.join(','), 
      ...subscribers.map(s => [s.email, s.source, s.status, s.created_at].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARCHIVE_SUBSCRIBERS_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-12 pb-20">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-vintage-ink pb-8">
        <div className="space-y-1">
          <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Archive Insight</h2>
          <div className="flex items-center gap-2 text-vintage-accent">
            <TrendingUp size={16} />
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase">
              Valuation: <span className="text-vintage-ink">${stats.totalRevenue.toLocaleString()}</span>
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 border border-vintage-ink p-1 bg-vintage-paper/50">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)} 
              className="bg-transparent text-[10px] font-bold p-2 outline-none uppercase tracking-wider"
            >
              <option value="weekly">7 Days</option>
              <option value="monthly">30 Days</option>
              <option value="yearly">1 Year</option>
              <option value="custom">Custom</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex gap-1 border-l border-vintage-ink/20 pl-1">
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-[9px] p-1 outline-none"
                />
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-[9px] p-1 outline-none"
                />
              </div>
            )}
          </div>

          <select value={fontFilter} onChange={(e) => setFontFilter(e.target.value)} className="border border-vintage-ink p-2 text-[10px] font-bold outline-none bg-transparent uppercase tracking-wider">
            <option value="all">All Fonts</option>
            {Array.from(new Set(salesData.map(d => d.font_name))).map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-vintage-ink p-2 text-[10px] font-bold outline-none bg-transparent uppercase tracking-wider">
            <option value="all">All Access</option>
            <option value="full">Full Archive</option>
            <option value="trial">Demo/Trial</option>
          </select>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="vintage-card bg-white/40">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 flex items-center gap-3 text-vintage-accent">
            <Calendar size={14}/> Revenue Provenance
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.lineData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e8e2d0" />
                <XAxis dataKey="date" fontSize={9} fontStyle="italic" axisLine={false} tickLine={false} />
                <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fdf6e3', border: '1px solid #2c241a', borderRadius: '0', fontSize: '10px' }}
                  itemStyle={{ color: '#2c241a', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#2c241a" 
                  strokeWidth={2} 
                  dot={{ r: 3, fill: '#fdf6e3', stroke: '#2c241a', strokeWidth: 1 }} 
                  activeDot={{ r: 5, fill: '#8b6b4a', stroke: '#2c241a', strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="vintage-card bg-white/40">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8 flex items-center gap-3 text-vintage-accent">
            <Filter size={14}/> License Distribution
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.pieData} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                  {stats.pieData.map((_entry: ChartPoint, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#fdf6e3', border: '1px solid #2c241a', borderRadius: '0', fontSize: '10px' }}
                />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SUBSCRIBERS SECTION */}
      <div className="space-y-8 pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-3xl font-script capitalize flex items-center gap-4">
            <Users size={24} className="text-vintage-accent"/> Correspondence List
          </h3>
          <button onClick={exportSubscribersCSV} className="vintage-btn text-[9px] px-6 flex items-center gap-3">
            <Download size={14}/> Export Archive
          </button>
        </div>

        <div className="overflow-x-auto border border-vintage-ink">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-vintage-ink/5 border-b border-vintage-ink text-[10px] font-bold text-vintage-ink/60 uppercase tracking-widest">
                <th className="p-5">Subscriber Identity</th>
                <th className="p-5 text-center">Provenance</th>
                <th className="p-5 text-right">Registry Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-serif">
              {subscribers.map((s, i) => (
                <tr key={i} className="border-b border-vintage-ink/10 hover:bg-vintage-ink/2 transition-colors">
                  <td className="p-5 text-vintage-ink font-bold">{s.email}</td>
                  <td className="p-5 text-center italic opacity-60">{s.source}</td>
                  <td className="p-5 text-right">
                    <span className="text-[9px] uppercase tracking-widest font-bold px-3 py-1 border border-vintage-ink/20 text-vintage-accent">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* PAGINATION */}
        <div className="flex justify-center items-center gap-6 pt-6">
          <button 
            onClick={() => setSubPage(p => Math.max(1, p - 1))} 
            disabled={subPage === 1}
            className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={16}/>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-vintage-ink/60">
            Folio {subPage} <span className="mx-2">/</span> {Math.ceil(subCount/itemsPerPage)}
          </span>
          <button 
            onClick={() => setSubPage(p => p + 1)} 
            disabled={subPage >= Math.ceil(subCount/itemsPerPage)} 
            className="p-2 border border-vintage-ink hover:bg-vintage-ink hover:text-vintage-paper disabled:opacity-20 transition-all"
          >
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Statistics;