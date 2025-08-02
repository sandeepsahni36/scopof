import React, { useState, useEffect } from 'react';
import { HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';
import { getStorageUsage, formatBytes, getUsagePercentage, StorageUsage } from '../../lib/storage';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
              <HardDrive className="h-6 w-6 text-green-600" />
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
        
        {/* Usage Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Usage</span>
            <span>{usagePercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isOverLimit 
                  ? 'bg-red-500' 
                  : isNearLimit 
                    ? 'bg-amber-500' 
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Photos:</span>
            <span className="ml-1 font-medium">{formatBytes(usage.photosUsage)}</span>
          </div>
          <div>
            <span className="text-gray-500">Reports:</span>
            <span className="ml-1 font-medium">{formatBytes(usage.reportsUsage)}</span>
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