// src/pages/dashboardpage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
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
  Chart,
} from "chart.js";
import { motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  BarChart3,
  Timer,
  PieChart as PieChartIcon,
  Search as SearchIcon,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { TIER_LIMITS } from "../../types";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { checkPropertyLimit } from "../../lib/properties";
import { supabase, devModeEnabled } from "../../lib/supabase";

// ---------- ChartJS setup ----------
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Subtle drop shadow under arcs (for that “polished” look)
const arcShadowPlugin: Plugin<"pie"> = {
  id: "arcShadow",
  beforeDatasetDraw: (chart, args, pluginOptions) => {
    const { ctx } = chart;
    // Only apply to arc elements (pie/doughnut)
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.12)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
  },
  afterDatasetDraw: (chart) => {
    chart.ctx.restore();
  },
};
ChartJS.register(arcShadowPlugin);

const DashboardPage = () => {
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

  // Debug (kept from your original)
  console.log("=== DASHBOARD PAGE DEBUG ===");
  console.log("Dev mode enabled:", isDevMode);
  console.log("Can start inspections:", canStartInspections);
  console.log("Storage status:", storageStatus);
  console.log("Has active subscription:", hasActiveSubscription);
  console.log("Requires payment:", requiresPayment);
  console.log("=== END DASHBOARD DEBUG ===");

  // Search
  const [query, setQuery] = useState("");

  // Dashboard data state (trimmed to what we show)
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    pendingInspections: 0, // we use this to compute Total Inspections
    issuesDetected: 0,
    averageInspectionDuration: 0, // not displayed in KPIs anymore but left intact
  });

  // Chart data state (kept: propertiesByType for portfolio)
  const [chartData, setChartData] = useState({
    inspectionsByType: {
      check_in: 0,
      check_out: 0,
      move_in: 0,
      move_out: 0,
    },
    issuesByValue: {
      "Needs Repair": 0,
      Poor: 0,
      Damaged: 0,
      Missing: 0,
    },
    propertiesByType: {} as Record<string, number>,
    topPropertiesByInspections: [] as Array<{ name: string; count: number }>,
  });

  const [loading, setLoading] = useState(true);

  // ---------- Load dashboard data (unchanged source logic) ----------
  useEffect(() => {
    const loadDashboardData = async () => {
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
          "Needs Repair": 0,
          Poor: 0,
          Damaged: 0,
          Missing: 0,
        };
        let propertiesByType = {} as Record<string, number>;
        let topPropertiesByInspections = [] as Array<{ name: string; count: number }>;
        let averageInspectionDuration = 0;

        if (!devModeEnabled()) {
          const [completedResponse, pendingResponse, issuesResponse, inspectionTypesResponse] =
            await Promise.all([
              supabase
                .from("inspections")
                .select("id", { count: "exact" })
                .eq("status", "completed"),
              supabase
                .from("inspections")
                .select("id", { count: "exact" })
                .eq("status", "in_progress"),
              supabase
                .from("inspection_items")
                .select("id", { count: "exact" })
                .eq("marked_for_report", true),
              supabase.from("inspections").select("inspection_type").eq("status", "completed"),
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
            .from("inspection_items")
            .select("value")
            .eq("marked_for_report", true)
            .not("value", "is", null);

          (issueItems || []).forEach((item: any) => {
            const value = item.value;
            const bump = (k: keyof typeof issuesByValue) => (issuesByValue[k] = issuesByValue[k] + 1);
            const check = (s: string) => s && typeof s === "string" && s.toLowerCase();
            if (typeof value === "string") {
              const v = check(value);
              if (!v) return;
              if (v.includes("repair")) bump("Needs Repair");
              else if (v.includes("poor") || v.includes("bad")) bump("Poor");
              else if (v.includes("damage")) bump("Damaged");
              else if (v.includes("missing") || v.includes("absent")) bump("Missing");
            } else if (Array.isArray(value)) {
              value.forEach((v: string) => {
                const s = check(v);
                if (!s) return;
                if (s.includes("repair")) bump("Needs Repair");
                else if (s.includes("poor") || s.includes("bad")) bump("Poor");
                else if (s.includes("damage")) bump("Damaged");
                else if (s.includes("missing") || s.includes("absent")) bump("Missing");
              });
            }
          });

          const { data: propertiesResponse } = await supabase.from("properties").select("type");
          (propertiesResponse || []).forEach((property: any) => {
            const type = property.type || "Unknown";
            propertiesByType[type] = (propertiesByType[type] || 0) + 1;
          });

          const { data: durationData } = await supabase
            .from("inspections")
            .select("duration_seconds")
            .eq("status", "completed")
            .not("duration_seconds", "is", null);

          if (durationData && durationData.length > 0) {
            const totalDuration = durationData.reduce(
              (sum, inspection) => sum + (inspection.duration_seconds || 0),
              0
            );
            averageInspectionDuration = Math.round(totalDuration / durationData.length / 60);
          }

          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: topPropertiesData } = await supabase
            .from("inspections")
            .select(
              `
              property_id,
              properties ( name )
            `
            )
            .eq("status", "completed")
            .gte("created_at", thirtyDaysAgo);

          if (topPropertiesData) {
            const propertyInspectionCounts: Record<string, number> = {};
            topPropertiesData.forEach((inspection: any) => {
              const propertyName = inspection.properties?.name || "Unknown Property";
              propertyInspectionCounts[propertyName] =
                (propertyInspectionCounts[propertyName] || 0) + 1;
            });
            topPropertiesByInspections = Object.entries(propertyInspectionCounts)
              .map(([name, count]) => ({ name, count: count as number }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
          }
        } else {
          // dev mode quick stub
          completedInspections = 8;
          pendingInspections = 3;
          issuesDetected = 5;
          averageInspectionDuration = 42;
          inspectionsByType = { check_in: 4, check_out: 4, move_in: 0, move_out: 0 };
          issuesByValue = { "Needs Repair": 2, Poor: 1, Damaged: 1, Missing: 1 };
          propertiesByType = { apartment: 2, villa: 1, condo: 0 };
          topPropertiesByInspections = [
            { name: "Oceanview Apartment 2B", count: 3 },
            { name: "Downtown Loft 5A", count: 2 },
            { name: "Mountain View Villa", count: 1 },
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
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setStats({
          properties: 0,
          completedInspections: 0,
          pendingInspections: 0,
          issuesDetected: 0,
          averageInspectionDuration: 0,
        });
        setChartData({
          inspectionsByType: { check_in: 0, check_out: 0, move_in: 0, move_out: 0 },
          issuesByValue: { "Needs Repair": 0, Poor: 0, Damaged: 0, Missing: 0 },
          propertiesByType: {},
          topPropertiesByInspections: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // ---------- Helpers ----------
  const tierLimits = TIER_LIMITS[company?.tier || "starter"];
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
    if (requiresPayment) navigate("/subscription-required");
    else navigate("/dashboard/admin/subscription");
  };

  // Format average inspection duration (kept from original)
  const formatDuration = (minutes: number) => {
    if (minutes === 0) return "N/A";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // ---------- Storage: read from your store robustly (no 0MB unless truly 0) ----------
  // Try common shapes your StorageUsageCard might use.
  const pick = (...vals: any[]) => vals.find((v) => Number.isFinite(v) && v >= 0);

  const usedBytes =
    pick(
      (storageStatus as any)?.usedBytes,
      (storageStatus as any)?.usage?.usedBytes,
      (storageStatus as any)?.usage?.bytes,
      (storageStatus as any)?.bytesUsed,
      (storageStatus as any)?.used
    ) ?? 0;

  const limitBytes =
    pick(
      (storageStatus as any)?.limitBytes,
      (storageStatus as any)?.quota?.limitBytes,
      (storageStatus as any)?.quota?.bytes,
      (storageStatus as any)?.bytesLimit,
      (storageStatus as any)?.limit
    ) ?? 0;

  const usedMB = usedBytes / (1024 * 1024);
  const limitMB = limitBytes / (1024 * 1024);
  const freeMB = limitMB > 0 ? Math.max(limitMB - usedMB, 0) : 0;

  // ---------- Charts ----------
  const hasPropertiesData = Object.keys(chartData.propertiesByType).length > 0;

  const storagePieData = useMemo(
    () => ({
      labels: ["Used", "Free"],
      datasets: [
        {
          data: limitMB > 0 ? [usedMB, freeMB] : [usedMB, 0],
          backgroundColor: ["#2f66ff", "#E7ECFF"], // brand + soft tint
          borderColor: ["#2f66ff", "#E7ECFF"],
          borderWidth: 1,
          hoverOffset: 10,
        },
      ],
    }),
    [usedMB, freeMB, limitMB]
  );

  const portfolioPieData = useMemo(() => {
    const labels = Object.keys(chartData.propertiesByType).map((t) =>
      t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")
    );
    const values = Object.values(chartData.propertiesByType);
    const palette = [
      "rgba(47,102,255,0.75)", // brand 500
      "rgba(95,134,255,0.75)", // brand 400
      "rgba(5,150,105,0.75)", // emerald
      "rgba(220,38,38,0.75)", // red
      "rgba(217,119,6,0.75)", // amber
      "rgba(124,58,237,0.75)", // violet
      "rgba(219,39,119,0.75)", // pink
    ];
    const borders = palette.map((c) => c.replace("0.75", "1"));
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: values.map((_, i) => palette[i % palette.length]),
          borderColor: values.map((_, i) => borders[i % borders.length]),
          borderWidth: 1,
          hoverOffset: 8,
        },
      ],
    };
  }, [chartData.propertiesByType]);

  const pieOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        enabled: true,
      },
    },
    animation: {
      duration: 1200,
      easing: "easeOutQuart",
      animateRotate: true,
      animateScale: true,
    },
  };

  const totalInspections = stats.completedInspections + stats.pendingInspections;

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
      {/* Header + Search (buttons removed per spec) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">Overview of your property inspections and activities</p>
        </div>

        {/* Search bar */}
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
      </div>

      {/* Trial card (unchanged) */}
      {!isTrialExpired && company?.subscription_status === "trialing" && (
        <div className="mb-8 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-primary-900">Free Trial Active</h3>
                <p className="text-primary-700">
                  {trialDaysRemaining} days remaining • Ends{" "}
                  {company?.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : "soon"}
                </p>
              </div>
            </div>
            <Button onClick={handleUpgradeClick} className="bg-primary-600 hover:bg-primary-700">
              Upgrade Now
            </Button>
          </div>
        </div>
      )}

      {/* Usage statistics (ONLY 4 cards) */}
      <div className="border-b border-gray-200 pb-8 mb-10">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Properties</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">
                        {stats.properties} / {tierLimits.properties === Infinity ? "∞" : tierLimits.properties}
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Flagged Items</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">{stats.issuesDetected}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Inspections (Total = Completed + Pending) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <Timer className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Inspections</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">{totalInspections}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Analytics (ONLY 2 pies) */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary-600" />
              Storage
            </h3>
            {usedBytes > 0 || limitBytes > 0 ? (
              <div className="w-full max-w-[360px] mx-auto">
                <Pie
                  data={storagePieData}
                  options={{
                    ...pieOptions,
                    plugins: {
                      ...pieOptions.plugins,
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
                      {" "}
                      • Free: {Math.round(freeMB)} MB • Total: {Math.round(limitMB)} MB
                    </>
                  ) : null}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <PieChartIcon className="h-12 w-12 mb-3" />
                <p className="text-sm">No storage data available</p>
                <p className="text-xs">Once storage is used, it will appear here</p>
              </div>
            )}
          </div>

          {/* Property Portfolio */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-base font-medium text-gray-900 mb-3 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary-600" />
              Property Portfolio ({stats.properties} total)
            </h3>
            {hasPropertiesData ? (
              <div className="w-full max-w-[360px] mx-auto">
                <Pie
                  data={portfolioPieData}
                  options={{
                    ...pieOptions,
                    plugins: {
                      ...pieOptions.plugins,
                      tooltip: {
                        callbacks: {
                          label: function (context) {
                            const label = context.label || "";
                            const value = context.parsed as number;
                            const total = (context.dataset.data as number[]).reduce(
                              (a, b) => a + b,
                              0
                            );
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
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
