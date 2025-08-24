import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Home, CheckSquare, Flag, Database } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation"; // import bottom nav

// Pie chart data
const storageData = [
  { name: "Used", value: 70 },
  { name: "Free", value: 30 },
];
const portfolioData = [
  { name: "Villas", value: 40 },
  { name: "Apartments", value: 60 },
];
const COLORS = ["#4F46E5", "#E5E7EB"];

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="p-4 bg-white shadow-sm">
        <Input placeholder="Search..." className="w-full" />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <Home className="h-6 w-6 text-indigo-600 mb-2" />
              <p className="text-sm font-medium">Properties</p>
              <p className="text-lg font-bold">120</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <CheckSquare className="h-6 w-6 text-green-600 mb-2" />
              <p className="text-sm font-medium">Completed</p>
              <p className="text-lg font-bold">85</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <Flag className="h-6 w-6 text-red-600 mb-2" />
              <p className="text-sm font-medium">Flagged</p>
              <p className="text-lg font-bold">15</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <Database className="h-6 w-6 text-yellow-600 mb-2" />
              <p className="text-sm font-medium">Storage</p>
              <p className="text-lg font-bold">75%</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-medium mb-2">Storage</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={storageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {storageData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-medium mb-2">Property Portfolio</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={portfolioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {portfolioData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
