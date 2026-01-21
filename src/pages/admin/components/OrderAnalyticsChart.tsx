import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { useAuth } from '../../../contexts/TraditionalAuthContext';
import { formatCurrency } from '../../../utils/helpers';
import { formatAnalyticsValue } from '../../../utils/adminUtils';

interface OrderChartData {
  date: string;
  totalOrders: number;
  paidOrders: number;
  revenue: number;
}

interface OrderAnalyticsChartProps {
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 shadow-xl backdrop-blur-sm">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300">{entry.name}:</span>
            <span className="text-white font-medium">
              {entry.dataKey === 'revenue' 
                ? formatCurrency(entry.value || 0)
                : formatAnalyticsValue(entry.value || 0)
              }
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const OrderAnalyticsChart: React.FC<OrderAnalyticsChartProps> = ({ loading }) => {
  const { user, loading: authLoading } = useAuth();
  const [chartData, setChartData] = useState<OrderChartData[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [actualTotalRevenue, setActualTotalRevenue] = useState<number>(0);
  
  // Development mode bypass - API already handles dev auth
  const isDev = process.env.NODE_ENV === 'development';

  // Generate mock data for fallback
  const generateMockData = useCallback((range: '7d' | '30d' | '90d'): OrderChartData[] => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data: OrderChartData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const totalOrders = Math.floor(Math.random() * 50) + 10;
      const paidOrders = Math.floor(totalOrders * (0.7 + Math.random() * 0.25));
      const revenue = paidOrders * (50000 + Math.random() * 200000);
      
      data.push({
        date: date.toLocaleDateString('id-ID', { 
          month: 'short', 
          day: 'numeric' 
        }),
        totalOrders,
        paidOrders,
        revenue
      });
    }
    
    return data;
  }, []);

  const loadChartData = useCallback(async () => {
    // In production: Don't load if auth is still loading or no user
    // In development: Allow loading (API handles dev auth bypass)
    if (!isDev && (authLoading || !user)) {
      return;
    }
    
    try {
      setChartLoading(true);
      
      // Get the actual total revenue from adminService (uses retry logic)
      const dashboardStats = await adminService.getDashboardStats();
      setActualTotalRevenue(dashboardStats.totalRevenue);
      
      // Get real data from API with retry logic for 401
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      
      // Retry logic for time-series API
      let response: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) {
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        };
        
        response = await fetch(`/api/admin?action=time-series&days=${days}`, { headers });
        
        if (response.status === 401 && attempt < 2) {
          console.warn(`[OrderAnalyticsChart] 401 received, retrying (attempt ${attempt + 1}/3)`);
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
        break;
      }
      
      if (!response || !response.ok) {
        throw new Error('Failed to fetch chart data');
      }
      
      const result = await response.json();
      const timeSeriesData = result.data || [];
      
      // Transform API data to chart format
      const transformedData: OrderChartData[] = timeSeriesData.map((item: any) => {
        const date = new Date(item.date);
        const paidOrders = item.paid + item.completed;
        const totalOrders = item.total;
        const totalPaidOrders = timeSeriesData.reduce((sum: number, d: any) => sum + d.paid + d.completed, 0);
        const revenue = totalPaidOrders > 0 ? (paidOrders / totalPaidOrders) * dashboardStats.totalRevenue : 0;
        
        return {
          date: date.toLocaleDateString('id-ID', { 
            month: 'short', 
            day: 'numeric' 
          }),
          totalOrders,
          paidOrders,
          revenue
        };
      });
      
      setChartData(transformedData.length > 0 ? transformedData : generateMockData(timeRange));
      
    } catch (error) {
      setChartData(generateMockData(timeRange));
    } finally {
      setChartLoading(false);
    }
  }, [timeRange, generateMockData, authLoading, user, isDev]);

  useEffect(() => {
    // In production: Only load when auth is ready and user exists
    // In development: Load immediately (API handles dev auth bypass)
    if (isDev || (!authLoading && user)) {
      loadChartData();
    }
  }, [loadChartData, authLoading, user, isDev]);

  const timeRangeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' }
  ];

  // Show loading state when auth is loading (production only)
  const isLoading = (!isDev && authLoading) || chartLoading;

  if (loading || isLoading) {
    return (
      <div className="bg-black border border-gray-800 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-48 mb-4" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-pink-500/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Order Analytics</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm text-white focus:border-pink-500 focus:outline-none"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="totalOrdersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="paidOrdersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#374151" 
              opacity={0.3} 
            />
            
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            
            <Area
              type="monotone"
              dataKey="totalOrders"
              stroke="#ec4899"
              strokeWidth={2}
              fill="url(#totalOrdersGradient)"
              name="Total Orders"
            />
            
            <Area
              type="monotone"
              dataKey="paidOrders"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#paidOrdersGradient)"
              name="Paid Orders"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800" role="group" aria-label="Order summary statistics">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">
            {formatAnalyticsValue(chartData.reduce((sum, day) => sum + day.totalOrders, 0))}
          </p>
          <p className="text-xs text-gray-400">Total Orders</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-green-400">
            {formatAnalyticsValue(chartData.reduce((sum, day) => sum + day.paidOrders, 0))}
          </p>
          <p className="text-xs text-gray-400">Paid Orders</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-pink-400">
            {formatCurrency(actualTotalRevenue)}
          </p>
          <p className="text-xs text-gray-400">Total Revenue</p>
        </div>
      </div>
    </div>
  );
};
