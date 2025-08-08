import React, { useState, useEffect } from 'react';
import { Camera, Upload, Flag, Users } from 'lucide-react';
import { validate as isValidUUID } from 'uuid';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { uploadInspectionPhoto } from '../../lib/inspections';
import { updateInspectionItem } from '../../lib/inspections';
import { getReportServiceTeams, ReportServiceTeam } from '../../lib/reportServiceTeams';
import { getSignedUrlForFile } from '../../lib/storage';
import { toast } from 'sonner';

interface InspectionItemRendererProps {
  item: any; // Inspection item with templateItem data
  inspectionId: string;
  onUpdate: (itemId: string, updates: any) => void;
}

const InspectionItemRenderer: React.FC<InspectionItemRendererProps> = ({
  item,
  inspectionId,
  onUpdate,
}) => {
  const [value, setValue] = useState(item.value);
  const [notes, setNotes] = useState(item.notes || '');
  const [photos, setPhotos] = useState<string[]>(item.photo_urls || []);
  const [markedForReport, setMarkedForReport] = useState(item.marked_for_report || false);
  const [reportRecipientId, setReportRecipientId] = useState(item.report_recipient_id || '');
  const [uploading, setUploading] = useState(false);
  const [reportServiceTeams, setReportServiceTeams] = useState<ReportServiceTeam[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState<Set<number>>(new Set());

  const templateItem = item.template_items || item.templateItem;

  useEffect(() => {
    loadReportServiceTeams();
    loadPhotoPreviewUrls();
  }, []);

  useEffect(() => {
    loadPhotoPreviewUrls();
  }, [photos]);

  const loadReportServiceTeams = async () => {
    try {
      const teams = await getReportServiceTeams();
      if (teams) {
        setReportServiceTeams(teams);
      }
    } catch (error) {
      console.error('Error loading report service teams:', error);
    }
  };

  const loadPhotoPreviewUrls = async () => {
    if (!photos || photos.length === 0) {
      setPhotoPreviewUrls([]);
      return;
    }

    const previewUrls: string[] = [];
    const newLoadingSet = new Set<number>();

    for (let i = 0; i < photos.length; i++) {
      try {
        newLoadingSet.add(i);
        setLoadingPreviews(new Set(newLoadingSet));

        const photoUrl = photos[i];
        const fileKey = extractFileKeyFromUrl(photoUrl);
        
        if (fileKey) {
          const signedUrl = await getSignedUrlForFile(fileKey);
          previewUrls[i] = signedUrl || photoUrl;
        } else {
          previewUrls[i] = photoUrl;
        }
      } catch (error) {
        console.error(`Error loading preview for photo ${i}:`, error);
        previewUrls[i] = photos[i];
      } finally {
        newLoadingSet.delete(i);
        setLoadingPreviews(new Set(newLoadingSet));
      }
    }

    setPhotoPreviewUrls(previewUrls);
  };

  const extractFileKeyFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'storage-files');
      
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting file key from URL:', error);
      return null;
    }
  };

  const handleValueChange = async (newValue: any) => {
    setValue(newValue);
    await saveChanges({ value: newValue });
  };

  const handleNotesChange = async (newNotes: string) => {
    setNotes(newNotes);
    await saveChanges({ notes: newNotes });
  };

  const handleMarkedForReportChange = async (checked: boolean) => {
    setMarkedForReport(checked);
    if (!checked) {
      setReportRecipientId('');
      await saveChanges({ marked_for_report: checked, report_recipient_id: null });
    } else {
      await saveChanges({ marked_for_report: checked });
    }
  };

  const handleReportRecipientChange = async (recipientId: string) => {
    setReportRecipientId(recipientId);
    await saveChanges({ report_recipient_id: recipientId });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const photoUrl = await uploadInspectionPhoto(file, inspectionId, item.id);
      
      if (photoUrl) {
        const newPhotos = [...photos, photoUrl];
        setPhotos(newPhotos);
        await saveChanges({ photo_urls: newPhotos });
        toast.success('Photo uploaded successfully');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const saveChanges = async (updates: any) => {
    // Defensive check to ensure item.id is valid
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
      console.error('Invalid item ID:', item.id);
      toast.error('Cannot save changes: Invalid item ID');
      return;
    }

    // Convert empty string UUIDs to null for database compatibility
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.report_recipient_id !== undefined) {
      if (!sanitizedUpdates.report_recipient_id || 
          sanitizedUpdates.report_recipient_id === '' || 
          !isValidUUID(sanitizedUpdates.report_recipient_id)) {
        sanitizedUpdates.report_recipient_id = null;
      }
    }

    try {
      await updateInspectionItem(
        item.id,
        sanitizedUpdates.value !== undefined ? sanitizedUpdates.value : value,
        sanitizedUpdates.notes !== undefined ? sanitizedUpdates.notes : notes,
        sanitizedUpdates.photo_urls !== undefined ? sanitizedUpdates.photo_urls : photos,
        sanitizedUpdates.marked_for_report !== undefined ? sanitizedUpdates.marked_for_report : markedForReport,
        sanitizedUpdates.report_recipient_id !== undefined ? sanitizedUpdates.report_recipient_id : (reportRecipientId && isValidUUID(reportRecipientId) ? reportRecipientId : null)
      );
      
      onUpdate(item.id, sanitizedUpdates);
    } catch (error: any) {
      console.error('Error saving inspection item:', error);
      toast.error('Failed to save changes');
    }
  };

  const renderInput = () => {
    switch (templateItem?.type) {
      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {templateItem.label}
              {templateItem.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your response..."
            />
          </div>
        );

      case 'single_choice':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {templateItem.label}
              {templateItem.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {(templateItem.options || []).map((option: string, index: number) => (
                <label key={index} className="flex items-center">
                  <input
                    type="radio"
                    name={`item-${item.id}`}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {templateItem.label}
              {templateItem.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {(templateItem.options || []).map((option: string, index: number) => (
                <label key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    value={option}
                    checked={(value || []).includes(option)}
                    onChange={(e) => {
                      const currentValues = value || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter((v: string) => v !== option);
                      handleValueChange(newValues);
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'photo':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {templateItem.label}
              {templateItem.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {/* Photo Upload */}
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
                id={`photo-upload-${item.id}`}
                disabled={uploading}
              />
              <label
                htmlFor={`photo-upload-${item.id}`}
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </>
                )}
              </label>
            </div>

            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <div className="w-40 h-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      {loadingPreviews.has(index) ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                        </div>
                      ) : photoPreviewUrls[index] ? (
                        <img
                          src={photoPreviewUrls[index]}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error(`Error loading photo preview ${index}:`, e);
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTE2IDlIMTJNMTIgOUg4VjEzSDEyVjlaTTggMTNWMTdIMTJWMTNIOFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Camera className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'divider':
        return (
          <div className="py-4">
            <div className="border-t border-gray-300"></div>
          </div>
        );

      default:
        return null;
    }
  };

  if (templateItem?.type === 'section') {
    return null; // Sections are handled at the page level
  }

  return (
    <div className="space-y-6">
      {/* Main Input */}
      {renderInput()}

      {/* Notes Section */}
      {templateItem?.type !== 'divider' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Add any additional notes..."
          />
        </div>
      )}

      {/* Mark for Report Section */}
      {templateItem?.type !== 'divider' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id={`mark-for-report-${item.id}`}
                type="checkbox"
                checked={markedForReport}
                onChange={(e) => handleMarkedForReportChange(e.target.checked)}
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3">
              <label htmlFor={`mark-for-report-${item.id}`} className="flex items-center text-sm font-medium text-amber-800 cursor-pointer">
                <Flag className="w-4 h-4 mr-1" />
                Mark for Report
              </label>
              <p className="text-xs text-amber-700 mt-1">
                Check this box to send an email alert about this item when the inspection is completed
              </p>
            </div>
          </div>

          {markedForReport && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-amber-800 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Send Alert To
              </label>
              <select
                value={reportRecipientId}
                onChange={(e) => handleReportRecipientChange(e.target.value)}
                className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                required={markedForReport}
              >
                <option value="">Select recipient...</option>
                {reportServiceTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.designation} ({team.email})
                  </option>
                ))}
              </select>
              {markedForReport && !reportRecipientId && (
                <p className="mt-1 text-xs text-amber-700">
                  Please select a recipient to send the alert to
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InspectionItemRenderer;