import React, { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, AlertTriangle, HardDrive, Search } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { TIER_LIMITS } from "../../types";
import { supabase, devModeEnabled } from "../../lib/supabase";

ChartJS.register(ArcElement, Tooltip, Legend);

const DashboardPage = () => {
  const { company, storageStatus } = useAuthStore();

  // --- counters ---
  const [properties, setProperties] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [flagged, setFlagged] = useState(0);

  // portfolio
  const [propertiesByType, setPropertiesByType] = useState<Record<string, number>>({});

  // storage (fallbacks keep TS happy even if store shape differs)
  const usedMB = (storageStatus as any)?.usedMB ?? 500;
  const limitMB = (storageStatus as any)?.limitMB ?? 5120; // 5 GB
  const freeMB = Math.max(limitMB - usedMB, 0);

  useEffect(() => {
    (async () => {
      if (devModeEnabled()) {
        setProperties(3);
        setCompleted(8);
        setFlagged(5);
        setPropertiesByType({ Apartment: 2, Villa: 1, Condo: 0 });
        return;
      }

      const [{ count: propsCount }, { count: compCount }, { count: flaggedCount }] =
        await Promise.all([
          supabase.from("properties").select("id", { count: "exact", head: true }),
          supabase.from("inspections").select("id", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("inspection_items").select("id", { count: "exact", head: true }).eq("marked_for_report", true),
        ]);

      setProperties(propsCount || 0);
      setCompleted(compCount || 0);
      setFlagged(flaggedCount || 0);

      const { data: types } = await supabase.from("properties").select("type");
      const grouped: Record<string, number> = {};
      (types || []).forEach((r: any) => {
        const key = String(r.type || "Unknown")
          .replace("_", " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
        grouped[key] = (grouped[key] || 0) + 1;
      });
      setPropertiesByType(grouped);
    })();
  }, []);

  const tierLimits = TIER_LIMITS[company?.tier || "starter"];

  // Pie: Storage
  const storagePie = {
    labels: ["Used", "Free"],
    datasets: [
      {
        data: [usedMB, freeMB],
        backgroundColor: ["#2f66ff", "#dfe7ff"],
        borderColor: ["#2f66ff", "#dfe7ff"],
        borderWidth: 1,
      },
    ],
  };

  // Pie: Property Portfolio
  const portfolioLabels = Object.keys(propertiesByType);
  const portfolioValues = Object.values(propertiesByType);
  const palette = ["#2f66ff", "#5f86ff", "#00b3a4", "#ff8a65", "#8e7dff", "#ff5f9f"];
  const portfolioPie = {
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

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header + Search */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your property inspections and activities</p>

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
      <div className="mb-10">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Usage Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Properties */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="ml-1">
                <p className="text-sm text-gray-500">Properties</p>
                <p className="text-xl font-semibold text-gray-900">
                  {properties} <span className="text-gray-400 text-base">/ {tierLimits.properties === Infinity ? "∞" : tierLimits.properties}</span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Completed Inspections */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="ml-1">
                <p className="text-sm text-gray-500">Completed Inspections</p>
                <p className="text-xl font-semibold text-gray-900">{completed}</p>
              </div>
            </div>
          </motion.div>

          {/* Flagged Items */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="ml-1">
                <p className="text-sm text-gray-500">Flagged Items</p>
                <p className="text-xl font-semibold text-gray-900">{flagged}</p>
              </div>
            </div>
          </motion.div>

          {/* Storage (summary numbers, detailed pie below) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
                <HardDrive className="w-6 h-6" />
              </div>
              <div className="ml-1">
                <p className="text-sm text-gray-500">Storage</p>
                <p className="text-xl font-semibold text-gray-900">
                  {Math.round(usedMB)} <span className="text-sm text-gray-400">/ {Math.round(limitMB)} MB</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Charts: Storage + Property Portfolio */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Storage</h3>
            <div className="h-60">
              <Pie
                data={storagePie}
                options={{
                  plugins: { legend: { position: "bottom" } },
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Property Portfolio</h3>
            {portfolioValues.length ? (
              <div className="h-60">
                <Pie
                  data={portfolioPie}
                  options={{
                    plugins: { legend: { position: "bottom" } },
                    maintainAspectRatio: false,
                    responsive: true,
                  }}
                />
              </div>
            ) : (
              <div className="h-60 grid place-items-center text-gray-500 text-sm">No properties yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
