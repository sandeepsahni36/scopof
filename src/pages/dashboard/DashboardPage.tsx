// src/pages/dashboardpage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Search as SearchIcon,
  PieChart as PieChartIcon,
  HardDrive
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { TIER_LIMITS } from '../../types';
import { supabase, devModeEnabled } from '../../lib/supabase';

ChartJS.register(ArcElement, Tooltip, Legend);

const DashboardPage = () => {
  const {
    company,
    storageStatus,
    isDevMode,
  } = useAuthStore();

  // Debug (kept from your original)
  console.log('=== DASHBOARD PAGE DEBUG ===');
  console.log('Dev mode enabled:', isDevMode);
  console.log('Storage status:', storageStatus);
  console.log('=== END DASHBOARD DEBUG ===');

  // Search
  const [query, setQuery] = useState('');

  // KPI state (trimmed to what we actually show)
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    issuesDetected: 0, // flagged items
  });

  // Chart state we still need
  const [propertiesByType, setPropertiesByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // ---------- Load data ----------
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Properties count
        const { count: propsCount } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true });

        // Completed inspections
        const { count: completedCount } = await supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed');

        // Flagged items (inspection_items.marked_for_report = true)
        const { count: flaggedCount } = await supabase
          .from('inspection_items')
          .select('id', { count: 'exact', head: true })
          .eq('marked_for_report', true);

        // Properties by type for the portfolio pie
        const { data: properties } = await supabase
          .from('properties')
          .select('type');

        const byType: Record<string, number> = {};
        (properties || []).forEach((p: any) => {
          const t = (p?.type || 'Unknown').toString();
          byType[t] = (byType[t] || 0) + 1;
        });

        setStats({
          properties: propsCount || 0,
          completedInspections: completedCount || 0,
          issuesDetected: flaggedCount || 0,
        });
        setPropertiesByType(byType);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        // Safe fallbacks
        setStats({
          properties: 0,
          completedInspections: 0,
          issuesDetected: 0,
        });
        setPropertiesByType({});
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // ---------- Tier limits ----------
  const tierLimits = TIER_LIMITS[company?.tier || 'starter'];

  // ---------- Storage (read ONLY from store; no fake defaults) ----------
  // Try a few common shapes so we don’t drift from your StorageUsageCard
  const rawUsedBytes =
    (storageStatus as any)?.usedBytes ??
    (storageStatus as any)?.usage?.usedBytes ??
    (storageStatus as any)?.usage?.bytes ??
    (storageStatus as any)?.bytesUsed ??
    null;

  const rawLimitBytes =
    (storageStatus as any)?.limitBytes ??
    (storageStatus as any)?.quota?.limitBytes ??
    (storageStatus as any)?.quota?.bytes ??
    (storageStatus as any)?.bytesLimit ??
    null;

  const usedMB = rawUsedBytes != null ? rawUsedBytes / (1024 * 1024) : 0;
  const limitMB = rawLimitBytes != null ? rawLimitBytes / (1024 * 1024) : 0;
  const freeMB = limitMB > 0 ? Math.max(limitMB - usedMB, 0) : 0;

  // ---------- Charts ----------
  const storagePieData = useMemo(
    () => ({
      labels: ['Used', 'Free'],
      datasets: [
        {
          data: limitMB > 0 ? [usedMB, freeMB] : [usedMB, 0],
          backgroundColor: ['#2f66ff', '#dfe7ff'],
          borderColor: ['#2f66ff', '#dfe7ff'],
          borderWidth: 1,
        },
      ],
    }),
    [usedMB, freeMB, limitMB]
  );

  const portfolioPieData = useMemo(() => {
    const labels = Object.keys(propertiesByType).map((t) =>
      t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')
    );
    const values = Object.values(propertiesByType);
    const palette = [
      'rgba(37, 99, 235, 0.7)',   // blue
      'rgba(5, 150, 105, 0.7)',   // emerald
      'rgba(220, 38, 38, 0.7)',   // red
      'rgba(217, 119, 6, 0.7)',   // amber
      'rgba(124, 58, 237, 0.7)',  // violet
      'rgba(219, 39, 119, 0.7)',  // pink
    ];
    const borders = [
      'rgba(37, 99, 235, 1)',
      'rgba(5, 150, 105, 1)',
      'rgba(220, 38, 38, 1)',
      'rgba(217, 119, 6, 1)',
      'rgba(124, 58, 237, 1)',
      'rgba(219, 39, 119, 1)',
    ];
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: values.map((_, i) => palette[i % palette.length]),
          borderColor: values.map((_, i) => borders[i % borders.length]),
          borderWidth: 1,
        },
      ],
    };
  }, [propertiesByType]);

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
      {/* Header with Search + Storage quick stat */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Overview of your property inspections and activities
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-[380px]">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search properties, inspections, reports…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Storage quick stat */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
          <HardDrive className="h-5 w-5 text-primary-600" />
          <div className="text-sm">
            <div className="font-semibold text-gray-900">
              {Math.round(usedMB)} MB
              {limitMB > 0 && (
                <span className="text-gray-500 font-normal"> / {Math.round(limitMB)} MB</span>
              )}
            </div>
            <div className="text-gray-500">
              Storage used
            </div>
          </div>
        </div>
      </div>

      {/* Usage statistics (3 cards as requested) */}
      <div className="border-b border-gray-200 pb-8 mb-10">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Properties */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <Building2 className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Properties
                    </dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">
                        {stats.properties} / {tierLimits.properties === Infinity ? '∞' : tierLimits.properties}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Completed Inspections */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed Inspections
                    </dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">
                        {stats.completedInspections}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Flagged Items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Flagged Items
                    </dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">
                        {stats.issuesDetected}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Analytics (2 pie charts) */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary-600" />
              Storage
            </h3>
            <div className="w-full max-w-[360px] mx-auto">
              <Pie
                data={storagePieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const v = Array.isArray(ctx?.raw) ? 0 : (ctx?.raw as number) || 0;
                          return `${ctx.label}: ${Math.round(v)} MB`;
                        },
                      },
                    },
                  },
                }}
              />
              <p className="mt-3 text-xs text-gray-500 text-center">
                Used: {Math.round(usedMB)} MB
                {limitMB > 0 ? (
                  <>
                    {' '}• Free: {Math.round(freeMB)} MB • Total: {Math.round(limitMB)} MB
                  </>
                ) : null}
              </p>
            </div>
          </div>

          {/* Property Portfolio */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary-600" />
              Property Portfolio ({stats.properties} total)
            </h3>
            {Object.keys(propertiesByType).length > 0 ? (
              <div className="w-full max-w-[360px] mx-auto">
                <Pie
                  data={portfolioPieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { position: 'bottom' },
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed as number;
                            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${label}: ${value} (${pct}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <PieChartIcon className="h-12 w-12 mb-3" />
                <p className="text-sm">No properties yet</p>
                <p className="text-xs">Add properties to see portfolio breakdown</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
