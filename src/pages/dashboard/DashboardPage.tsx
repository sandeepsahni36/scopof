import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/Input";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// --- Example data (replace with real values as needed) ---
const stats = {
  properties: 120,
  completedInspections: 85,
  flaggedItems: 12,
  storageUsedPct: 65,
};

const storageData = [
  { name: "Used", value: stats.storageUsedPct },
  { name: "Free", value: 100 - stats.storageUsedPct },
];

const portfolioData = [
  { name: "Apartments", value: 60 },
  { name: "Villas", value: 25 },
  { name: "Townhouses", value: 15 },
];

// Tailwind-friendly brand-ish colors
const COLORS = ["#2563eb", "#93c5fd", "#22c55e", "#f59e0b", "#ef4444"];

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <Input
          type="text"
          placeholder="Search properties, inspections..."
          className="max-w-md rounded-xl"
        />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.properties}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Completed Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.completedInspections}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Flagged Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.flaggedItems}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.storageUsedPct}% Used</p>
          </CardContent>
        </Card>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Storage Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={storageData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {storageData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Property Portfolio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Property Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={portfolioData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {portfolioData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
