import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
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
  Search,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { TIER_LIMITS } from '../../types';
import { useNavigate } from 'react-router-dom';
import { checkPropertyLimit } from '../../lib/properties';
import { supabase, devModeEnabled } from '../../lib/supabase';

// 🔑 use the SAME helpers as StorageUsageCard
import {
  getStorageUsage,
  formatBytes,
  getUsagePercentage,
  StorageUsage,
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

const DashboardPage = () => {
  const { company, isTrialExpired } = useAuthStore();
  const navigate = useNavigate();

  // Stats
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    pendingInspections: 0,
    issuesDetected: 0,
  });

  // Charts (portfolio)
  const [chartData, setChartData] = useState({
    propertiesByType: {} as Record<string, number>,
  });

  // Storage usage (for the storage pie)
  const [storage, setStorage] = useState<StorageUsage | null>(null);

  const [loading, setLoading] = useState(true);

  // Load dashboard + storage
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Property count (limit check)
        const propertyLimits = await checkPropertyLimit();
        const propertyCount = propertyLimits?.currentCount || 0;

        let completedInspections = 0;
        let pendingInspections = 0;
        let issuesDetected = 0;
        let propertiesByType: Record<string, number> = {};

        if (!devModeEnabled()) {
          const [
            completedResponse,
            pendingResponse,
            issuesResponse,
            propertiesResponse,
          ] = await Promise.all([
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
            supabase.from('properties').select('type'),
          ]);

          completedInspections = completedResponse.count || 0;
          pendingInspections = pendingResponse.count || 0;
          issuesDetected = issuesResponse.count || 0;

          if (propertiesResponse.data) {
            propertiesResponse.data.forEach((p: any) => {
              const t = p.type;
              if (t) propertiesByType[t] = (propertiesByType[t] || 0) + 1;
            });
          }
        } else {
          // dev fallback
          completedInspections = 8;
          pendingInspections = 3;
          issuesDetected = 5;
          propertiesByType = { apartment: 2, villa: 1, condo: 0 };
        }

        setStats({
          properties: propertyCount,
          completedInspections,
          pendingInspections,
          issuesDetected,
        });

        setChartData({
          propertiesByType,
        });

        // 🔵 Storage usage — EXACTLY like StorageUsageCard
        const usageData = await getStorageUsage();
        setStorage(usageData || null);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setStats({
          properties: 0,
          completedInspections: 0,
          pendingInspections: 0,
          issuesDetected: 0,
        });
        setChartData({ propertiesByType: {} });
        setStorage(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const tierLimits = TIER_LIMITS[company?.tier || 'starter'];

  // Derived
  const totalInspections = stats.completedInspections + stats.pendingInspections;

  const hasPropertiesData = Object.keys(chartData.propertiesByType).length > 0;

  // -----------------------
  // Charts
  // -----------------------

  // Storage pie (used vs free) — uses same values as StorageUsageCard
  const storagePieData = storage
    ? {
        labels: [
          `Used (${formatBytes(storage.currentUsage)})`,
          `Free (${formatBytes(
            Math.max(storage.quota - storage.currentUsage, 0)
          )})`,
        ],
        datasets: [
          {
            data: [
              storage.currentUsage,
              Math.max(storage.quota - storage.currentUsage, 0),
            ],
            backgroundColor: ['#2f66ff', 'rgba(47,102,255,0.15)'],
            borderColor: ['#2f66ff', 'rgba(47,102,255,0.25)'],
            borderWidth: 1,
            hoverOffset: 6,
          },
        ],
      }
    : null;

  // Property portfolio pie
  const portfolioLabels = Object.keys(chartData.propertiesByType).map((t) =>
    t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')
  );
  const portfolioValues = Object.values(chartData.propertiesByType);
  const portfolioPieData =
    hasPropertiesData && portfolioValues.reduce((a, b) => a + b, 0) > 0
      ? {
          labels: portfolioLabels,
          datasets: [
            {
              data: portfolioValues,
              backgroundColor: [
                'rgba(47,102,255,0.85)', // brand
                'rgba(95,134,255,0.85)',
                'rgba(16,185,129,0.85)',
                'rgba(217,119,6,0.85)',
                'rgba(124,58,237,0.85)',
                'rgba(219,39,119,0.85)',
              ],
              borderColor: [
                '#2f66ff',
                '#5f86ff',
                '#10b981',
                '#d97706',
                '#7c3aed',
                '#db2777',
              ],
              borderWidth: 1,
              hoverOffset: 6,
            },
          ],
        }
      : null;

  // -----------------------
  // Loading
  // -----------------------
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

  // -----------------------
  // UI
  // -----------------------
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header + Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Overview of your property inspections and activities
          </p>
        </div>

        {/* Search bar */}
        <div className="w-full md:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Trial banner preserved if you want it; hidden when expired */}
      {!isTrialExpired && company?.subscription_status === 'trialing' && (
        <div className="mb-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200">
          <p className="text-sm text-primary-800">
            Your free trial is active.
          </p>
        </div>
      )}

      {/* Usage statistics – exactly 4 cards */}
      <div className="border-b border-gray-200 pb-8 mb-10">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Properties */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white overflow-hidden shadow rounded-xl"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <Building2 className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500">Properties</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.properties} / {TIER_LIMITS[company?.tier || 'starter'].properties === Infinity ? '∞' : TIER_LIMITS[company?.tier || 'starter'].properties}
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
            className="bg-white overflow-hidden shadow rounded-xl"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500">
                      Completed Inspections
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.completedInspections}
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
            className="bg-white overflow-hidden shadow rounded-xl"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500">
                      Flagged Items
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.issuesDetected}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Inspections (total) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white overflow-hidden shadow rounded-xl"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500">Inspections</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {totalInspections}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Analytics: ONLY 2 pies (Storage + Property Portfolio) */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              Storage
            </h3>

            {storage && storagePieData ? (
              <div className="flex flex-col items-center justify-center">
                <div className="w-full max-w-xs">
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
                              const label = ctx.label || '';
                              const value = ctx.parsed as number;
                              return `${label}: ${formatBytes(value)}`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  {formatBytes(storage.currentUsage)} of {formatBytes(storage.quota)} used (
                  {getUsagePercentage(storage.currentUsage, storage.quota)}%)
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <PieChartIcon className="h-12 w-12 mb-4" />
                <p className="text-sm">Storage data unavailable</p>
              </div>
            )}
          </div>

          {/* Property Portfolio */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              Property Portfolio ({stats.properties} total)
            </h3>

            {portfolioPieData ? (
              <div className="w-full max-w-xs mx-auto">
                <Pie
                  data={portfolioPieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { position: 'bottom' },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const label = ctx.label || '';
                            const value = ctx.parsed as number;
                            const total = (ctx.dataset.data as number[]).reduce(
                              (a, b) => a + b,
                              0
                            );
                            const pct = total ? ((value / total) * 100).toFixed(1) : '0.0';
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
                <PieChartIcon className="h-12 w-12 mb-4" />
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
