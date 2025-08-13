import React, { useState, useEffect } from 'react';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
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
import { Building2, CheckCircle2, AlertTriangle, Clock, CreditCard, Calendar, Plus, BarChart3, Timer, TrendingUp, PieChart } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { TIER_LIMITS } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { checkPropertyLimit } from '../../lib/properties';
import { supabase, devModeEnabled } from '../../lib/supabase';
import StorageUsageCard from '../../components/dashboard/StorageUsageCard';

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
  const { company, hasActiveSubscription, isTrialExpired, requiresPayment } = useAuthStore();
  const navigate = useNavigate();
  
  // Dashboard data state
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    pendingInspections: 0,
    issuesDetected: 0,
    averageInspectionDuration: 0,
  });
  
  // Chart data state
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
  
  // Load dashboard data from database
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
          'Needs Repair': 0,
          'Poor': 0,
          'Damaged': 0,
          'Missing': 0,
        };
        let propertiesByType = {} as Record<string, number>;
        let topPropertiesByInspections = [] as Array<{ name: string; count: number }>;
        let averageInspectionDuration = 0;
        
        // Get inspection counts (skip in dev mode to avoid errors)
        if (!devModeEnabled()) {
          const [completedResponse, pendingResponse, issuesResponse, inspectionTypesResponse] = await Promise.all([
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
            supabase
              .from('inspections')
              .select('inspection_type')
              .eq('status', 'completed')
          ]);
          
          completedInspections = completedResponse.count || 0;
          pendingInspections = pendingResponse.count || 0;
          issuesDetected = issuesResponse.count || 0;
          
          // Process inspection types for chart
          if (inspectionTypesResponse.data) {
            inspectionTypesResponse.data.forEach((inspection: any) => {
              const type = inspection.inspection_type;
              if (type && inspectionsByType.hasOwnProperty(type)) {
                inspectionsByType[type]++;
              }
            });
          }
          
          // Get issue breakdown by value (items marked for report with specific values)
          const { data: issueItems, error: issueItemsError } = await supabase
            .from('inspection_items')
            .select('value')
            .eq('marked_for_report', true)
            .not('value', 'is', null);
          
          if (!issueItemsError && issueItems) {
            issueItems.forEach((item: any) => {
              const value = item.value;
              if (typeof value === 'string') {
                // Check if the value indicates an issue
                if (value.toLowerCase().includes('repair') || value.toLowerCase().includes('needs repair')) {
                  issuesByValue['Needs Repair']++;
                } else if (value.toLowerCase().includes('poor') || value.toLowerCase().includes('bad')) {
                  issuesByValue['Poor']++;
                } else if (value.toLowerCase().includes('damaged') || value.toLowerCase().includes('damage')) {
                  issuesByValue['Damaged']++;
                } else if (value.toLowerCase().includes('missing') || value.toLowerCase().includes('absent')) {
                  issuesByValue['Missing']++;
                }
              } else if (Array.isArray(value)) {
                // Handle multiple choice values
                value.forEach((v: string) => {
                  if (typeof v === 'string') {
                    if (v.toLowerCase().includes('repair') || v.toLowerCase().includes('needs repair')) {
                      issuesByValue['Needs Repair']++;
                    } else if (v.toLowerCase().includes('poor') || v.toLowerCase().includes('bad')) {
                      issuesByValue['Poor']++;
                    } else if (v.toLowerCase().includes('damaged') || v.toLowerCase().includes('damage')) {
                      issuesByValue['Damaged']++;
                    } else if (v.toLowerCase().includes('missing') || v.toLowerCase().includes('absent')) {
                      issuesByValue['Missing']++;
                    }
                  }
                });
              }
            });
          }
          
          // Get properties by type for pie chart
          const { data: propertiesResponse, error: propertiesError } = await supabase
            .from('properties')
            .select('type');
          
          // Process properties by type for pie chart
          if (!propertiesError && propertiesResponse) {
            propertiesResponse.forEach((property: any) => {
              const type = property.type;
              if (type) {
                propertiesByType[type] = (propertiesByType[type] || 0) + 1;
              }
            });
          }
          
          // Get average inspection duration
          const { data: durationData, error: durationError } = await supabase
            .from('inspections')
            .select('duration_seconds')
            .eq('status', 'completed')
            .not('duration_seconds', 'is', null);
          
          if (!durationError && durationData && durationData.length > 0) {
            const totalDuration = durationData.reduce((sum, inspection) => sum + (inspection.duration_seconds || 0), 0);
            averageInspectionDuration = Math.round(totalDuration / durationData.length / 60); // Convert to minutes
          }
          
          // Get top 5 properties by inspection count (last 30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: topPropertiesData, error: topPropertiesError } = await supabase
            .from('inspections')
            .select(`
              property_id,
              properties (
                name
              )
            `)
            .eq('status', 'completed')
            .gte('created_at', thirtyDaysAgo);
          
          if (!topPropertiesError && topPropertiesData) {
            const propertyInspectionCounts = {} as Record<string, number>;
            topPropertiesData.forEach((inspection: any) => {
              const propertyName = inspection.properties?.name || 'Unknown Property';
              propertyInspectionCounts[propertyName] = (propertyInspectionCounts[propertyName] || 0) + 1;
            });
            
            topPropertiesByInspections = Object.entries(propertyInspectionCounts)
              .map(([name, count]) => ({ name, count: count as number }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
          }
        } else {
          // Dev mode - use mock data for charts
          completedInspections = 8;
          pendingInspections = 3;
          issuesDetected = 5;
          averageInspectionDuration = 42; // 42 minutes
          inspectionsByType = {
            check_in: 4,
            check_out: 4,
            move_in: 0,
            move_out: 0,
          };
          issuesByValue = {
            'Needs Repair': 2,
            'Poor': 1,
            'Damaged': 1,
            'Missing': 1,
          };
          propertiesByType = {
            'apartment': 2,
            'villa': 1,
            'condo': 0,
          };
          topPropertiesByInspections = [
            { name: 'Oceanview Apartment 2B', count: 3 },
            { name: 'Downtown Loft 5A', count: 2 },
            { name: 'Mountain View Villa', count: 1 },
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
        console.error('Error loading dashboard data:', error);
        // Set fallback values on error
        setStats({
          properties: 0,
          completedInspections: 0,
          pendingInspections: 0,
          issuesDetected: 0,
          averageInspectionDuration: 0,
        });
        setChartData({
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
          propertiesByType: {},
          topPropertiesByInspections: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);
  
  // Chart data
  const hasInspectionData = stats.completedInspections > 0 || stats.pendingInspections > 0;
  const hasIssueData = stats.issuesDetected > 0;
  const hasPropertiesData = Object.keys(chartData.propertiesByType).length > 0;
  const hasTopPropertiesData = chartData.topPropertiesByInspections.length > 0;
  
  // Calculate total inspections by type for chart
  const totalInspectionsByType = Object.values(chartData.inspectionsByType).reduce((sum, count) => sum + count, 0);
  const totalIssuesByValue = Object.values(chartData.issuesByValue).reduce((sum, count) => sum + count, 0);
  const totalPropertiesByType = Object.values(chartData.propertiesByType).reduce((sum, count) => sum + count, 0);
  
  const inspectionChartData = {
    labels: ['Check-In', 'Check-Out', 'Move-In', 'Move-Out'],
    datasets: [
      {
        label: 'Completed Inspections',
        data: [
          chartData.inspectionsByType.check_in,
          chartData.inspectionsByType.check_out,
          chartData.inspectionsByType.move_in,
          chartData.inspectionsByType.move_out,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const issueChartData = {
    labels: ['Needs Repair', 'Poor Condition', 'Damaged', 'Missing Items'],
    datasets: [
      {
        label: 'Issues by Type',
        data: [
          chartData.issuesByValue['Needs Repair'],
          chartData.issuesByValue['Poor'],
          chartData.issuesByValue['Damaged'],
          chartData.issuesByValue['Missing'],
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',
          'rgba(249, 115, 22, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Properties by type pie chart data
  const propertyTypeColors = ['#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777'];
  const propertiesPieData = Object.entries(chartData.propertiesByType).map(([type, count], index) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
    value: count,
    color: propertyTypeColors[index % propertyTypeColors.length],
  }));
  
  // Top properties bar chart data
  const topPropertiesChartData = {
    labels: chartData.topPropertiesByInspections.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
    datasets: [
      {
        label: 'Completed Inspections',
        data: chartData.topPropertiesByInspections.map(p => p.count),
        backgroundColor: 'rgba(37, 99, 235, 0.6)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // Format average inspection duration
  const formatDuration = (minutes: number) => {
    if (minutes === 0) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };
  
  const tierLimits = TIER_LIMITS[company?.tier || 'starter'];

  // Calculate trial days remaining
  const trialDaysRemaining = company?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(company.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleUpgradeClick = () => {
    if (requiresPayment) {
      navigate('/subscription-required');
    } else {
      navigate('/dashboard/admin/subscription');
    }
  };

  // Check if user has any data
  const hasAnyData = stats.properties > 0 || stats.completedInspections > 0;
  
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Overview of your property inspections and activities
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <Link to="/dashboard/properties">
            <Button
              size="sm"
              leftIcon={<Building2 size={16} />}
            >
              Manage Properties
            </Button>
          </Link>
          <Link to="/dashboard/reports">
            <Button
              variant="outline"
              size="sm"
            >
              View Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Subscription Status Alert */}
      {(isTrialExpired || (!hasActiveSubscription && trialDaysRemaining <= 7)) && (
        <div className={`mb-8 rounded-lg border p-4 ${
          isTrialExpired 
            ? 'bg-red-50 border-red-200' 
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {isTrialExpired ? (
                <AlertTriangle className="h-5 w-5 text-red-400" />
              ) : (
                <Clock className="h-5 w-5 text-amber-400" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                isTrialExpired ? 'text-red-800' : 'text-amber-800'
              }`}>
                {isTrialExpired 
                  ? 'Trial Period Expired' 
                  : `Trial Ending Soon - ${trialDaysRemaining} days remaining`
                }
              </h3>
              <div className={`mt-2 text-sm ${
                isTrialExpired ? 'text-red-700' : 'text-amber-700'
              }`}>
                <p>
                  {isTrialExpired 
                    ? 'Your free trial has ended. Upgrade to a paid plan to continue using all features.'
                    : 'Your trial will end soon. Upgrade now to ensure uninterrupted access to your property management tools.'
                  }
                </p>
              </div>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={handleUpgradeClick}
                  leftIcon={<CreditCard size={16} />}
                >
                  {isTrialExpired ? 'Upgrade Now' : 'Upgrade to Premium'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trial Status Card */}
      {!isTrialExpired && !hasActiveSubscription && (
        <div className="mb-8 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-primary-900">
                  Free Trial Active
                </h3>
                <p className="text-primary-700">
                  {trialDaysRemaining} days remaining • Ends {company?.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : 'soon'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpgradeClick}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      )}
      
      {/* Usage statistics */}
      <div className="border-b border-gray-200 pb-8 mb-12">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
                      <div className="text-lg font-medium text-gray-900">
                        {stats.properties} / {tierLimits.properties === Infinity ? '∞' : tierLimits.properties}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to="/dashboard/properties" className="font-medium text-primary-600 hover:text-primary-500">
                  {stats.properties === 0 ? 'Add your first property' : 'View all properties'}
                </Link>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
                      <div className="text-lg font-medium text-gray-900">{stats.completedInspections}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to="/dashboard/reports" className="font-medium text-primary-600 hover:text-primary-500">
                  {stats.completedInspections === 0 ? 'Start your first inspection' : 'View all reports'}
                </Link>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Inspections</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{stats.pendingInspections}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-500">
                  {stats.pendingInspections === 0 ? 'No pending inspections' : 'In progress'}
                </span>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
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
                      <div className="text-lg font-medium text-gray-900">{stats.issuesDetected}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-500">
                  {stats.issuesDetected === 0 ? 'No issues detected' : 'Require attention'}
                </span>
              </div>
            </div>
          </motion.div>
          
          {/* Average Inspection Duration KPI */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <Timer className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg Duration</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{formatDuration(stats.averageInspectionDuration)}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-500">
                  {stats.averageInspectionDuration === 0 ? 'Complete inspections to see average' : 'Per inspection'}
                </span>
              </div>
            </div>
          </motion.div>
          
          {/* Storage Usage Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <StorageUsageCard />
          </motion.div>
        </div>
      </div>
      
      {/* Chart section - only show if there's data */}
      {(hasInspectionData || hasIssueData || hasPropertiesData || hasTopPropertiesData) ? (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Inspections by Type Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Inspections by Type ({stats.completedInspections} completed)
              </h3>
              {hasInspectionData && totalInspectionsByType > 0 ? (
                <Bar
                  data={inspectionChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <BarChart3 className="h-12 w-12 mb-4" />
                  <p className="text-sm">No inspection data yet</p>
                  <p className="text-xs">Complete some inspections to see analytics</p>
                </div>
              )}
            </div>
            
            {/* Properties by Type Pie Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Property Portfolio ({stats.properties} total)
              </h3>
              {hasPropertiesData && totalPropertiesByType > 0 ? (
                <Pie
                  data={{
                    labels: Object.keys(chartData.propertiesByType).map(type => 
                      type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
                    ),
                    datasets: [
                      {
                        data: Object.values(chartData.propertiesByType),
                        backgroundColor: [
                          'rgba(37, 99, 235, 0.7)',   // primary-600
                          'rgba(5, 150, 105, 0.7)',   // emerald-600
                          'rgba(220, 38, 38, 0.7)',   // red-600
                          'rgba(217, 119, 6, 0.7)',   // amber-600
                          'rgba(124, 58, 237, 0.7)',  // violet-600
                          'rgba(219, 39, 119, 0.7)',  // pink-600
                        ],
                        borderColor: [
                          'rgba(37, 99, 235, 1)',
                          'rgba(5, 150, 105, 1)',
                          'rgba(220, 38, 38, 1)',
                          'rgba(217, 119, 6, 1)',
                          'rgba(124, 58, 237, 1)',
                          'rgba(219, 39, 119, 1)',
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <PieChart className="h-12 w-12 mb-4" />
                  <p className="text-sm">No properties yet</p>
                  <p className="text-xs">Add properties to see portfolio breakdown</p>
                </div>
              )}
            </div>
            
            {/* Flagged Items Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Flagged Items ({stats.issuesDetected} total)
              </h3>
              {hasIssueData && totalIssuesByValue > 0 ? (
                <Pie
                  data={issueChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mb-4" />
                  <p className="text-sm">No flagged items</p>
                  <p className="text-xs">Items marked for report will appear here</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Top Properties by Inspections Chart */}
          {hasTopPropertiesData && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Most Active Properties (Last 30 Days)
              </h3>
              <Bar
                data={topPropertiesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  indexAxis: 'y' as const,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>
      ) : (
        // Empty state for new users
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>
          <div className="bg-white rounded-lg shadow p-12">
            <div className="text-center">
              <BarChart3 className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No data yet</h3>
              <p className="mt-2 text-base text-gray-500">
                Start by adding properties and completing inspections to see your analytics.
              </p>
              <div className="mt-6">
                <Link to="/dashboard/properties">
                  <Button leftIcon={<Plus size={16} />}>
                    {stats.properties === 0 ? 'Add Your First Property' : 'Manage Properties'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick links */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary-50 rounded-lg p-6 border border-primary-100">
            <h3 className="text-base font-medium text-primary-800 mb-2">
              {stats.properties === 0 ? 'Add Your First Property' : 'Add a New Property'}
            </h3>
            <p className="text-sm text-primary-600 mb-4">
              {stats.properties === 0 
                ? 'Get started by creating your first property and setting up inspection templates.'
                : 'Create a new property and set up its inspection templates.'
              }
            </p>
            <Link to="/dashboard/properties">
              <Button size="sm">
                {stats.properties === 0 ? 'Add First Property' : 'Add Property'}
              </Button>
            </Link>
          </div>
          
          <div className="bg-secondary-50 rounded-lg p-6 border border-secondary-100">
            <h3 className="text-base font-medium text-secondary-800 mb-2">Create Template</h3>
            <p className="text-sm text-secondary-600 mb-4">
              Create reusable inspection templates for different room types.
            </p>
            <Link to="/dashboard/templates">
              <Button 
                size="sm"
                className="bg-secondary-600 hover:bg-secondary-700 focus-visible:ring-secondary-500"
              >
                Create Template
              </Button>
            </Link>
          </div>
          
          <div className="bg-accent-50 rounded-lg p-6 border border-accent-100">
            <h3 className="text-base font-medium text-accent-800 mb-2">View Reports</h3>
            <p className="text-sm text-accent-600 mb-4">
              {stats.completedInspections === 0 
                ? 'Complete inspections to generate and view reports.'
                : 'Access all inspection reports and download as PDF.'
              }
            </p>
            <Link to="/dashboard/reports">
              <Button 
                size="sm"
                className="bg-accent-600 hover:bg-accent-700 focus-visible:ring-accent-500"
              >
                {stats.completedInspections === 0 ? 'No Reports Yet' : 'View Reports'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;