import React, { useEffect, useMemo, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Plugin,
  ChartOptions,
} from 'chart.js';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  BarChart3,
  Search,
  PieChart as PieIcon,
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

// ---- Chart setup ------------------------------------------------------------
ChartJS.register(ArcElement, Title, Tooltip, Legend);

const donutShadowPlugin: Plugin<'doughnut'> = {
  id: 'donutShadow',
  beforeDatasetDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.shadowColor = 'rgba(18,20,23,.10)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
  },
  afterDatasetDraw(chart) {
    chart.ctx.restore();
  },
};
ChartJS.register(donutShadowPlugin);

// ----------------------------------------------------------------------------

const DashboardPage = () => {
  const { company, isTrialExpired, requiresPayment } = useAuthStore();
  const navigate = useNavigate();

  // Stats
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    pendingInspections: 0,
    issuesDetected: 0,
    averageInspectionDuration: 0,
  });

  // Storage (real API via lib/storage)
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
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // storage usage (bucket)
        const u = await getStorageUsage().catch(() => null);
        if (u) setUsage(u);

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

          // Avg duration (kept for future use)
          const { data: durs } = await supabase
            .from('inspections')
            .select('duration_seconds')
            .eq('status', 'completed')
            .not('duration_seconds', 'is', null);

          if (durs?.length) {
            const total = durs.reduce((s, i) => s + (i.duration_seconds || 0), 0);
            averageInspectionDuration = Math.round(total / durs.length / 60);
          }
        } else {
          // Dev fallback
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
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  // ===== Donuts ==============================================================
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
          borderRadius: 10,
          spacing: 6,
        },
      ],
    };
  }, [chartData.propertiesByType]);

  const storageDonutData = useMemo(() => {
    if (!usage) return null;
    const used = usage.currentUsage;
    const free = Math.max(usage.quota - usage.currentUsage, 0);
    return {
      labels: ['Used', 'Free'],
      datasets: [
        {
          label: 'Storage',
          data: [used, free],
          backgroundColor: ['#2f66ff', '#e8edff'],
          borderWidth: 0,
          borderRadius: 10,
          spacing: 6,
        },
      ],
    };
  }, [usage]);

  const donutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '78%',
    plugins: { legend: { display: false } },
  };

  const usagePct = usage ? getUsagePercentage(usage.currentUsage, usage.quota) : 0;
  const nearLimit = usagePct >= 80 && usagePct < 100;
  const overLimit = usagePct >= 100;

  // ===== Loading =============================================================
  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ===== UI ==================================================================
  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
      {/* Title + Search (top, full width) */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Overview of your property inspections and activities</p>
        <div className="relative mt-3">
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Compact Trial block */}
      {!isTrialExpired && company?.subscription_status === 'trialing' && (
        <div className="mb-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-3 border border-primary-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary-500 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-primary-900">Free Trial</div>
                <div className="text-primary-700">
                  {trialDaysRemaining} days left •{' '}
                  {company?.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : 'soon'}
                </div>
              </div>
            </div>
            <Button size="sm" onClick={handleUpgradeClick} className="bg-primary-600 hover:bg-primary-700">
              Upgrade
            </Button>
          </div>
        </div>
      )}

      {/* Storage warning (compact) */}
      {usage && (nearLimit || overLimit) && (
        <div className={`mb-4 rounded-lg border p-3 ${overLimit ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-4 w-4 ${overLimit ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="text-sm flex-1">
              <span className={`font-medium ${overLimit ? 'text-red-800' : 'text-amber-800'}`}>
                {overLimit ? 'Storage Limit Exceeded' : 'Storage Nearly Full'}
              </span>
              <span className={`ml-2 ${overLimit ? 'text-red-700' : 'text-amber-700'}`}>
                {overLimit ? 'Upgrade to continue uploading.' : 'Consider upgrading to avoid interruptions.'}
              </span>
            </div>
            <Button size="sm" onClick={handleUpgradeClick}>Upgrade</Button>
          </div>
        </div>
      )}

      {/* Usage Statistics — 4 medium SQUARES (fixed size) */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Usage Statistics</h2>

        {/* Desktop: fixed squares so they never get huge.
            Mobile: 2 columns of smaller squares. */}
        <div className="hidden md:flex md:items-stretch md:justify-between md:gap-4">
          {/* each square 200x200 */}
          <StatSquare
            title="Properties"
            iconBg="bg-primary-50"
            icon={<Building2 className="h-5 w-5 text-primary-600" />}
            number={`${stats.properties} / ${tierLimits.properties === Infinity ? '∞' : tierLimits.properties}`}
            sub={
              <Link to="/dashboard/properties" className="text-xs text-primary-600 hover:text-primary-500">
                {stats.properties === 0 ? 'Add your first property' : 'View all properties'}
              </Link>
            }
          />
          <StatSquare
            title="Completed"
            iconBg="bg-green-50"
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
            number={`${stats.completedInspections}`}
            sub={
              <Link to="/dashboard/reports" className="text-xs text-primary-600 hover:text-primary-500">
                {stats.completedInspections === 0 ? 'Start your first inspection' : 'View all reports'}
              </Link>
            }
          />
          <StatSquare
            title="Flagged Items"
            iconBg="bg-red-50"
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
            number={`${stats.issuesDetected}`}
            sub={<span className="text-xs text-gray-500">{stats.issuesDetected === 0 ? 'No issues detected' : 'Require attention'}</span>}
          />
          <StatSquare
            title="Inspections"
            iconBg="bg-indigo-50"
            icon={<BarChart3 className="h-5 w-5 text-indigo-600" />}
            number={`${totalInspections}`}
            sub={<span className="text-xs text-gray-500">{stats.pendingInspections} in progress</span>}
          />
        </div>

        {/* Mobile: 2 cols, small squares, tiny labels, truncate */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          <StatSquareMobile
            title="Properties"
            iconBg="bg-primary-50"
            icon={<Building2 className="h-4 w-4 text-primary-600" />}
            number={`${stats.properties}/${tierLimits.properties === Infinity ? '∞' : tierLimits.properties}`}
          />
          <StatSquareMobile
            title="Completed"
            iconBg="bg-green-50"
            icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            number={`${stats.completedInspections}`}
          />
          <StatSquareMobile
            title="Flagged"
            iconBg="bg-red-50"
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            number={`${stats.issuesDetected}`}
          />
          <StatSquareMobile
            title="Inspections"
            iconBg="bg-indigo-50"
            icon={<BarChart3 className="h-4 w-4 text-indigo-600" />}
            number={`${totalInspections}`}
          />
        </div>
      </div>

      {/* Analytics — 2 BIGGER SQUARES (but smaller donuts; side-by-side even on mobile) */}
      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Analytics</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Storage */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 relative h-[240px]">
            <h3 className="text-sm font-medium text-gray-900">Storage</h3>
            <div className="absolute inset-0 top-9 bottom-3">
              {usage && storageDonutData ? (
                <>
                  <div className="absolute inset-x-10 inset-y-3">
                    <Doughnut data={storageDonutData} options={donutOptions} />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-semibold text-gray-900">
                      {getUsagePercentage(usage.currentUsage, usage.quota)}%
                    </span>
                    <span className="text-[11px] text-gray-500 mt-0.5">
                      {formatBytes(usage.currentUsage)} / {formatBytes(usage.quota)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <PieIcon className="h-6 w-6 mr-2" />
                  No storage data
                </div>
              )}
            </div>
          </div>

          {/* Property Portfolio */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 relative h-[240px]">
            <h3 className="text-sm font-medium text-gray-900">
              Property Portfolio ({stats.properties} total)
            </h3>
            <div className="absolute inset-0 top-9 bottom-3">
              {Object.keys(chartData.propertiesByType).length > 0 ? (
                <>
                  <div className="absolute inset-x-10 inset-y-3">
                    <Doughnut data={propertyPortfolioData} options={donutOptions} />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-[11px] text-gray-500 -mb-0.5">Total</div>
                    <div className="text-2xl font-semibold text-gray-900">{stats.properties}</div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <PieIcon className="h-6 w-6 mr-2" />
                  No properties yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compact empty-state CTAs (kept, but small so page doesn’t scroll) */}
      {stats.properties === 0 && (
        <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50 p-3">
          <p className="text-xs text-primary-800">
            Get started by creating your first property and setting up inspection templates.
          </p>
          <div className="mt-2">
            <Link to="/dashboard/properties">
              <Button size="sm">Add Your First Property</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

/* -------- Small helper components for clean markup -------- */

function StatSquare({
  title,
  icon,
  iconBg,
  number,
  sub,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  number: string;
  sub?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 w-[220px] h-[220px] flex flex-col"
    >
      <div className="flex items-center gap-2">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>{icon}</div>
        <div className="text-[13px] text-gray-600 leading-tight">{title}</div>
      </div>
      <div className="mt-auto">
        <div className="text-[28px] leading-none font-semibold text-gray-900">{number}</div>
        {sub ? <div className="mt-1">{sub}</div> : null}
      </div>
    </motion.div>
  );
}

function StatSquareMobile({
  title,
  icon,
  iconBg,
  number,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  number: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 aspect-square flex flex-col">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
        <div className="text-[11px] text-gray-600 leading-tight truncate">{title}</div>
      </div>
      <div className="mt-auto">
        <div className="text-2xl leading-none font-semibold text-gray-900">{number}</div>
      </div>
    </div>
  );
}
