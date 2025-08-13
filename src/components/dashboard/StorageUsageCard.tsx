import React, { useState, useEffect } from 'react';
import { HardDrive, AlertTriangle, CheckCircle, Gauge } from 'lucide-react';
import { getStorageUsage, formatBytes, getUsagePercentage, StorageUsage } from '../../lib/storage';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const StorageUsageCard = () => {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStorageUsage();
  }, []);

  const loadStorageUsage = async () => {
    try {
      setLoading(true);
      const usageData = await getStorageUsage();
      if (usageData) {
        setUsage(usageData);
      }
    } catch (error: any) {
      console.error('Error loading storage usage:', error);
      toast.error('Failed to load storage usage');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    navigate('/dashboard/admin/subscription');
  };

  if (loading) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gray-100 rounded-md p-3 animate-pulse">
              <HardDrive className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Storage Usage</dt>
                <dd>
                  <div className="text-sm text-red-600">Failed to load</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const usagePercentage = getUsagePercentage(usage.currentUsage, usage.quota);
  const isNearLimit = usagePercentage >= 80;
  const isOverLimit = usagePercentage >= 100;
  
  // Gauge chart data for visual representation
  const gaugeData = [
    { name: 'Used', value: usagePercentage, color: isOverLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : '#22C55E' },
    { name: 'Available', value: 100 - usagePercentage, color: '#E5E7EB' }
  ];

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${
            isOverLimit 
              ? 'bg-red-100' 
              : isNearLimit 
                ? 'bg-amber-100' 
                : 'bg-green-100'
          }`}>
            {isOverLimit ? (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            ) : isNearLimit ? (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            ) : (
              <Gauge className="h-6 w-6 text-green-600" />
            )}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Storage Usage</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {formatBytes(usage.currentUsage)} / {formatBytes(usage.quota)}
                </div>
                <div className="text-sm text-gray-500">
                  {usage.fileCount} files • {usage.tier} plan
                </div>
              </dd>
            </dl>
          </div>
        </div>
        
        {/* Enhanced Gauge Chart */}
        <div className="mt-4 flex items-center">
          <div className="w-20 h-20 mr-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={25}
                  outerRadius={35}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {gaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center -mt-8">
              <span className={`text-lg font-bold ${
                isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-green-600'
              }`}>
                {usagePercentage}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Photos:</span>
                <span className="ml-1 font-medium">{formatBytes(usage.photosUsage)}</span>
              </div>
              <div>
                <span className="text-gray-500">Reports:</span>
                <span className="ml-1 font-medium">{formatBytes(usage.reportsUsage)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning/Action */}
        {isNearLimit && (
          <div className="mt-4">
            <div className={`rounded-md p-3 ${
              isOverLimit ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className={`h-4 w-4 ${
                    isOverLimit ? 'text-red-400' : 'text-amber-400'
                  }`} />
                </div>
                <div className="ml-2 flex-1">
                  <p className={`text-xs font-medium ${
                    isOverLimit ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {isOverLimit ? 'Storage Limit Exceeded' : 'Storage Nearly Full'}
                  </p>
                  <p className={`text-xs mt-1 ${
                    isOverLimit ? 'text-red-700' : 'text-amber-700'
                  }`}>
                    {isOverLimit 
                      ? 'Upgrade your plan to continue uploading files'
                      : 'Consider upgrading to avoid interruptions'
                    }
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 text-xs h-6"
                    onClick={handleUpgradeClick}
                  >
                    Upgrade Plan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageUsageCard;