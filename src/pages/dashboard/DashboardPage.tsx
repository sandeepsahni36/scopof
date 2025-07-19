import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, AlertTriangle, Clock, CreditCard, Calendar, Plus, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { TIER_LIMITS } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

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
  
  // Real data state (starts empty for new users)
  const [stats, setStats] = useState({
    properties: 0,
    completedInspections: 0,
    pendingInspections: 0,
    issuesDetected: 0,
  });
  
  // Real activities data (starts empty for new users)
  const [activities, setActivities] = useState<any[]>([]);
  
  // Load real data from database
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // TODO: Replace with actual API calls to fetch user's real data
        // For now, keeping empty state for new users
        
        // Example of what the API calls would look like:
        // const propertiesResponse = await supabase.from('properties').select('*');
        // const inspectionsResponse = await supabase.from('inspections').select('*');
        // const activitiesResponse = await supabase.from('activities').select('*');
        
        // setStats({
        //   properties: propertiesResponse.data?.length || 0,
        //   completedInspections: inspectionsResponse.data?.filter(i => i.status === 'completed').length || 0,
        //   pendingInspections: inspectionsResponse.data?.filter(i => i.status === 'pending').length || 0,
        //   issuesDetected: inspectionsResponse.data?.filter(i => i.issues_count > 0).length || 0,
        // });
        
        // setActivities(activitiesResponse.data || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadDashboardData();
  }, []);
  
  // Chart data - only show if there's actual data
  const hasInspectionData = stats.completedInspections > 0;
  const hasIssueData = stats.issuesDetected > 0;
  
  const inspectionChartData = {
    labels: ['January', 'February', 'March', 'April'],
    datasets: [
      {
        label: 'Check-in Inspections',
        data: [0, 0, 0, 0], // Empty data for new users
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Check-out Inspections',
        data: [0, 0, 0, 0], // Empty data for new users
        backgroundColor: 'rgba(249, 115, 22, 0.5)',
        borderColor: 'rgba(249, 115, 22, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const issueChartData = {
    labels: ['Damage', 'Missing Items', 'Cleanliness', 'Maintenance'],
    datasets: [
      {
        label: 'Issues by Type',
        data: [0, 0, 0, 0], // Empty data for new users
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
  const hasAnyData = stats.properties > 0 || stats.completedInspections > 0 || activities.length > 0;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="border-b border-gray-200 pb-8 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Link to="/dashboard/properties" className="font-medium text-primary-600 hover:text-primary-500">
                  {stats.pendingInspections === 0 ? 'Schedule inspection' : 'View pending'}
                </Link>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Issues Detected</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{stats.issuesDetected}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to="/dashboard/reports" className="font-medium text-primary-600 hover:text-primary-500">
                  {stats.issuesDetected === 0 ? 'No issues found' : 'View issues'}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Chart section - only show if there's data */}
      {hasAnyData ? (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">Inspection Activity</h3>
              {hasInspectionData ? (
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
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">Issue Types</h3>
              {hasIssueData ? (
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
                  <p className="text-sm">No issues detected</p>
                  <p className="text-xs">Issues will appear here when found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty state for new users */
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
                    Add Your First Property
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent activity */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {activities.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary-600 truncate">
                        {activity.type === 'inspection_completed' && 'Inspection completed'}
                        {activity.type === 'damage_detected' && 'Damage detected'}
                        {activity.type === 'inspection_started' && 'Inspection started'}
                        {activity.type === 'template_created' && 'Template created'}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {activity.property && (
                            <>
                              <Building2 className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                              {activity.property}
                            </>
                          )}
                          {activity.template && (
                            <>
                              <Building2 className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                              {activity.template}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>by {activity.user}</p>
                      </div>
                    </div>
                    {activity.details && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">{activity.details}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <Clock className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No activity yet</h3>
              <p className="mt-2 text-base text-gray-500">
                Your recent activities will appear here as you use the platform.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick links */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary-50 rounded-lg p-6 border border-primary-100">
            <h3 className="text-base font-medium text-primary-800 mb-2">Add a New Property</h3>
            <p className="text-sm text-primary-600 mb-4">
              Create a new property and set up its inspection templates.
            </p>
            <Link to="/dashboard/properties">
              <Button size="sm">
                Add Property
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
              Access all inspection reports and download as PDF.
            </p>
            <Link to="/dashboard/reports">
              <Button 
                size="sm"
                className="bg-accent-600 hover:bg-accent-700 focus-visible:ring-accent-500"
              >
                View Reports
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;