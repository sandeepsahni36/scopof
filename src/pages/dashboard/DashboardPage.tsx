import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
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
  Plugin
} from 'chart.js';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Search,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { TIER_LIMITS } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { checkPropertyLimit } from '../../lib/properties';
import { supabase, devModeEnabled } from '../../lib/supabase';

// storage helpers (already in your project)
import {
  getStorageUsage,
  getUsagePercentage,
  formatBytes,
  type StorageUsage,
} from '../../lib/storage';

// Register ChartJS components
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
 * Subtle canvas shadow for donut charts (visual “depth” like mockups)
 */
const donutShadowPlugin: Plugin<'doughnut'> = {
  id: 'donutShadow',
  beforeDraw: (chart) => {
    const { ctx, chartArea } = chart;
    if (!ctx || !chartArea) return;
    ctx.save();
    ctx.shadowColor = 'rgba(18,20,23,0.12)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.shadowOffsetX = 0;
  },
  afterDraw: (chart) => {
    const { ctx } = chart;
    if (!ctx) return;
    ctx.restore();
  },
};

ChartJS.register(donutShadowPlugin);

const DashboardPage = () => {
  const {
    company,
    isTrialExpired,
    requiresPayment,
    storageStatus,
    isDevMode,
  } = useAuthStore();

  const navigate = useNavigate();

  // Dashboard data state
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    pendingInspections: 0,
    issuesDetected: 0,
    averageInspectionDuration: 0,
  });

  // Storage usage (for donut + warning)
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  // Chart data state
  const [chartData, setChartData] = useState({
    inspectionsByType: {
      check_in: 0,
      check_out: 0,
      move_in: 0,
      move_out: 0,
    },
    issuesByValue: {
      'Needs Repair': 0,
      'Poor': 0,
      'Damaged': 0,
      'Missing': 0,
    },
    propertiesByType: {} as Record<string, number>,
    topPropertiesByInspections: [] as Array<{ name: string; count: number }>,
  });

  const [loading, setLoading] = useState(true);

  // Load dashboard data + storage
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);

        // Get property count and limits
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
        let issuesByValue = {
          'Needs Repair': 0,
          'Poor': 0,
          'Damaged': 0,
          'Missing': 0,
        };
        let propertiesByType = {} as Record<string, number>;
        let topPropertiesByInspections: Array<{ name: string; count: number }> = [];
        let averageInspectionDuration = 0;

        // Storage usage (for donut + warnings)
        const usageData = await getStorageUsage().catch(() => null);
        if (usageData) setUsage(usageData);

        // Get inspection counts (skip in dev mode)
        if (!devModeEnabled()) {
          const [completedResponse, pendingResponse, issuesResponse, inspectionTypesResponse] = await Promise.all([
            supabase
              .from('inspections')
              .select('id', { count: 'exact' })
              .eq('status', 'completed'),
            supabase
              .from('inspections')
              .select('id', { count: 'exact' })
              .eq('status', 'in_progress'),
            supabase
              .from('inspection_items')
              .select('id', { count: 'exact' })
              .eq('marked_for_report', true),
            supabase
              .from('inspections')
              .select('inspection_type')
              .eq('status', 'completed'),
          ]);

          completedInspections = completedResponse.count || 0;
          pendingInspections = pendingResponse.count || 0;
          issuesDetected = issuesResponse.count || 0;

          if (inspectionTypesResponse.data) {
            inspectionTypesResponse.data.forEach((inspection: any) => {
              const type = inspection.inspection_type;
              if (type && Object.prototype.hasOwnProperty.call(inspectionsByType, type)) {
                inspectionsByType[type as keyof typeof inspectionsByType]++;
              }
            });
          }

          // Issue breakdown
          const { data: issueItems } = await supabase
            .from('inspection_items')
            .select('value')
            .eq('marked_for_report', true)
            .not('value', 'is', null);

          if (issueItems) {
            issueItems.forEach((item: any) => {
              const collect = (v: string) => {
                const val = v.toLowerCase();
                if (val.includes('needs repair') || val.includes('repair')) issuesByValue['Needs Repair']++;
                else if (val.includes('poor') || val.includes('bad')) issuesByValue['Poor']++;
                else if (val.includes('damaged') || val.includes('damage')) issuesByValue['Damaged']++;
                else if (val.includes('missing') || val.includes('absent')) issuesByValue['Missing']++;
              };
              const { value } = item;
              if (typeof value === 'string') collect(value);
              if (Array.isArray(value)) value.forEach((v) => typeof v === 'string' && collect(v));
            });
          }

          // Properties by type
          const { data: propertiesResponse } = await supabase
            .from('properties')
            .select('type');

          if (propertiesResponse) {
            propertiesResponse.forEach((property: any) => {
              const type = property.type;
              if (type) propertiesByType[type] = (propertiesByType[type] || 0) + 1;
            });
          }

          // Avg duration
          const { data: durationData } = await supabase
            .from('inspections')
            .select('duration_seconds')
            .eq('status', 'completed')
            .not('duration_seconds', 'is', null);

          if (durationData && durationData.length > 0) {
            const total = durationData.reduce(
              (sum, inspection) => sum + (inspection.duration_seconds || 0),
              0
            );
            averageInspectionDuration = Math.round(total / durationData.length / 60);
          }

          // Top props (keep logic here even if not currently shown)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: topProps } = await supabase
            .from('inspections')
            .select(`
              property_id,
              properties ( name )
            `)
            .eq('status', 'completed')
            .gte('created_at', thirtyDaysAgo);

          if (topProps) {
            const counts: Record<string, number> = {};
            topProps.forEach((ins: any) => {
              const name = ins.properties?.name || 'Unknown Property';
              counts[name] = (counts[name] || 0) + 1;
            });
            topPropertiesByInspections = Object.entries(counts)
              .map(([name, count]) => ({ name, count: count as number }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
          }
        } else {
          // Dev mode mock (left in place; won’t run if dev mode disabled)
          completedInspections = 8;
          pendingInspections = 3;
          issuesDetected = 5;
          averageInspectionDuration = 42;
          inspectionsByType = { check_in: 4, check_out: 4, move_in: 0, move_out: 0 };
          issuesByValue     = { 'Needs Repair': 2, 'Poor': 1, 'Damaged': 1, 'Missing': 1 };
          propertiesByType  = { apartment: 2, villa: 1, condo: 0 };
          topPropertiesByInspections = [
            { name: 'Oceanview Apartment 2B', count: 3 },
            { name: 'Downtown Loft 5A', count: 2 },
            { name: 'Mountain View Villa', count: 1 },
          ];
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
          issuesByValue,
          propertiesByType,
          topPropertiesByInspections,
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setStats({
          properties: 0,
          completedInspections: 0,
          pendingInspections: 0,
          issuesDetected: 0,
          averageInspectionDuration: 0,
        });
        setChartData({
          inspectionsByType: { check_in: 0, check_out: 0, move_in: 0, move_out: 0 },
          issuesByValue: { 'Needs Repair': 0, 'Poor': 0, 'Damaged': 0, 'Missing': 0 },
          propertiesByType: {},
          topPropertiesByInspections: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // Helpers / derived
  const tierLimits = TIER_LIMITS[company?.tier || 'starter'];

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
    if (requiresPayment) {
      navigate('/subscription-required');
    } else {
      navigate('/dashboard/admin/subscription');
    }
  };

  const hasPropertiesData = Object.keys(chartData.propertiesByType).length > 0;
  const totalPropertiesByType = Object.values(chartData.propertiesByType).reduce((a, b) => a + b, 0);

  const totalInspections = stats.completedInspections + stats.pendingInspections;

  // Donut: Property Portfolio
  const propertyTypeColors = ['#2f66ff', '#5f86ff', '#8aa5ff', '#cfd8ff', '#a6b4ff', '#dfe4f8'];
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
          backgroundColor: labels.map((_, i) => propertyTypeColors[i % propertyTypeColors.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [chartData.propertiesByType]);

  // Donut: Storage (used vs free)
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
        },
      ],
    };
  }, [usage]);

  const donutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || '';
            const value = ctx.parsed;
            if (ctx.dataset.label === 'Storage' && usage) {
              const total = usage.quota;
              const pct = ((value / total) * 100).toFixed(1);
              return `${label}: ${formatBytes(value)} (${pct}%)`;
            }
            // portfolio
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total ? ((value / total) * 100).toFixed(1) : '0.0';
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">Overview of your property inspections and activities</p>
        </div>
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Search…"
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Trial Status Card (kept as requested) */}
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

      {/* Storage near/over limit warning (required) */}
      {usage && (nearLimit || overLimit) && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            overLimit ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 ${overLimit ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${overLimit ? 'text-red-800' : 'text-amber-800'}`}>
                {overLimit ? 'Storage Limit Exceeded' : 'Storage Nearly Full'}
              </p>
              <p className={`mt-1 text-sm ${overLimit ? 'text-red-700' : 'text-amber-700'}`}>
                {overLimit
                  ? 'Upgrade your plan to continue uploading files.'
                  : 'Consider upgrading to avoid interruptions.'}
              </p>
            </div>
            <Button size="sm" onClick={() => navigate('/dashboard/admin/subscription')}>
              Upgrade Plan
            </Button>
          </div>
        </div>
      )}

      {/* Usage Statistics (4 SQUARE cards) */}
      <div className="border-b border-gray-200 pb-8 mb-10">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>

        {/* 2 cols on small, 4 cols on lg; force perfect squares */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Properties */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white shadow rounded-2xl p-4 aspect-square flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary-100">
                <Building2 className="h-6 w-6 text-primary-600" />
              </div>
              <div className="text-sm text-gray-500">Properties</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-gray-900">
                {stats.properties} / {TIER_LIMITS[company?.tier || 'starter'].properties === Infinity ? '∞' : TIER_LIMITS[company?.tier || 'starter'].properties}
              </div>
              <Link to="/dashboard/properties" className="text-sm text-primary-600 hover:text-primary-500">
                {stats.properties === 0 ? 'Add your first property' : 'View all properties'}
              </Link>
            </div>
          </motion.div>

          {/* Completed Inspections */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white shadow rounded-2xl p-4 aspect-square flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-gray-900">{stats.completedInspections}</div>
              <Link to="/dashboard/reports" className="text-sm text-primary-600 hover:text-primary-500">
                {stats.completedInspections === 0 ? 'Start your first inspection' : 'View all reports'}
              </Link>
            </div>
          </motion.div>

          {/* Flagged Items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white shadow rounded-2xl p-4 aspect-square flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="text-sm text-gray-500">Flagged Items</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-gray-900">{stats.issuesDetected}</div>
              <div className="text-sm text-gray-500">
                {stats.issuesDetected === 0 ? 'No issues detected' : 'Require attention'}
              </div>
            </div>
          </motion.div>

          {/* Inspections (total) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white shadow rounded-2xl p-4 aspect-square flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-100">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="text-sm text-gray-500">Inspections</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-gray-900">{totalInspections}</div>
              <div className="text-sm text-gray-500">
                {stats.pendingInspections} in progress
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Empty-state CTAs (required) */}
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

      {/* Analytics: TWO donuts only (Storage + Property Portfolio) */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Storage Donut */}
          <div className="relative bg-white rounded-2xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Storage</h3>
            <div className="relative h-56">
              {usage && storageDonutData ? (
                <>
                  <Doughnut data={storageDonutData} options={{ ...donutOptions, plugins: { ...donutOptions.plugins, tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const label = ctx.label || '';
                        const value = ctx.parsed;
                        const total = usage.quota;
                        const pct = ((value / total) * 100).toFixed(1);
                        return `${label}: ${formatBytes(value)} (${pct}%)`;
                      }
                    }
                  } }}} />
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-2xl font-semibold text-gray-900">{getUsagePercentage(usage.currentUsage, usage.quota)}%</div>
                    <div className="text-xs text-gray-500">
                      {formatBytes(usage.currentUsage)} / {formatBytes(usage.quota)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  <PieChart className="h-10 w-10 mr-2" />
                  No storage data
                </div>
              )}
            </div>
          </div>

          {/* Property Portfolio Donut */}
          <div className="relative bg-white rounded-2xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Property Portfolio ({stats.properties} total)
            </h3>
            <div className="relative h-56">
              {hasPropertiesData && totalPropertiesByType > 0 ? (
                <>
                  <Doughnut data={propertyPortfolioData} options={donutOptions} />
                  {/* Center label: total */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-2xl font-semibold text-gray-900">{stats.properties}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  {/* Legend — compact, bottom */}
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                    {propertyPortfolioData.labels.map((label, i) => (
                      <div key={label} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: propertyTypeColors[i % propertyTypeColors.length] }}
                        />
                        <span className="truncate">{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  <PieChart className="h-10 w-10 mr-2" />
                  No properties yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Removed:
          - Top-right Manage/View buttons
          - Quick Actions section
          - Extra charts (kept logic but not rendered) */}
    </div>
  );
};

export default DashboardPage;
