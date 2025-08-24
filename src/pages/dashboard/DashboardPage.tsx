import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, AlertTriangle, HardDrive, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { TIER_LIMITS } from '../../types';
import { supabase } from '../../lib/supabase';

// ChartJS
ChartJS.register(ArcElement, Tooltip, Legend);

const DashboardPage = () => {
  const { company, storageStatus } = useAuthStore();

  // --- stats (same data you already had) ---
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    issuesDetected: 0,
  });

  // property portfolio breakdown
  const [propertiesByType, setPropertiesByType] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // 1) Properties count
        const { count: propertyCount, error: propErr } = await supabase
          .from('properties')
          .select('id', { count: 'exact', head: true });
        if (propErr) throw propErr;

        // 2) Completed inspections count
        const { count: completedCount, error: compErr } = await supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed');
        if (compErr) throw compErr;

        // 3) Flagged items (issues) count
        const { count: flaggedCount, error: flaggedErr } = await supabase
          .from('inspection_items')
          .select('id', { count: 'exact', head: true })
          .eq('marked_for_report', true);
        if (flaggedErr) throw flaggedErr;

        // 4) Property types for portfolio pie
        const { data: typesData, error: typesErr } = await supabase
          .from('properties')
          .select('type');
        if (typesErr) throw typesErr;

        const grouped: Record<string, number> = {};
        (typesData || []).forEach((row: any) => {
          const key = String(row.type || 'Unknown')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
          grouped[key] = (grouped[key] || 0) + 1;
        });

        setStats({
          properties: propertyCount || 0,
          completedInspections: completedCount || 0,
          issuesDetected: flaggedCount || 0,
        });
        setPropertiesByType(grouped);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        // fallbacks on error
        setStats({ properties: 0, completedInspections: 0, issuesDetected: 0 });
        setPropertiesByType({});
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const tierLimits = TIER_LIMITS[company?.tier || 'starter'];

  // ---- Storage (use the real store values, with safe fallbacks) ----
  // Try several common shapes to keep it robust with your existing StorageUsageCard source.
  const usedMB =
    (storageStatus as any)?.usedMB ??
    (storageStatus as any)?.used_mb ??
    Math.round(((storageStatus as any)?.usedBytes ?? (storageStatus as any)?.used_bytes ?? 500 * 1024 * 1024) / (1024 * 1024));

  const limitMB =
    (storageStatus as any)?.limitMB ??
    (storageStatus as any)?.limit_mb ??
    Math.round(((storageStatus as any)?.limitBytes ?? (storageStatus as any)?.limit_bytes ?? 5 * 1024 * 1024 * 1024) / (1024 * 1024));

  const freeMB = Math.max(limitMB - usedMB, 0);

  // ---- Pie: Storage ----
  const storagePieData = {
    labels: ['Used', 'Free'],
    datasets: [
      {
        data: [usedMB, freeMB],
        backgroundColor: ['#2f66ff', '#dfe7ff'],
        borderColor: ['#2f66ff', '#dfe7ff'],
        borderWidth: 1,
      },
    ],
  };

  // ---- Pie: Property Portfolio ----
  const portfolioLabels = Object.keys(propertiesByType);
  const portfolioValues = Object.values(propertiesByType);
  const palette = ['#2f66ff', '#5f86ff', '#00b3a4', '#ff8a65', '#8e7dff', '#ff5f9f'];
  const portfolioPieData = {
    labels: portfolioLabels,
    datasets: [
      {
        data: portfolioValues,
        backgroundColor: portfolioLabels.map((_, i) => palette[i % palette.length]),
        borderColor: portfolioLabels.map((_, i) => palette[i % palette.length]),
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header + Search (no top-right buttons anymore) */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Overview of your property inspections and activities</p>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties, inspections, reports…"
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Usage Statistics (4 cards only) */}
      <div className="border-b border-gray-200 pb-8 mb-10">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Properties */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white overflow-hidden shadow rounded-xl border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-50 rounded-md p-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Properties</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">
                        {stats.properties}{' '}
                        <span className="text-gray-400">
                          / {tierLimits.properties === Infinity ? '∞' : tierLimits.properties}
                        </span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Completed Inspections */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white overflow-hidden shadow rounded-xl border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-50 rounded-md p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed Inspections</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">{stats.completedInspections}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Flagged Items */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white overflow-hidden shadow rounded-xl border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-50 rounded-md p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Flagged Items</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">{stats.issuesDetected}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Storage (summary) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white overflow-hidden shadow rounded-xl border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-50 rounded-md p-3">
                  <HardDrive className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Storage</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">
                        {Math.round(usedMB)} <span className="text-gray-500 text-sm">/ {Math.round(limitMB)} MB</span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Analytics: 2 pie charts (Storage + Property Portfolio) */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Storage</h3>
            <div className="h-64">
              <Pie
                data={storagePieData}
                options={{
                  plugins: { legend: { position: 'bottom' } },
                  maintainAspectRatio: false,
                  responsive: true,
                }}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Used: {Math.round(usedMB)} MB • Free: {Math.round(freeMB)} MB • Total: {Math.round(limitMB)} MB
            </p>
          </div>

          {/* Property Portfolio */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Property Portfolio</h3>
            {portfolioValues.length ? (
              <div className="h-64">
                <Pie
                  data={portfolioPieData}
                  options={{
                    plugins: { legend: { position: 'bottom' } },
                    maintainAspectRatio: false,
                    responsive: true,
                  }}
                />
              </div>
            ) : (
              <div className="h-64 grid place-items-center text-gray-500 text-sm">No properties yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
