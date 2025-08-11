import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X, 
  Save, 
  Clock, 
  User, 
  Building2, 
  Camera,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getInspectionDetails, updateInspectionStatus } from '../../lib/inspections';
import { getTemplate } from '../../lib/templates';
import { generateInspectionReport } from '../../lib/reports';
import InspectionItemRenderer from '../../components/inspections/InspectionItemRenderer';
import { toast } from 'sonner';

const InspectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // State management
  const [inspection, setInspection] = useState<any>(null);
  const [inspectionItems, setInspectionItems] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      loadInspectionData(id);
    }
  }, [id]);

  // Timer effect
  useEffect(() => {
    if (inspection?.start_time && inspection?.status === 'in_progress') {
      const startTime = new Date(inspection.start_time).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };
      
      updateTimer(); // Initial update
      timerRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [inspection]);

  const loadInspectionData = async (inspectionId: string) => {
    try {
      setLoading(true);
      
      const inspectionData = await getInspectionDetails(inspectionId);
      if (!inspectionData) {
        toast.error('Inspection not found');
        navigate('/dashboard/properties');
        return;
      }

      setInspection(inspectionData.inspection);
      setInspectionItems(inspectionData.items);

      // Group items by template and load template details
      const templateIds = [...new Set(inspectionData.items.map(item => item.template_items?.template_id).filter(Boolean))];
      const templateData = [];

      for (const templateId of templateIds) {
        try {
          const template = await getTemplate(templateId);
          if (template) {
            const templateItems = inspectionData.items.filter(
              item => item.template_items?.template_id === templateId
            );
            templateData.push({
              ...template.template,
              items: templateItems
            });
          }
        } catch (error) {
          console.error(`Error loading template ${templateId}:`, error);
        }
      }

      setTemplates(templateData);
    } catch (error: any) {
      console.error('Error loading inspection data:', error);
      toast.error('Failed to load inspection data');
      navigate('/dashboard/properties');
    } finally {
      setLoading(false);
    }
  };

  const handleItemUpdate = (itemId: string, updates: any) => {
    setInspectionItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  };

  const handleSaveProgress = async () => {
    try {
      setSaving(true);
      toast.success('Progress saved successfully');
    } catch (error: any) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteInspection = async () => {
    if (!inspection) return;

    try {
      setCompleting(true);
      
      // Calculate duration
      const startTime = new Date(inspection.start_time).getTime();
      const endTime = new Date().getTime();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      // Generate PDF report
      const reportUrl = await generateInspectionReport(inspection.id);
      
      // Update inspection status
      await updateInspectionStatus(
        inspection.id,
        'completed',
        undefined, // Primary contact signature (to be implemented)
        undefined, // Inspector signature (to be implemented)
        new Date().toISOString(),
        durationSeconds
      );

      toast.success('Inspection completed successfully');
      navigate('/dashboard/properties');
    } catch (error: any) {
      console.error('Error completing inspection:', error);
      toast.error('Failed to complete inspection');
    } finally {
      setCompleting(false);
    }
  };

  const handleCancelInspection = async () => {
    if (!inspection) return;

    if (window.confirm('Are you sure you want to cancel this inspection? All progress will be lost.')) {
      try {
        const { deleteInspection } = await import('../../lib/inspections');
        const success = await deleteInspection(inspection.id);
        
        if (success) {
          toast.success('Inspection cancelled');
          navigate('/dashboard/properties');
        }
      } catch (error: any) {
        console.error('Error cancelling inspection:', error);
        toast.error('Failed to cancel inspection');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentTemplate = () => templates[currentTemplateIndex];
  const getCurrentItem = () => getCurrentTemplate()?.items[currentItemIndex];
  
  const canGoNext = () => {
    const currentTemplate = getCurrentTemplate();
    if (!currentTemplate) return false;
    
    if (currentItemIndex < currentTemplate.items.length - 1) {
      return true; // More items in current template
    }
    
    return currentTemplateIndex < templates.length - 1; // More templates
  };

  const canGoPrevious = () => {
    return currentTemplateIndex > 0 || currentItemIndex > 0;
  };

  const handleNext = () => {
    const currentTemplate = getCurrentTemplate();
    if (!currentTemplate) return;
    
    if (currentItemIndex < currentTemplate.items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else if (currentTemplateIndex < templates.length - 1) {
      setCurrentTemplateIndex(currentTemplateIndex + 1);
      setCurrentItemIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    } else if (currentTemplateIndex > 0) {
      setCurrentTemplateIndex(currentTemplateIndex - 1);
      const prevTemplate = templates[currentTemplateIndex - 1];
      setCurrentItemIndex(prevTemplate.items.length - 1);
    }
  };

  const isLastItem = () => {
    return currentTemplateIndex === templates.length - 1 && 
           currentItemIndex === getCurrentTemplate()?.items.length - 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inspection...</p>
        </div>
      </div>
    );
  }

  if (!inspection || templates.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Inspection Not Found</h2>
          <p className="text-gray-600 mb-6">The inspection you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/dashboard/properties')}>
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  const currentTemplate = getCurrentTemplate();
  const currentItem = getCurrentItem();
  const progress = templates.length > 0 ? 
    ((currentTemplateIndex * (currentTemplate?.items.length || 1) + currentItemIndex + 1) / 
     templates.reduce((total, template) => total + template.items.length, 0)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                leftIcon={<ArrowLeft size={16} />}
                onClick={handleCancelInspection}
                className="mr-4"
              >
                Cancel
              </Button>
              <div className="flex items-center">
                <Building2 className="h-6 w-6 text-primary-600 mr-2" />
                <span className="text-lg font-semibold text-gray-900">Inspection</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Timer */}
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
              
              {/* Save Progress */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveProgress}
                isLoading={saving}
                leftIcon={<Save size={16} />}
              >
                Save Progress
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="pb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Inspection Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Inspector</h3>
              <p className="text-lg font-semibold text-gray-900">{inspection.inspector_name || 'Unknown'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Contact</h3>
              <p className="text-lg font-semibold text-gray-900">{inspection.primary_contact_name || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Type</h3>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {inspection.inspection_type?.replace('_', '-')}
              </p>
            </div>
          </div>
        </div>

        {/* Current Template Section */}
        {currentTemplate && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{currentTemplate.name}</h2>
                  {currentTemplate.description && (
                    <p className="text-sm text-gray-600 mt-1">{currentTemplate.description}</p>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Template {currentTemplateIndex + 1} of {templates.length}
                </div>
              </div>
            </div>

            {/* Current Item */}
            {currentItem && (
              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      Item {currentItemIndex + 1} of {currentTemplate.items.length}
                    </h3>
                    {currentItem.template_items?.required && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                  </div>
                </div>

                <InspectionItemRenderer
                  item={currentItem}
                  inspectionId={inspection.id}
                  onUpdate={handleItemUpdate}
                />
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={!canGoPrevious()}
              leftIcon={<ChevronLeft size={16} />}
            >
              Previous
            </Button>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {currentTemplateIndex + 1}.{currentItemIndex + 1}
              </span>
            </div>

            {isLastItem() ? (
              <Button
                onClick={handleCompleteInspection}
                isLoading={completing}
                leftIcon={<Check size={16} />}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete Inspection
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canGoNext()}
                rightIcon={<ChevronRight size={16} />}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionPage;