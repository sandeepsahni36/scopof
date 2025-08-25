import React, { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Search
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { TIER_LIMITS } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { checkPropertyLimit } from '../../lib/properties';
import { supabase, devModeEnabled } from '../../lib/supabase';
import { getTemplates } from '../../lib/templates';
import { getReports } from '../../lib/reports';
import {
  getStorageUsage,
  getUsagePercentage,
  formatBytes,
  StorageUsage,
} from '../../lib/storage';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DashboardPage: React.FC = () => {
  const {
    company,
    hasActiveSubscription,
    isTrialExpired,
    requiresPayment,
    canStartInspections,
    storageStatus,
    isDevMode,
  } = useAuthStore();
  const navigate = useNavigate();

  // --- Search ----
  const [search, setSearch] = useState('');

  // --- Search Results ---
  const [searchedProperties, setSearchedProperties] = useState<any[]>([]);
  const [searchedTemplates, setSearchedTemplates] = useState<any[]>([]);
  const [searchedReports, setSearchedReports] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // --- Stats (unchanged wiring) ---
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    pendingInspections: 0,
    issuesDetected: 0,
    averageInspectionDuration: 0,
  });

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

  // --- Storage usage (from your API bucket via lib/storage) ---
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const usagePct = useMemo(
    () => (storage ? getUsagePercentage(storage.currentUsage, storage.quota) : 0),
    [storage]
  );
  const nearLimit = usagePct >= 80 && usagePct < 100;
  const overLimit = usagePct >= 100;

  // Load dashboard data (same logic you had)
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // If search is active, load search results instead of dashboard stats
        if (search.trim()) {
          setSearchLoading(true);
          try {
            const [propertiesData, templatesData, reportsData] = await Promise.all([
              import('../../lib/properties').then(module => module.getProperties(search)),
              getTemplates(search),
              getReports({ searchTerm: search })
            ]);

            setSearchedProperties(propertiesData || []);
            setSearchedTemplates(templatesData || []);
            setSearchedReports(reportsData || []);
          } catch (error) {
            console.error('Error loading search results:', error);
            setSearchedProperties([]);
            setSearchedTemplates([]);
            setSearchedReports([]);
          } finally {
            setSearchLoading(false);
          }
          setLoading(false);
          return;
        }
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
        let propertiesByType: Record<string, number> = {};
        let topPropertiesByInspections: Array<{ name: string; count: number }> = [];
        let averageInspectionDuration = 0;

        if (!devModeEnabled()) {
          const [completedResponse, pendingResponse, issuesResponse, inspectionTypesResponse] =
            await Promise.all([
              supabase.from('inspections').select('id', { count: 'exact' }).eq('status', 'completed'),
              supabase.from('inspections').select('id', { count: 'exact' }).eq('status', 'in_progress'),
              supabase.from('inspection_items').select('id', { count: 'exact' }).eq('marked_for_report', true),
              supabase.from('inspections').select('inspection_type').eq('status', 'completed'),
            ]);

          completedInspections = completedResponse.count || 0;
          pendingInspections = pendingResponse.count || 0;
          issuesDetected = issuesResponse.count || 0;

          if (inspectionTypesResponse.data) {
            inspectionTypesResponse.data.forEach((inspection: any) => {
              const type = inspection.inspection_type;
              if (type && (inspectionsByType as any)[type] !== undefined) {
                (inspectionsByType as any)[type]++;
              }
            });
          }

          const { data: issueItems } = await supabase
            .from('inspection_items')
            .select('value')
            .eq('marked_for_report', true)
            .not('value', 'is', null);

          if (issueItems) {
            issueItems.forEach((item: any) => {
              const value = item.value;
              const bump = (k: keyof typeof issuesByValue) => (issuesByValue[k] = issuesByValue[k] + 1);
              const checkStr = (s: string) => {
                const v = s.toLowerCase();
                if (v.includes('repair')) bump('Needs Repair');
                else if (v.includes('poor') || v.includes('bad')) bump('Poor');
                else if (v.includes('damage')) bump('Damaged');
                else if (v.includes('missing') || v.includes('absent')) bump('Missing');
              };
              if (typeof value === 'string') checkStr(value);
              if (Array.isArray(value)) value.forEach((v) => typeof v === 'string' && checkStr(v));
            });
          }

          const { data: propertiesResponse } = await supabase.from('properties').select('type');
          if (propertiesResponse) {
            propertiesResponse.forEach((p: any) => {
              const t = p.type;
              if (t) propertiesByType[t] = (propertiesByType[t] || 0) + 1;
            });
          }

          const { data: durationData } = await supabase
            .from('inspections')
            .select('duration_seconds')
            .eq('status', 'completed')
            .not('duration_seconds', 'is', null);

          if (durationData && durationData.length > 0) {
            const total = durationData.reduce((sum, i) => sum + (i.duration_seconds || 0), 0);
            averageInspectionDuration = Math.round(total / durationData.length / 60);
          }

          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: topProps } = await supabase
            .from('inspections')
            .select(
              `
              property_id,
              properties ( name )
            `
            )
            .eq('status', 'completed')
            .gte('created_at', thirtyDaysAgo);

          if (topProps) {
            const counts: Record<string, number> = {};
            topProps.forEach((i: any) => {
              const name = i.properties?.name || 'Unknown Property';
              counts[name] = (counts[name] || 0) + 1;
            });
            topPropertiesByInspections = Object.entries(counts)
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
          }
        } else {
          // dev mode mock (kept minimal)
          completedInspections = 8;
          pendingInspections = 3;
          issuesDetected = 5;
          averageInspectionDuration = 42;
          inspectionsByType = { check_in: 4, check_out: 4, move_in: 0, move_out: 0 };
          issuesByValue = { 'Needs Repair': 2, 'Poor': 1, 'Damaged': 1, 'Missing': 1 };
          propertiesByType = { apartment: 2, villa: 1, condo: 0 };
          topPropertiesByInspections = [
            { name: 'Oceanview Apartment 2B', count: 3 },
            { name: 'Downtown Loft 5A', count: 2 },
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

    loadDashboardData();
  }, [search]);

  // Load storage usage (from your storage API) for storage chart
  useEffect(() => {
    (async () => {
      try {
        const u = await getStorageUsage();
        setStorage(u);
      } catch (e) {
        console.error('Failed to load storage usage', e);
        setStorage(null);
      }
    })();
  }, []);

  // --- Derived / chart prep ---
  const tierLimits = TIER_LIMITS[company?.tier || 'starter'];
  const totalInspections = stats.completedInspections + stats.pendingInspections;

  const propertiesByTypeEntries = Object.entries(chartData.propertiesByType);
  const hasPropertiesData = propertiesByTypeEntries.length > 0;

  // storage doughnut
  const storageUsed = storage?.currentUsage ?? 0;
  const storageQuota = storage?.quota ?? 1;
  const storageFree = Math.max(storageQuota - storageUsed, 0);
  const storageDonut = {
    labels: ['Used', 'Free'],
    datasets: [
      {
        data: [storageUsed, storageFree],
        backgroundColor: ['#2f66ff', '#E5E7EB'],
        borderColor: ['#2f66ff', '#E5E7EB'],
        borderWidth: 1,
      },
    ],
  };

  // property portfolio doughnut
  const portfolioDonut = {
    labels: propertiesByTypeEntries.map(([type]) =>
      type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
    ),
    datasets: [
      {
        data: propertiesByTypeEntries.map(([, count]) => count),
        backgroundColor: ['#2f66ff', '#5f86ff', '#93b0ff', '#c8d4ff', '#a6a6ff', '#8ad1ff'],
        borderColor: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'],
        borderWidth: 2,
      },
    ],
  };

  const donutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  // Loading
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

  // Trial days remaining
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Search on top */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Trial block (kept) */}
      {!isTrialExpired && company?.subscription_status === 'trialing' && (
        <div className="mb-5 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-primary-900">Free Trial Active</h3>
              <p className="text-xs text-primary-700">
                {trialDaysRemaining} days remaining • Ends{' '}
                {company?.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : 'soon'}
              </p>
            </div>
            <Button onClick={handleUpgradeClick} className="bg-primary-600 hover:bg-primary-700">
              Upgrade Now
            </Button>
          </div>
        </div>
      )}

      {/* Usage Statistics – 4 medium squares */}
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Usage Statistics</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Properties */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow p-4 aspect-square flex flex-col justify-between"
          >
            <div className="text-gray-500 text-xs">Properties</div>
            <div className="text-3xl font-bold tracking-tight">
              {stats.properties} / {TIER_LIMITS[company?.tier || 'starter'].properties === Infinity ? '∞' : TIER_LIMITS[company?.tier || 'starter'].properties}
            </div>
          </motion.div>

          {/* Completed */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow p-4 aspect-square flex flex-col justify-between"
          >
            <div className="text-gray-500 text-xs">
              <span className="sm:hidden">Completed</span>
              <span className="hidden sm:inline">Completed Inspections</span>
            </div>
            <div className="text-3xl font-bold tracking-tight">{stats.completedInspections}</div>
          </motion.div>

          {/* Flagged */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow p-4 aspect-square flex flex-col justify-between"
          >
            <div className="text-gray-500 text-xs">Flagged Items</div>
            <div className="text-3xl font-bold tracking-tight">{stats.issuesDetected}</div>
          </motion.div>

          {/* Inspections (Completed + Pending) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow p-4 aspect-square flex flex-col justify-between"
          >
            <div className="text-gray-500 text-xs">Inspections</div>
            <div className="text-3xl font-bold tracking-tight">{totalInspections}</div>
          </motion.div>
        </div>
      </div>

      {/* 2 bigger squares (charts) – side by side on mobile & desktop */}
      <div className="grid grid-cols-2 gap-3">
        {/* Storage */}
        <div className="bg-white rounded-xl shadow p-4 aspect-square relative overflow-hidden">
          <div className="text-gray-500 text-xs mb-2">Storage</div>
          <div className="absolute inset-0 p-6">
            <Doughnut data={storageDonut} options={donutOptions} />
          </div>
          {/* center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className={`text-2xl font-bold ${overLimit ? 'text-red-600' : nearLimit ? 'text-amber-600' : 'text-gray-900'}`}>
                {Math.round(usagePct)}%
              </div>
              <div className="text-xs text-gray-500">
                {formatBytes(storageUsed)} / {formatBytes(storageQuota)}
              </div>
            </div>
          </div>

          {/* storage warning */}
          {(nearLimit || overLimit) && (
            <div className={`absolute left-3 right-3 bottom-3 rounded-md px-2 py-1 text-xs
                ${overLimit ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {overLimit ? 'Storage limit exceeded. Upgrade to continue uploading.' : 'Storage nearly full. Consider upgrading.'}
            </div>
          )}
        </div>

        {/* Property Portfolio */}
        <div className="bg-white rounded-xl shadow p-4 aspect-square relative overflow-hidden">
          <div className="text-gray-500 text-xs mb-2">Property Portfolio</div>
          {hasPropertiesData ? (
            <div className="absolute inset-0 p-6">
              <Doughnut
                data={portfolioDonut}
                options={donutOptions}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
              Add properties to see portfolio breakdown
            </div>
          )}
        </div>
      </div>

      {/* Empty-state CTA (kept, shows when there’s no data) */}
      {stats.properties === 0 && (
        <div className="mt-5 bg-white rounded-xl shadow p-6">
          <div className="text-center">
            <h3 className="text-base font-semibold text-gray-900">No data yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start by adding properties and completing inspections to see your analytics.
            </p>
            <div className="mt-4">
              <Link to="/dashboard/properties">
                <Button>Add Your First Property</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
