import React, { useState, useEffect } from 'react';
import { HardDrive, AlertTriangle, CheckCircle, TrendingUp, Upload, FileText, Camera } from 'lucide-react';
import { Button } from '../ui/Button';
import { getStorageUsage, formatBytes, getStorageRecommendation, StorageUsage } from '../../lib/storage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface StorageUsageIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

const StorageUsageIndicator: React.FC<StorageUsageIndicatorProps> = ({ 
  showDetails = true, 
  className = '' 
}) => {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStorageUsage();
  }, []);

  const loadStorageUsage = async () => {
    try {
      setLoading(true);
      const storageData = await getStorageUsage();
      setUsage(storageData);
    } catch (error: any) {
      console.error('Error loading storage usage:', error);
      toast.error('Failed to load storage usage');
    } finally {
      setLoading(false);
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 80) return 'bg-amber-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 95) return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (percentage >= 80) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const handleUpgrade = () => {
    navigate('/dashboard/admin/subscription');
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="mt-3 h-2 bg-gray-200 rounded"></div>
          <div className="mt-2 h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center space-x-3 text-gray-500">
          <HardDrive className="h-5 w-5" />
          <span className="text-sm">Storage data unavailable</span>
        </div>
      </div>
    );
  }

  const recommendation = getStorageRecommendation(usage);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <HardDrive className="h-6 w-6 text-gray-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Storage Usage</h3>
            <p className="text-sm text-gray-500 capitalize">{usage.tier} Plan</p>
          </div>
        </div>
        {getStatusIcon(usage.usagePercentage)}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {formatBytes(usage.totalBytes)} of {formatBytes(usage.quotaBytes)} used
          </span>
          <span className="text-sm font-medium text-gray-900">
            {usage.usagePercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(usage.usagePercentage)}`}
            style={{ width: `${Math.min(usage.usagePercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Storage Breakdown */}
      {showDetails && (
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Camera className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">Photos</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatBytes(usage.photosBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-gray-600">Reports</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatBytes(usage.reportsBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Upload className="h-4 w-4 text-purple-500" />
              <span className="text-gray-600">Total Files</span>
            </div>
            <span className="font-medium text-gray-900">
              {usage.fileCount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Recommendation Alert */}
      {recommendation.urgency !== 'low' && (
        <div className={`rounded-lg p-3 mb-4 ${
          recommendation.urgency === 'high' 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className={`h-4 w-4 ${
                recommendation.urgency === 'high' ? 'text-red-400' : 'text-amber-400'
              }`} />
            </div>
            <div className="ml-2">
              <h4 className={`text-sm font-medium ${
                recommendation.urgency === 'high' ? 'text-red-800' : 'text-amber-800'
              }`}>
                {recommendation.recommendation}
              </h4>
              <p className={`text-sm mt-1 ${
                recommendation.urgency === 'high' ? 'text-red-700' : 'text-amber-700'
              }`}>
                {recommendation.reasoning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {(usage.usagePercentage >= 80 || recommendation.urgency !== 'low') && (
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={handleUpgrade}
            leftIcon={<TrendingUp size={16} />}
            className="flex-1"
          >
            Upgrade Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStorageUsage}
            className="flex-1"
          >
            Refresh
          </Button>
        </div>
      )}

      {/* Storage Tips */}
      {showDetails && usage.usagePercentage >= 60 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Storage Tips</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Older files are automatically moved to cheaper storage tiers</li>
            <li>• Consider upgrading for more space and features</li>
            <li>• Delete unnecessary inspection photos to free up space</li>
            {usage.tier === 'starter' && (
              <li>• Professional plan includes 5GB storage (2.5x more space)</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StorageUsageIndicator;