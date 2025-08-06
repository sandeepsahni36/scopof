import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, Filter, Calendar, Building2, User, Eye, Loader2, UserCheck, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getReports } from '../../lib/reports';
import { getProperties } from '../../lib/properties';
import { getSignedUrlForFile, deleteFile } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Report {
  id: string;
  inspectionId: string;
  propertyName: string;
  inspectionType: 'check_in' | 'check_out';
  primaryContactName: string;
  inspectorName: string;
  reportUrl: string;
  fileKey: string;
  generatedAt: string;
  createdAt: string;
}

interface Filters {
  propertyId: string;
  inspectionType: string;
  dateFrom: string;
  dateTo: string;
}

const ReportsPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingReports, setDownloadingReports] = useState<Set<string>>(new Set());
  const [viewingReports, setViewingReports] = useState<Set<string>>(new Set());
  const [deletingReports, setDeletingReports] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    propertyId: 'all',
    inspectionType: 'all',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    loadReportsAndProperties();
  }, [filters]);

  const loadReportsAndProperties = async () => {
    try {
      setLoading(true);
      
      const [reportsData, propertiesData] = await Promise.all([
        getReports({
          propertyId: filters.propertyId !== 'all' ? filters.propertyId : undefined,
          inspectionType: filters.inspectionType !== 'all' ? filters.inspectionType : undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        }),
        getProperties()
      ]);

      if (reportsData) {
        setReports(reportsData);
      }
      
      if (propertiesData) {
        setProperties(propertiesData);
      }
    } catch (error: any) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (report: Report) => {
    if (!report.fileKey) {
      toast.error('Report file not available for download');
      return;
    }
    
    try {
      setDownloadingReports(prev => new Set(prev).add(report.id));
      
      // Get signed URL from storage API
      const signedUrl = await getSignedUrlForFile(report.fileKey);
      
      if (!signedUrl) {
        throw new Error('Failed to generate download URL');
      }
      
      // Create a temporary link to download the report
      const reportName = getReportName(report);
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = reportName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error: any) {
      console.error('Error downloading report:', error);
      toast.error(error.message || 'Failed to download report');
    } finally {
      setDownloadingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(report.id);
        return newSet;
      });
    }
  };

  const handleViewReport = async (report: Report) => {
    if (!report.fileKey) {
      toast.error('Report file not available for viewing');
      return;
    }
    
    try {
      setViewingReports(prev => new Set(prev).add(report.id));
      
      // Get signed URL from storage API
      const signedUrl = await getSignedUrlForFile(report.fileKey);
      
      if (!signedUrl) {
        throw new Error('Failed to generate view URL');
      }
      
      // Open in new window
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error('Error viewing report:', error);
      toast.error(error.message || 'Failed to view report');
    } finally {
      setViewingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(report.id);
        return newSet;
      });
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (!window.confirm(`Are you sure you want to delete this report? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingReports(prev => new Set(prev).add(report.id));
      
      // Delete the file from MinIO storage
      if (report.fileKey) {
        const fileDeleted = await deleteFile(report.fileKey);
        if (!fileDeleted) {
          throw new Error('Failed to delete file from storage');
        }
      }
      
      // Delete the report record from database
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', report.id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setReports(reports.filter(r => r.id !== report.id));
      toast.success('Report deleted successfully');
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast.error(error.message || 'Failed to delete report');
    } finally {
      setDeletingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(report.id);
        return newSet;
      });
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.primaryContactName && report.primaryContactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (report.inspectorName && report.inspectorName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const getReportName = (report: Report) => {
    const date = new Date(report.generatedAt).toISOString().split('T')[0];
    const time = new Date(report.generatedAt).toTimeString().split(' ')[0].replace(/:/g, '-');
    return `${report.propertyName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}_${time}.pdf`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inspection Reports</h1>
          <p className="mt-1 text-lg text-gray-500">
            View and download property inspection reports
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<Filter size={20} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by property name or contact name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="border-t border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  value={filters.propertyId}
                  onChange={(e) => setFilters({ ...filters, propertyId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="all">All Properties</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inspection Type
                </label>
                <select
                  value={filters.inspectionType}
                  onChange={(e) => setFilters({ ...filters, inspectionType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="all">All Types</option>
                  <option value="check_in">Check-In</option>
                  <option value="check_out">Check-Out</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading reports...</span>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property & Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            <Building2 className="h-4 w-4 text-gray-400 mr-1" />
                            {report.propertyName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-1" />
                            {report.primaryContactName || 'No contact name'}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <UserCheck className="h-3 w-3 text-gray-400 mr-1" />
                            Inspector: {report.inspectorName || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        report.inspectionType === 'check_in'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {report.inspectionType === 'check_in' ? 'Check-In' : 'Check-Out'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(report.generatedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={viewingReports.has(report.id)}
                          disabled={viewingReports.has(report.id) || downloadingReports.has(report.id) || deletingReports.has(report.id)}
                          leftIcon={<Eye size={16} />}
                          onClick={() => handleViewReport(report)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={downloadingReports.has(report.id)}
                          disabled={downloadingReports.has(report.id) || viewingReports.has(report.id) || deletingReports.has(report.id)}
                          leftIcon={<Download size={16} />}
                          onClick={() => handleDownloadReport(report)}
                        >
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={deletingReports.has(report.id)}
                          disabled={deletingReports.has(report.id) || viewingReports.has(report.id) || downloadingReports.has(report.id)}
                          leftIcon={<Trash2 size={16} />}
                          onClick={() => handleDeleteReport(report)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-center py-12">
            <FileText className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {searchTerm || filters.propertyId !== 'all' || filters.inspectionType !== 'all' || filters.dateFrom || filters.dateTo
                ? 'No reports found'
                : 'No reports yet'}
            </h3>
            <p className="mt-2 text-base text-gray-500">
              {searchTerm || filters.propertyId !== 'all' || filters.inspectionType !== 'all' || filters.dateFrom || filters.dateTo
                ? "Try adjusting your search or filters to find what you're looking for."
                : 'Reports will appear here after you complete property inspections.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;