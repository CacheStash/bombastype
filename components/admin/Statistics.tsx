import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { Download, ChevronLeft, ChevronRight, Filter, Calendar, Users } from 'lucide-react';

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

const COLORS = ['#000000', '#FF5C00', '#FFD600', '#00E0FF', '#7000FF', '#00FF47'];

const Statistics: React.FC = () => {
  const [salesData, setSalesData] = useState<OrderData[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [subPage, setSubPage] = useState(1);
  const [subCount, setSubCount] = useState(0);
  const itemsPerPage = 10;

  // Filters State
  const [dateRange, setDateRange] = useState('monthly'); // weekly, monthly, yearly, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [fontFilter, setFontFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchSalesData();
    fetchSubscribers();
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

  // --- DATA PROCESSING (FIXED TYPES) ---
  const stats: StatsResult = useMemo(() => {
    const initialAccumulator = {
      revenueOverTime: {} as Record<string, number>,
      salesPerFont: {} as Record<string, number>,
      usageDist: {} as Record<string, number>,
      totalRevenue: 0
    };

    const processed = salesData.reduce((acc, curr) => {
      const date = new Date(curr.download_date).toLocaleDateString();
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
    a.download = `SUBSCRIBERS_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-10 font-mono uppercase">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-black pb-6">
        <div>
          <h2 className="text-4xl font-black italic">ANALYTICS_CORE</h2>
          <p className="text-xs font-bold text-gray-400 mt-1">Total Revenue: <span className="text-black">${stats.totalRevenue}</span></p>
        </div>
        
        <div className="flex flex-wrap gap-4">

            {/* Date Range Selector */}
          <div className="flex gap-2">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)} 
              className="border-2 border-black p-2 text-[10px] font-black outline-none bg-white"
            >
              <option value="weekly">LAST_7_DAYS</option>
              <option value="monthly">LAST_30_DAYS</option>
              <option value="yearly">LAST_YEAR</option>
              <option value="custom">CUSTOM_RANGE</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="border-2 border-black p-1 text-[10px] font-black outline-none"
                />
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="border-2 border-black p-1 text-[10px] font-black outline-none"
                />
              </div>
            )}
          </div>

          <select value={fontFilter} onChange={(e) => setFontFilter(e.target.value)} className="border-2 border-black p-2 text-[10px] font-black outline-none bg-white">
            <option value="all">ALL_FONTS</option>
            {Array.from(new Set(salesData.map(d => d.font_name))).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border-2 border-black p-2 text-[10px] font-black outline-none bg-white">
            <option value="all">ALL_TYPES</option>
            <option value="full">FULL_LICENSE</option>
            <option value="trial">DEMO_TRIAL</option>
          </select>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border-2 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black mb-6 flex items-center gap-2"><Calendar size={14}/> REVENUE_STREAM</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" hide />
                <YAxis fontSize={10} fontStyle="bold" />
                <Tooltip contentStyle={{ borderRadius: '0', border: '2px solid black' }} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#000" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#fff', stroke: '#000', strokeWidth: 2 }} 
                  activeDot={{ r: 6, fill: '#FF5C00', stroke: '#000', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border-2 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black mb-6 flex items-center gap-2"><Filter size={14}/> USAGE_DYNAMICS</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {stats.pieData.map((_entry: ChartPoint, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="rect" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SUBSCRIBERS TABLE */}
      <div className="space-y-4 pt-10">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black italic flex items-center gap-3"><Users size={24}/> EMAIL_SUBSCRIBERS</h3>
          <button onClick={exportSubscribersCSV} className="bg-black text-white px-4 py-2 text-[10px] font-black flex items-center gap-2 hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            <Download size={14}/> EXPORT_LIST
          </button>
        </div>
        <div className="border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-black text-[10px] font-black text-gray-400">
                <th className="p-4">EMAIL_ADDRESS</th>
                <th className="p-4">ENTRY_SOURCE</th>
                <th className="p-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold">
              {subscribers.map((s, i) => (
                <tr key={i} className="border-b border-black hover:bg-yellow-50">
                  <td className="p-4 lowercase">{s.email}</td>
                  <td className="p-4 uppercase">{s.source}</td>
                  <td className="p-4"><span className="px-2 py-0.5 border border-black bg-green-400 text-black">{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-center items-center gap-4 pt-4">
          <button onClick={() => setSubPage(p => Math.max(1, p - 1))} className="p-2 border-2 border-black disabled:opacity-20"><ChevronLeft size={16}/></button>
          <span className="text-[10px] font-black">PAGE {subPage} OF {Math.ceil(subCount/itemsPerPage)}</span>
          <button onClick={() => setSubPage(p => p + 1)} disabled={subPage >= Math.ceil(subCount/itemsPerPage)} className="p-2 border-2 border-black disabled:opacity-20"><ChevronRight size={16}/></button>
        </div>
      </div>
    </div>
  );
};

export default Statistics;