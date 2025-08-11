import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, CheckCircle, Clock, User, UserCheck, Building2, Camera, Flag } from 'lucide-react';
import { validate as isValidUUID } from 'uuid';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getInspectionDetails, updateInspectionStatus } from '../../lib/inspections';
import { generateInspectionReport } from '../../lib/reports';
import { getProperty } from '../../lib/properties';
import { supabase } from '../../lib/supabase';
import InspectionItemRenderer from '../../components/inspections/InspectionItemRenderer';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';

interface DisplayStep {
  type: 'items';
  name: string;
  items: any[];
}

const InspectionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [displaySteps, setDisplaySteps] = useState<DisplayStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);
  const [clientPresent, setClientPresent] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('0:00');
  const [cancelling, setCancelling] = useState(false);
  
  // Signature refs
  const inspectorSignatureRef = useRef<SignatureCanvas>(null);
  const clientSignatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (id) {
      loadInspectionData(id);
    }
  }, [id]);

  // Timer effect
  useEffect(() => {
    if (!inspection?.start_time) return;

    const updateTimer = () => {
      const startTime = new Date(inspection.start_time);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      const hours = Math.floor(diffInSeconds / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      const seconds = diffInSeconds % 60;
      
      if (hours > 0) {
        setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    // Update immediately
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [inspection?.start_time]);

  const handleCancelInspection = async () => {
    if (!window.confirm('Are you sure you want to cancel this inspection? All progress will be lost and no data will be saved.')) {
      return;
    }

    try {
      setCancelling(true);
      
      // Delete the inspection and all associated data
      const { deleteInspection } = await import('../../lib/inspections');
      const success = await deleteInspection(inspection.id);
      
      if (success) {
        toast.success('Inspection cancelled successfully');
        navigate('/dashboard');
      } else {
        throw new Error('Failed to cancel inspection');
      }
    } catch (error: any) {
      console.error('Error cancelling inspection:', error);
      toast.error('Failed to cancel inspection');
    } finally {
      setCancelling(false);
    }
  };

  const loadInspectionData = async (inspectionId: string) => {
    try {
      setLoading(true);
      const data = await getInspectionDetails(inspectionId);
      
      if (!data) {
        toast.error('Inspection not found');
        navigate('/dashboard');
        return;
      }

      setInspection(data.inspection);
      setClientPresent(data.inspection.client_present_for_signature || false);

      // Load property data
      const propertyData = await getProperty(data.inspection.property_id);
      if (propertyData) {
        setProperty(propertyData);
      }

      // Build display steps from inspection items
      // Filter out items with invalid UUIDs
      const validItems = data.items.filter(item => {
        if (!item.id || !isValidUUID(item.id)) {
          console.warn('Filtering out inspection item with invalid ID:', item.id);
          return false;
        }
        return true;
      });
      
      const steps = buildDisplaySteps(validItems);
      setDisplaySteps(steps);
      
      console.log('Built display steps:', steps);
    } catch (error: any) {
      console.error('Error loading inspection:', error);
      toast.error('Failed to load inspection');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const buildDisplaySteps = (items: any[]): DisplayStep[] => {
    // Group items by their template to keep related items together
    const steps: DisplayStep[] = [];
    
    // Group items by template_id from template_items
    const itemsByTemplate = new Map<string, any[]>();
    const templateNames = new Map<string, string>();
    
    items.forEach(item => {
      const templateId = item.template_items?.template_id || item.templateItem?.template_id || 'unknown';
      const templateName = item.template_items?.templates?.name || item.templateItem?.templates?.name || 'General Section';
      
      if (!itemsByTemplate.has(templateId)) {
        itemsByTemplate.set(templateId, []);
        templateNames.set(templateId, templateName);
      }
      itemsByTemplate.get(templateId)!.push(item);
    });
    
    // Create one step per template to keep dividers with their template
    itemsByTemplate.forEach((templateItems, templateId) => {
      steps.push({
        type: 'items',
        name: templateNames.get(templateId) || 'General Section',
        items: templateItems.sort((a, b) => a.order_index - b.order_index)
      });
    });
    
    // If no templates found, create a single step with all items
    if (steps.length === 0 && items.length > 0) {
      steps.push({
        type: 'items',
        name: 'General Section',
        items: items.sort((a, b) => a.order_index - b.order_index)
      });
    }
    
    return steps;
  };

  const handleItemUpdate = (itemId: string, updates: any) => {
    // Update local state if needed
    console.log('Item updated:', itemId, updates);
  };

  const handleNext = () => {
    if (currentStep < displaySteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step - show signatures
      setShowSignatures(true);
    }
  };

  const handlePrevious = () => {
    if (showSignatures) {
      setShowSignatures(false);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveProgress = async () => {
    try {
      setSaving(true);
      // Auto-save is handled by individual item renderers
      toast.success('Progress saved');
    } catch (error: any) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteInspection = async () => {
    try {
      setCompleting(true);

      // Get signatures
      const inspectorSignature = inspectorSignatureRef.current?.toDataURL();
      const clientSignature = clientPresent ? clientSignatureRef.current?.toDataURL() : undefined;

      if (!inspectorSignature) {
        toast.error('Inspector signature is required');
        return;
      }

      if (clientPresent && !clientSignature) {
        toast.error('Client signature is required when client is present');
        return;
      }

      const endTime = new Date().toISOString();
      const startTime = new Date(inspection.start_time);
      const durationSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

      // Update inspection status
      await updateInspectionStatus(
        inspection.id,
        'completed',
        clientSignature,
        inspectorSignature,
        endTime,
        durationSeconds
      );

      // Generate report
      const reportData = {
        inspection: {
          ...inspection,
          propertyName: property?.name,
        },
        rooms: displaySteps,
        primaryContactName: inspection.primary_contact_name || '',
        inspectorName: inspection.inspector_name || '',
        startTime: inspection.start_time,
        endTime,
        duration: durationSeconds,
        primaryContactSignature: clientSignature,
        inspectorSignature,
      };

      const reportUrl = await generateInspectionReport(reportData);

      if (reportUrl) {
        toast.success('Inspection completed and report generated');
      }

      // Send email alerts for marked items
      try {
        const { data, error } = await supabase.functions.invoke('send-inspection-report-email', {
          body: { inspectionId: inspection.id },
        });

        if (error) {
          console.error('Error sending email alerts:', error);
          toast.error('Inspection completed but failed to send email alerts');
        } else {
          const emailsSent = data?.stats?.emailsSent || 0;
          if (emailsSent > 0) {
            toast.success(`Inspection completed! ${emailsSent} email alert(s) sent.`);
          } else {
            toast.success('Inspection completed successfully');
          }
        }
      } catch (emailError) {
        console.error('Error invoking email function:', emailError);
        toast.error('Inspection completed but failed to send email alerts');
      }

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error completing inspection:', error);
      toast.error('Failed to complete inspection');
    } finally {
      setCompleting(false);
    }
  };

  const clearSignature = (type: 'inspector' | 'client') => {
    if (type === 'inspector') {
      inspectorSignatureRef.current?.clear();
    } else {
      clientSignatureRef.current?.clear();
    }
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

  if (!inspection || displaySteps.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Inspection not found</h1>
          <Button className="mt-4" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentDisplayStep = displaySteps[currentStep];
  const totalSteps = displaySteps.length;
  const progressPercentage = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft size={16} />}
                onClick={handleCancelInspection}
                className="mr-4"
              >
                Cancel
              </Button>
              <div className="flex items-center">
                <Building2 className="h-6 w-6 text-primary-600 mr-2" />
                <span className="text-lg font-semibold text-gray-900">Property Inspection</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                <span>{elapsedTime}</span>
              </div>
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
        </div>
      </div>

      {/* Progress Bar */}
      {!showSignatures && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentDisplayStep?.type === 'section' 
                  ? currentDisplayStep.sectionName 
                  : `Step ${currentStep + 1}`
                } ({currentStep + 1} of {totalSteps})
              </h2>
              <span className="text-sm text-gray-500">{progressPercentage}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showSignatures ? (
          /* Signature Page */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Inspection</h2>
              <p className="text-gray-600">Please provide signatures to finalize the inspection</p>
            </div>

            {/* Inspection Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Property:</span>
                  <span className="ml-2 text-gray-600">{property?.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="ml-2 text-gray-600 capitalize">
                    {inspection.inspection_type?.replace('_', '-')}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Inspector:</span>
                  <span className="ml-2 text-gray-600">{inspection.inspector_name}</span>
                </div>
                {inspection.primary_contact_name && (
                  <div>
                    <span className="font-medium text-gray-700">Contact:</span>
                    <span className="ml-2 text-gray-600">{inspection.primary_contact_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Client Present Checkbox */}
            <div className="mb-8">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={clientPresent}
                  onChange={(e) => setClientPresent(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">
                  Client is present for signature
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Check this if the client/guest is available to sign the inspection report
              </p>
            </div>

            {/* Signatures */}
            <div className="space-y-8">
              {/* Inspector Signature */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <UserCheck className="w-5 h-5 mr-2" />
                    Inspector Signature
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearSignature('inspector')}
                  >
                    Clear
                  </Button>
                </div>
                <div className="border-2 border-gray-300 rounded-lg bg-white flex justify-center">
                  <SignatureCanvas
                    ref={inspectorSignatureRef}
                    canvasProps={{
                      width: 320,
                      height: 320,
                      className: 'signature-canvas'
                    }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Inspector: {inspection.inspector_name}
                </p>
              </div>

              {/* Client Signature (conditional) */}
              {clientPresent && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      {inspection.inspection_type?.includes('check') ? 'Guest' : 'Client'} Signature
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearSignature('client')}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="border-2 border-gray-300 rounded-lg bg-white flex justify-center">
                    <SignatureCanvas
                      ref={clientSignatureRef}
                      canvasProps={{
                        width: 320,
                        height: 320,
                        className: 'signature-canvas'
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {inspection.inspection_type?.includes('check') ? 'Guest' : 'Client'}: {inspection.primary_contact_name || 'Present'}
                  </p>
                </div>
              )}
            </div>

            {/* Complete Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  leftIcon={<ArrowLeft size={16} />}
                >
                  Back to Inspection
                </Button>
                <Button
                  onClick={handleCompleteInspection}
                  isLoading={completing}
                  leftIcon={<CheckCircle size={16} />}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Complete Inspection
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Inspection Steps */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {currentDisplayStep && (
              <div className="space-y-8">
                {/* Section Header (if this is a section step) */}
                {currentDisplayStep.type === 'section' && currentDisplayStep.sectionName && (
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {currentDisplayStep.sectionName}
                    </h2>
                    <p className="text-gray-600">
                      Complete all items in this section
                    </p>
                  </div>
                )}

                {/* Render all items for this step */}
                <div className="space-y-8">
                  {currentDisplayStep.items.map((item, index) => (
                    <div key={item.id} className="border-b border-gray-100 pb-8 last:border-b-0 last:pb-0">
                      <InspectionItemRenderer
                        item={item}
                        inspectionId={inspection.id}
                        onUpdate={handleItemUpdate}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-8 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0 && !showSignatures}
                leftIcon={<ArrowLeft size={16} />}
              >
                Previous
              </Button>

              <div className="flex space-x-3">
                <Button
                  onClick={handleNext}
                  rightIcon={<ArrowRight size={16} />}
                >
                  {currentStep === totalSteps - 1 ? 'Complete Inspection' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectionPage;