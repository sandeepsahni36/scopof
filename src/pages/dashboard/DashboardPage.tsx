import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

// Register minimal ChartJS pie dependencies
ChartJS.register(ArcElement, Tooltip, Legend);

// ——— Example numbers (replace with your real values later) ———
const STATS = {
  properties: 120,
  completed: 85,
  flagged: 12,
  storageUsedPct: 65,
};

// Pie: Storage (Used vs Free)
const storageData = {
  labels: ['Used', 'Free'],
  datasets: [
    {
      data: [STATS.storageUsedPct, 100 - STATS.storageUsedPct],
      backgroundColor: ['#2563eb', '#93c5fd'],
      borderColor: ['#2563eb', '#93c5fd'],
      borderWidth: 1,
    },
  ],
};

// Pie: Property Portfolio
const portfolioData = {
  labels: ['Apartments', 'Villas', 'Townhouses'],
  datasets: [
    {
      data: [60, 25, 15],
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
      borderColor: ['#22c55e', '#f59e0b', '#ef4444'],
      borderWidth: 1,
    },
  ],
};

const pieOpts = {
  responsive: true,
  maintainAspectRatio: false as const,
  plugins: {
    legend: { position: 'bottom' as const },
  },
};

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Search */}
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Search properties, inspections..."
          className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-500">Properties</div>
          <div className="mt-1 text-2xl font-bold">{STATS.properties}</div>
        </div>

        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-500">Completed Inspections</div>
          <div className="mt-1 text-2xl font-bold">{STATS.completed}</div>
        </div>

        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-500">Flagged Items</div>
          <div className="mt-1 text-2xl font-bold">{STATS.flagged}</div>
        </div>

        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
          <div className="text-sm text-gray-500">Storage</div>
          <div className="mt-1 text-2xl font-bold">{STATS.storageUsedPct}% Used</div>
        </div>
      </div>

      {/* Two Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Storage Usage</div>
          <div className="h-64">
            <Pie data={storageData} options={pieOpts} />
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Property Portfolio</div>
          <div className="h-64">
            <Pie data={portfolioData} options={pieOpts} />
          </div>
        </div>
      </div>
    </div>
  );
}
