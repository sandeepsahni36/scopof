import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Plugin,
} from 'chart.js';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart as PieIcon,
  Search,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../store/authStore';
import { TIER_LIMITS } from '../../types';
import { Button } from '../../components/ui/Button';
import { checkPropertyLimit } from '../../lib/properties';
import { supabase, devModeEnabled } from '../../lib/supabase';

import {
  getStorageUsage,
  getUsagePercentage,
  formatBytes,
  type StorageUsage,
} from '../../lib/storage';

// --- ChartJS setup
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Subtle canvas shadow & rounded caps on donut segments
 * (for the soft, elevated look in your mockups)
 */
const donutShadowPlugin: Plugin<'doughnut'> = {
  id: 'donutShadow',
  beforeDatasetDraw(chart, args) {
    const { ctx } = chart;
    ctx.save();
    ctx.shadowColor = 'rgba(18,20,23,.12)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.shadowOffsetX = 0;
  },
  afterDatasetDraw(chart) {
    chart.ctx.restore();
  },
};

ChartJS.register(donutShadowPlugin);

const DashboardPage = () => {
  const {
    company,
    isTrialExpired,
    requiresPayment,
  } = useAuthStore();

  const navigate = useNavigate();

  // Stats
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    pendingInspections: 0,
    issuesDetected: 0,
    averageInspectionDuration: 0,
  });

  // Storage
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  // Charts scaffold
  const [chartData, setChartData] = useState({
    inspectionsByType: {
      check_in: 0,
      check_out: 0,
      move_in: 0,
      move_out: 0,
    },
    propertiesByType: {} as Record<string, number>,
    topPropertiesByInspections: [] as Array<{ name: string; count: number }>,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // --- storage (for donut + warnings)
        const u = await getStorageUsage().catch(() => null);
        if (u) setUsage(u);

        // --- properties count (tier)
        const propertyLimits = await checkPropertyLimit();
        const propertyCount = propertyLimits?.currentCount || 0;

        let completedInspections = 0;
        let pendingInspections = 0;
        let issuesDetected = 0;

        let inspectionsByType = {
          check_in: 0,
          check_out: 0,
          move_in: 0,
          move_out: 0,
        };
        const propertiesByType: Record<string, number> = {};
        let averageInspectionDuration = 0;
        let topPropertiesByInspections: Array<{ name: string; count: number }> = [];

        if (!devModeEnabled()) {
          const [completedRes, pendingRes, issuesRes, typesRes] = await Promise.all([
            supabase.from('inspections').select('id', { count: 'exact' }).eq('status', 'completed'),
            supabase.from('inspections').select('id', { count: 'exact' }).eq('status', 'in_progress'),
            supabase.from('inspection_items').select('id', { count: 'exact' }).eq('marked_for_report', true),
            supabase.from('inspections').select('inspection_type').eq('status', 'completed'),
          ]);

          completedInspections = completedRes.count || 0;
          pendingInspections = pendingRes.count || 0;
          issuesDetected = issuesRes.count || 0;

          typesRes.data?.forEach((r: any) => {
            const t = r.inspection_type as keyof typeof inspectionsByType;
            if (t && t in inspectionsByType) inspectionsByType[t]++;
          });

          // Properties by type
          const { data: props } = await supabase.from('properties').select('type');
          props?.forEach((p: any) => {
            const t = p.type;
            if (t) propertiesByType[t] = (propertiesByType[t] || 0) + 1;
          });

          // Avg duration
          const { data: durs } = await supabase
            .from('inspections')
            .select('duration_seconds')
            .eq('status', 'completed')
            .not('duration_seconds', 'is', null);

          if (durs?.length) {
            const total = durs.reduce((s, i) => s + (i.duration_seconds || 0), 0);
            averageInspectionDuration = Math.round(total / durs.length / 60);
          }

          // Top properties (keep logic even if not rendered right now)
          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: top } = await supabase
            .from('inspections')
            .select(`
              property_id,
              properties ( name )
            `)
            .eq('status', 'completed')
            .gte('created_at', since);

          if (top) {
            const map: Record<string, number> = {};
            top.forEach((i: any) => {
              const n = i.properties?.name || 'Unknown Property';
              map[n] = (map[n] || 0) + 1;
            });
            topPropertiesByInspections = Object.entries(map)
              .map(([name, count]) => ({ name, count: count as number }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
          }
        } else {
          // dev fallback
          completedInspections = 8;
          pendingInspections = 3;
          issuesDetected = 0;
          inspectionsByType = { check_in: 4, check_out: 4, move_in: 0, move_out: 0 };
          propertiesByType.apartment = 2;
        }

        setStats({
          properties: propertyCount,
          completedInspections,
          pendingInspections,
          issuesDetected,
          averageInspectionDuration,
        });

        setChartData({
          inspectionsByType,
          propertiesByType,
          topPropertiesByInspections,
        });
      } catch (e) {
        console.error('Dashboard load error', e);
        setStats({
          properties: 0,
          completedInspections: 0,
          pendingInspections: 0,
          issuesDetected: 0,
          averageInspectionDuration: 0,
        });
        setChartData({
          inspectionsByType: { check_in: 0, check_out: 0, move_in: 0, move_out: 0 },
          propertiesByType: {},
          topPropertiesByInspections: [],
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Derived
  const tierLimits = TIER_LIMITS[company?.tier || 'starter'];
  const totalInspections = stats.completedInspections + stats.pendingInspections;

  const trialDaysRemaining = company?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(company.trialEndsAt).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const handleUpgradeClick = () => {
    if (requiresPayment) navigate('/subscription-required');
    else navigate('/dashboard/admin/subscription');
  };

  const hasPropsData = Object.keys(chartData.propertiesByType).length > 0;
  const propTotal = Object.values(chartData.propertiesByType).reduce((a, b) => a + b, 0);

  // --- Donut: Property Portfolio
  const palette = ['#2f66ff', '#5f86ff', '#8aa5ff', '#cfd8ff', '#a6b4ff', '#dfe4f8'];
  const propertyPortfolioData = useMemo(() => {
    const labels = Object.keys(chartData.propertiesByType).map(
      (t) => t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')
    );
    const values = Object.values(chartData.propertiesByType);
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
          // Rounded ends for neat look (ChartJS 4 supports this)
          borderRadius: 8,
          spacing: 4,
        },
      ],
    };
  }, [chartData.propertiesByType]);

  // --- Donut: Storage (used vs free)
  const storageDonutData = useMemo(() => {
    if (!usage) return null;
    const used = usage.currentUsage;
    const free = Math.max(usage.quota - usage.currentUsage, 0);
    return {
      labels: ['Used', 'Free'],
      datasets: [
        {
          data: [used, free],
          backgroundColor: ['#2f66ff', '#e8edff'],
          borderWidth: 0,
          borderRadius: 8,
          spacing: 4,
          label: 'Storage',
        },
      ],
    };
  }, [usage]);

  const donutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || '';
            const value = ctx.parsed;
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total ? ((value / total) * 100).toFixed(1) : '0.0';
            // Storage tooltip uses bytes
            if (ctx.dataset.label === 'Storage' && usage) {
              const pctStorage = ((value / usage.quota) * 100).toFixed(1);
              return `${label}: ${formatBytes(value)} (${pctStorage}%)`;
            }
            return `${label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  const usagePct = usage ? getUsagePercentage(usage.currentUsage, usage.quota) : 0;
  const nearLimit = usagePct >= 80 && usagePct < 100;
  const overLimit = usagePct >= 100;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header + Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">Overview of your property inspections and activities</p>
        </div>
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Trial */}
      {!isTrialExpired && company?.subscription_status === 'trialing' && (
        <div className="mb-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-primary-900">Free Trial Active</h3>
                <p className="text-primary-700">
                  {trialDaysRemaining} days remaining • Ends{' '}
                  {company?.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : 'soon'}
                </p>
              </div>
            </div>
            <Button onClick={handleUpgradeClick} className="bg-primary-600 hover:bg-primary-700">
              Upgrade Now
            </Button>
          </div>
        </div>
      )}

      {/* Storage warning */}
      {usage && (nearLimit || overLimit) && (
        <div className={`mb-6 rounded-lg border p-4 ${overLimit ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 ${overLimit ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${overLimit ? 'text-red-800' : 'text-amber-800'}`}>
                {overLimit ? 'Storage Limit Exceeded' : 'Storage Nearly Full'}
              </p>
              <p className={`mt-1 text-sm ${overLimit ? 'text-red-700' : 'text-amber-700'}`}>
                {overLimit ? 'Upgrade your plan to continue uploading files.' : 'Consider upgrading to avoid interruptions.'}
              </p>
            </div>
            <Button size="sm" onClick={handleUpgradeClick}>Upgrade Plan</Button>
          </div>
        </div>
      )}

      {/* Usage Statistics — 4 SQUARE tiles */}
      <div className="border-b border-gray-200 pb-8 mb-10">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>

        {/* 2-up on mobile, 4-up on lg; aspect-square makes them perfect squares */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Properties */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 aspect-square flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary-50">
                <Building2 className="h-6 w-6 text-primary-600" />
              </div>
              <div className="text-sm text-gray-600">Properties</div>
            </div>
            <div>
              <div className="text-[28px] leading-tight font-semibold text-gray-900">
                {stats.properties} / {tierLimits.properties === Infinity ? '∞' : tierLimits.properties}
              </div>
              <Link to="/dashboard/properties" className="text-sm text-primary-600 hover:text-primary-500">
                {stats.properties === 0 ? 'Add your first property' : 'View all properties'}
              </Link>
            </div>
          </motion.div>

          {/* Completed */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 aspect-square flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-50">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-[28px] leading-tight font-semibold text-gray-900">{stats.completedInspections}</div>
              <Link to="/dashboard/reports" className="text-sm text-primary-600 hover:text-primary-500">
                {stats.completedInspections === 0 ? 'Start your first inspection' : 'View all reports'}
              </Link>
            </div>
          </motion.div>

          {/* Flagged */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 aspect-square flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="text-sm text-gray-600">Flagged Items</div>
            </div>
            <div>
              <div className="text-[28px] leading-tight font-semibold text-gray-900">{stats.issuesDetected}</div>
              <div className="text-sm text-gray-500">{stats.issuesDetected === 0 ? 'No issues detected' : 'Require attention'}</div>
            </div>
          </motion.div>

          {/* Inspections (total) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 aspect-square flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-50">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="text-sm text-gray-600">Inspections</div>
            </div>
            <div>
              <div className="text-[28px] leading-tight font-semibold text-gray-900">{totalInspections}</div>
              <div className="text-sm text-gray-500">{stats.pendingInspections} in progress</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Empty-state CTAs (as requested) */}
      {stats.properties === 0 && (
        <div className="mb-6 rounded-lg border border-primary-100 bg-primary-50 p-4">
          <p className="text-sm text-primary-800">
            Get started by creating your first property and setting up inspection templates.
          </p>
          <div className="mt-3">
            <Link to="/dashboard/properties">
              <Button size="sm">Add Your First Property</Button>
            </Link>
          </div>
        </div>
      )}
      {stats.completedInspections === 0 && stats.properties > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-700">
            Create a new property and set up its inspection templates.
          </p>
          <div className="mt-3 flex gap-3">
            <Link to="/dashboard/templates">
              <Button size="sm" variant="outline">Create Template</Button>
            </Link>
            <Link to="/dashboard/properties">
              <Button size="sm">Add Property</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Analytics — two donuts only */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Storage Donut */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Storage</h3>
            <div className="relative h-56">
              {usage && storageDonutData ? (
                <>
                  <Doughnut data={storageDonutData} options={donutOptions} />
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="relative">
                      <span className="text-2xl font-semibold text-gray-900">{getUsagePercentage(usage.currentUsage, usage.quota)}%</span>
                      {/* soft glow */}
                      <span className="absolute inset-0 blur-md opacity-25 rounded-full" />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatBytes(usage.currentUsage)} / {formatBytes(usage.quota)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  <PieIcon className="h-10 w-10 mr-2" />
                  No storage data
                </div>
              )}
            </div>
          </div>

          {/* Property Portfolio Donut with badge */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Property Portfolio ({stats.properties} total)
            </h3>
            <div className="relative h-56">
              {hasPropsData && propTotal > 0 ? (
                <>
                  <Doughnut data={propertyPortfolioData} options={donutOptions} />
                  {/* Center: total label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-xs text-gray-500 -mb-1">Total</div>
                    <div className="text-2xl font-semibold text-gray-900">{stats.properties}</div>
                  </div>
                  {/* “badge” on the right side of ring */}
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <div className="h-10 w-10 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg">
                      <span className="text-base font-semibold">{stats.properties}</span>
                    </div>
                  </div>
                  {/* compact legend along bottom */}
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
                    {propertyPortfolioData.labels.map((label, i) => (
                      <div key={label} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: palette[i % palette.length] }}
                        />
                        <span className="truncate">{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  <PieIcon className="h-10 w-10 mr-2" />
                  No properties yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
