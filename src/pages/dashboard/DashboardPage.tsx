// src/pages/dashboard/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Search as SearchIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { TIER_LIMITS } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { checkPropertyLimit } from '../../lib/properties';
import { supabase, devModeEnabled } from '../../lib/supabase';
import { getStorageUsage, formatBytes, StorageUsage } from '../../lib/storage';

// Register Chart.js bits we use
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const BRAND = '#2f66ff';
const BRAND_2 = '#5f86ff';
const MUTED_RING = 'rgba(18,20,23,0.08)';

const DashboardPage: React.FC = () => {
  const { company, isTrialExpired, requiresPayment, storageStatus } = useAuthStore();
  const navigate = useNavigate();

  // Stats (server data)
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    pendingInspections: 0,
    issuesDetected: 0,
  });

  // Charts data
  const [chartData, setChartData] = useState({
    inspectionsByType: { check_in: 0, check_out: 0, move_in: 0, move_out: 0 },
    issuesByValue: { 'Needs Repair': 0, 'Poor': 0, 'Damaged': 0, 'Missing': 0 },
    propertiesByType: {} as Record<string, number>,
    topPropertiesByInspections: [] as Array<{ name: string; count: number }>,
  });

  // Storage usage for the Storage pie
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Property limit / count
        const propertyLimits = await checkPropertyLimit();
        const propertyCount = propertyLimits?.currentCount || 0;

        let completedInspections = 0;
        let pendingInspections = 0;
        let issuesDetected = 0;
        let inspectionsByType = { check_in: 0, check_out: 0, move_in: 0, move_out: 0 };
        let issuesByValue = { 'Needs Repair': 0, 'Poor': 0, 'Damaged': 0, 'Missing': 0 };
        let propertiesByType: Record<string, number> = {};
        let topPropertiesByInspections: Array<{ name: string; count: number }> = [];

        if (!devModeEnabled()) {
          const [completedResponse, pendingResponse, issuesResponse, inspectionTypesResponse] =
            await Promise.all([
              supabase.from('inspections').select('id', { count: 'exact' }).eq('status', 'completed'),
              supabase.from('inspections').select('id', { count: 'exact' }).eq('status', 'in_progress'),
              supabase
                .from('inspection_items')
                .select('id', { count: 'exact' })
                .eq('marked_for_report', true),
              supabase.from('inspections').select('inspection_type').eq('status', 'completed'),
            ]);

          completedInspections = completedResponse.count || 0;
          pendingInspections = pendingResponse.count || 0;
          issuesDetected = issuesResponse.count || 0;

          if (inspectionTypesResponse.data) {
            inspectionTypesResponse.data.forEach((r: any) => {
              const t = r.inspection_type as keyof typeof inspectionsByType;
              if (t && t in inspectionsByType) inspectionsByType[t] += 1;
            });
          }

          // Issue breakdown
          const { data: issueItems } = await supabase
            .from('inspection_items')
            .select('value')
            .eq('marked_for_report', true)
            .not('value', 'is', null);

          issueItems?.forEach((item: any) => {
            const add = (val: string) => {
              const v = val.toLowerCase();
              if (v.includes('repair')) issuesByValue['Needs Repair']++;
              else if (v.includes('poor') || v.includes('bad')) issuesByValue['Poor']++;
              else if (v.includes('damag')) issuesByValue['Damaged']++;
              else if (v.includes('missing') || v.includes('absent')) issuesByValue['Missing']++;
            };
            const value = item.value;
            if (typeof value === 'string') add(value);
            else if (Array.isArray(value)) value.forEach((s) => typeof s === 'string' && add(s));
          });

          // Properties by type
          const { data: propertiesResponse } = await supabase.from('properties').select('type');
          propertiesResponse?.forEach((p: any) => {
            if (p?.type) propertiesByType[p.type] = (propertiesByType[p.type] || 0) + 1;
          });

          // Top properties last 30 days
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: topPropertiesData } = await supabase
            .from('inspections')
            .select(`property_id, properties ( name )`)
            .eq('status', 'completed')
            .gte('created_at', thirtyDaysAgo);

          if (topPropertiesData) {
            const counts: Record<string, number> = {};
            topPropertiesData.forEach((i: any) => {
              const name = i?.properties?.name || 'Unknown Property';
              counts[name] = (counts[name] || 0) + 1;
            });
            topPropertiesByInspections = Object.entries(counts)
              .map(([name, count]) => ({ name, count: count as number }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
          }
        } else {
          // keep logic consistent with your original code (dev skips queries)
          completedInspections = 0;
          pendingInspections = 0;
          issuesDetected = 0;
          inspectionsByType = { check_in: 0, check_out: 0, move_in: 0, move_out: 0 };
          issuesByValue = { 'Needs Repair': 0, 'Poor': 0, 'Damaged': 0, 'Missing': 0 };
          propertiesByType = {};
          topPropertiesByInspections = [];
        }

        setStats({
          properties: propertyCount,
          completedInspections,
          pendingInspections,
          issuesDetected,
        });

        setChartData({
          inspectionsByType,
          issuesByValue,
          propertiesByType,
          topPropertiesByInspections,
        });

        // Storage usage for storage pie
        const usage = await getStorageUsage();
        setStorageUsage(usage || null);
      } catch (e) {
        console.error('Error loading dashboard data:', e);
        setStats({ properties: 0, completedInspections: 0, pendingInspections: 0, issuesDetected: 0 });
        setChartData({
          inspectionsByType: { check_in: 0, check_out: 0, move_in: 0, move_out: 0 },
          issuesByValue: { 'Needs Repair': 0, 'Poor': 0, 'Damaged': 0, 'Missing': 0 },
          propertiesByType: {},
          topPropertiesByInspections: [],
        });
        setStorageUsage(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Derived
  const tierLimits = TIER_LIMITS[company?.tier || 'starter'];
  const totalInspections =
    (stats?.completedInspections || 0) + (stats?.pendingInspections || 0);

  const hasPropertiesData = Object.keys(chartData.propertiesByType).length > 0;

  // Storage pie dataset
  const used = storageUsage?.currentUsage ?? 0;
  const quota = storageUsage?.quota ?? 0;
  const free = Math.max(quota - used, 0);
  const storagePct = quota > 0 ? Math.round((used / quota) * 100) : 0;
  const storagePie = {
    labels: ['Used', 'Free'],
    datasets: [
      {
        data: [used, free],
        backgroundColor: [BRAND, 'rgba(18,20,23,0.08)'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  // Property portfolio pie dataset
  const portfolioPie = {
    labels: Object.keys(chartData.propertiesByType).map((t) =>
      t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')
    ),
    datasets: [
      {
        data: Object.values(chartData.propertiesByType),
        backgroundColor: [BRAND, BRAND_2, '#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  // Chart options for nice circles inside square cards
  const pieOpts = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            if (ctx.label === 'Used' || ctx.label === 'Free') {
              const v = ctx.parsed as number;
              return `${ctx.label}: ${formatBytes(v)}`;
            }
            return `${ctx.label}: ${ctx.parsed}`;
          },
        },
      },
    },
  };

  // Trial block (as in your original)
  const trialDaysRemaining = company?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(company.trialEndsAt).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top: Title + Search */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Overview of your property inspections and activities</p>
      </div>

      {/* Search bar (full width, top) */}
      <div className="mb-5">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search properties, inspections, reports…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[--brand-500] focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Trial block */}
      {!isTrialExpired && company?.subscription_status === 'trialing' && (
        <div className="mb-5 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-primary-900">Free Trial Active</h3>
              <p className="text-sm text-primary-700">
                {trialDaysRemaining} days remaining • Ends{' '}
                {company?.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : 'soon'}
              </p>
            </div>
            <Button
              onClick={() =>
                requiresPayment
                  ? navigate('/subscription-required')
                  : navigate('/dashboard/admin/subscription')
              }
              className="bg-primary-600 hover:bg-primary-700"
            >
              Upgrade
            </Button>
          </div>
        </div>
      )}

      {/* Storage near/over-limit banner (compact) */}
      {storageUsage && (storagePct >= 80) && (
        <div
          className={`mb-5 rounded-lg border p-3 ${
            storagePct >= 100
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {storagePct >= 100 ? 'Storage limit exceeded' : 'Storage nearly full'} —{' '}
              <span className="font-medium">
                {formatBytes(used)} / {formatBytes(quota)} ({storagePct}%)
              </span>
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/dashboard/admin/subscription')}
              className="h-7 text-xs"
            >
              Upgrade plan
            </Button>
          </div>
        </div>
      )}

      {/* Usage Statistics — 4 medium squares */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Usage Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Properties */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-soft border border-gray-100 p-3 aspect-square flex flex-col justify-center items-center text-center"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-blue-50">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 truncate">Properties</span>
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight">
              {stats.properties} / {TIER_LIMITS[company?.tier || 'starter'].properties === Infinity ? '∞' : TIER_LIMITS[company?.tier || 'starter'].properties}
            </div>
            <Link
              to="/dashboard/properties"
              className="mt-1 text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              {stats.properties === 0 ? 'Add your first property' : 'View all'}
            </Link>
          </motion.div>

          {/* Completed */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-soft border border-gray-100 p-3 aspect-square flex flex-col justify-center items-center text-center"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs text-gray-500 truncate">Completed</span>
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight">{stats.completedInspections}</div>
            <Link
              to="/dashboard/reports"
              className="mt-1 text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              {stats.completedInspections === 0 ? 'Start your first inspection' : 'View reports'}
            </Link>
          </motion.div>

          {/* Flagged */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-soft border border-gray-100 p-3 aspect-square flex flex-col justify-center items-center text-center"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-xs text-gray-500 truncate">Flagged</span>
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight">{stats.issuesDetected}</div>
            <span className="mt-1 text-[11px] text-gray-500">
              {stats.issuesDetected === 0 ? 'No issues detected' : 'Require attention'}
            </span>
          </motion.div>

          {/* Inspections (total) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-soft border border-gray-100 p-3 aspect-square flex flex-col justify-center items-center text-center"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-indigo-50">
                {/* Simple check icon reuse */}
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-xs text-gray-500 truncate">Inspections</span>
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight">{totalInspections}</div>
            <span className="mt-1 text-[11px] text-gray-500">
              {stats.completedInspections} completed • {stats.pendingInspections} pending
            </span>
          </motion.div>
        </div>
      </div>

      {/* Two bigger squares (charts) — side-by-side, no scrolling */}
      <div className="grid grid-cols-2 gap-4">
        {/* Storage */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-3 aspect-square">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-600">Storage</h3>
            {storageUsage && (
              <span className="text-[11px] text-gray-400">
                {formatBytes(used)} / {formatBytes(quota)}
              </span>
            )}
          </div>
          <div className="relative w-full h-[calc(100%-1.75rem)]">
            <Pie data={storagePie} options={pieOpts} />
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{storagePct}%</div>
                <div className="text-[11px] text-gray-500">used</div>
              </div>
            </div>
          </div>
        </div>

        {/* Property Portfolio */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-3 aspect-square">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-gray-600">Property Portfolio</h3>
            <span className="text-[11px] text-gray-400">{stats.properties} total</span>
          </div>
          <div className="relative w-full h-[calc(100%-1.75rem)]">
            {hasPropertiesData ? (
              <Pie data={portfolioPie} options={pieOpts} />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-gray-400 text-xs">
                No properties yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
