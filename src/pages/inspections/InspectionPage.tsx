import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Check, X, AlertTriangle, Save, Send, Clock, Upload, Trash2, Play, Pause, ArrowLeft, ArrowRight, UserCheck, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import SignatureCanvas from 'react-signature-canvas';
import { getInspectionDetails, updateInspectionItem, updateInspectionStatus, uploadInspectionPhoto } from '../../lib/inspections';
import { generateInspectionReport } from '../../lib/reports';
import { toast } from 'sonner';

type InspectionItem = {
  id: string;
  type: 'text' | 'photo' | 'single_choice' | 'multiple_choice';
  label: string;
  value: string | boolean | string[] | null;
  photos?: string[];
  notes?: string;
  required?: boolean;
  options?: string[];
};

type Room = {
  id: string;
  name: string;
  items: InspectionItem[];
};

const InspectionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [guestSignature, setGuestSignature] = useState<any>(null);
  const [inspectorSignature, setInspectorSignature] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [inspection, setInspection] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // Timer state
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Photo upload state
  const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      loadInspectionData(id);
    }
  }, [id]);

  useEffect(() => {
    // Start timer when component mounts
    const now = new Date();
    setStartTime(now);
    setIsTimerRunning(true);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isTimerRunning && startTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, startTime]);

  const loadInspectionData = async (inspectionId: string) => {
    try {
      setLoading(true);
      const data = await getInspectionDetails(inspectionId);
      
      if (data) {
        setInspection(data.inspection);
        setGuestName(data.inspection.guestName || '');
        setInspectorName(data.inspection.inspectorName || '');
        
        // Mock room data based on templates - this would come from the actual checklist
        const mockRooms: Room[] = [
          {
            id: '1',
            name: 'Living Room',
            items: [
              {
                id: '1-1',
                type: 'single_choice',
                label: 'Furniture condition',
                value: null,
                notes: '',
                required: true,
                options: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'],
              },
              {
                id: '1-2',
                type: 'photo',
                label: 'Overall room condition',
                value: null,
                photos: [],
                notes: '',
                required: true,
              },
              {
                id: '1-3',
                type: 'text',
                label: 'Additional notes',
                value: '',
                required: false,
              },
            ],
          },
          {
            id: '2',
            name: 'Kitchen',
            items: [
              {
                id: '2-1',
                type: 'single_choice',
                label: 'Appliances working',
                value: null,
                notes: '',
                required: true,
                options: ['All working', 'Some issues', 'Major problems'],
              },
              {
                id: '2-2',
                type: 'photo',
                label: 'Counter surfaces',
                value: null,
                photos: [],
                notes: '',
                required: true,
              },
              {
                id: '2-3',
                type: 'multiple_choice',
                label: 'Items present',
                value: [],
                notes: '',
                required: false,
                options: ['Microwave', 'Coffee maker', 'Toaster', 'Blender'],
              },
            ],
          },
          {
            id: '3',
            name: 'Signature',
            items: [],
          },
        ];
        
        setRooms(mockRooms);
      } else {
        toast.error('Inspection not found');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Error loading inspection:', error);
      toast.error('Failed to load inspection');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (roomId: string, itemId: string, files: FileList) => {
    if (!files.length || !inspection) return;

    const file = files[0];
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingPhotos(prev => new Set(prev).add(itemId));
      
      const photoUrl = await uploadInspectionPhoto(file, inspection.id, itemId);
      
      if (photoUrl) {
        setRooms(rooms.map(room => {
          if (room.id === roomId) {
            return {
              ...room,
              items: room.items.map(item => {
                if (item.id === itemId) {
                  const currentPhotos = item.photos || [];
                  return {
                    ...item,
                    photos: [...currentPhotos, photoUrl],
                  };
                }
                return item;
              }),
            };
          }
          return room;
        }));
        
        toast.success('Photo uploaded successfully');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemovePhoto = (roomId: string, itemId: string, photoIndex: number) => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          items: room.items.map(item => {
            if (item.id === itemId) {
              const newPhotos = [...(item.photos || [])];
              newPhotos.splice(photoIndex, 1);
              return {
                ...item,
                photos: newPhotos,
              };
            }
            return item;
          }),
        };
      }
      return room;
    }));
  };

  const handleItemUpdate = async (roomId: string, itemId: string, value: any, field: string = 'value') => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          items: room.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                [field]: value,
              };
            }
            return item;
          }),
        };
      }
      return room;
    }));

    // Auto-save the change
    try {
      await updateInspectionItem(itemId, value, field === 'notes' ? value : undefined);
    } catch (error) {
      console.error('Error auto-saving item:', error);
    }
  };

  const handleSaveInspection = async () => {
    try {
      setSaving(true);
      // Save all current data
      toast.success('Inspection saved successfully');
    } catch (error) {
      toast.error('Failed to save inspection');
    } finally {
      setSaving(false);
    }
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
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

  const handleCompleteInspection = async () => {
    if (!inspection) return;

    // Validate signatures based on inspection type
    const isCheckIn = inspection.inspectionType === 'check_in';
    const isCheckOut = inspection.inspectionType === 'check_out';

    if (isCheckIn && (!guestSignature || !inspectorSignature)) {
      toast.error('Both guest and inspector signatures are required for check-in inspections');
      return;
    }

    if (isCheckOut && !inspectorSignature) {
      toast.error('Inspector signature is required to complete the inspection');
      return;
    }

    try {
      setCompleting(true);
      
      // Stop timer
      setIsTimerRunning(false);
      const endTime = new Date();
      const totalDuration = Math.floor((endTime.getTime() - (startTime?.getTime() || 0)) / 1000);
      
      // Get signatures as data URLs
      const guestSignatureDataUrl = guestSignature ? guestSignature.toDataURL() : null;
      const inspectorSignatureDataUrl = inspectorSignature ? inspectorSignature.toDataURL() : null;
      
      // Update inspection status
      await updateInspectionStatus(
        inspection.id,
        'completed',
        guestSignatureDataUrl,
        inspectorSignatureDataUrl,
        endTime.toISOString(),
        totalDuration
      );
      
      // Generate PDF report
      const reportData = {
        inspection: {
          ...inspection,
          inspectorName,
          guestName,
        },
        rooms: rooms.filter(room => room.name !== 'Signature'),
        guestName,
        inspectorName,
        startTime: startTime?.toISOString(),
        endTime: endTime.toISOString(),
        duration: totalDuration,
        guestSignature: guestSignatureDataUrl,
        inspectorSignature: inspectorSignatureDataUrl,
      };
      
      const reportUrl = await generateInspectionReport(reportData);
      
      if (reportUrl) {
        toast.success('Inspection completed and report generated!');
      } else {
        toast.success('Inspection completed successfully!');
      }
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error completing inspection:', error);
      toast.error('Failed to complete inspection');
    } finally {
      setCompleting(false);
    }
  };

  const canProceedToNext = () => {
    const currentRoom = rooms[currentStep];
    if (!currentRoom || currentRoom.name === 'Signature') return true;
    
    return currentRoom.items.every(item => {
      if (!item.required) return true;
      
      if (item.type === 'text') {
        return item.value && (item.value as string).trim() !== '';
      } else if (item.type === 'photo') {
        return item.photos && item.photos.length > 0;
      } else if (item.type === 'single_choice') {
        return item.value !== null && item.value !== '';
      } else if (item.type === 'multiple_choice') {
        return Array.isArray(item.value) && item.value.length > 0;
      }
      
      return true;
    });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inspection...</p>
        </div>
      </div>
    );
  }

  const currentRoom = rooms[currentStep];
  const isLastStep = currentStep === rooms.length - 1;
  const isFirstStep = currentStep === 0;
  const isCheckIn = inspection?.inspectionType === 'check_in';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Timer */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Property Inspection</h1>
          
          {/* Timer */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-white rounded-lg border border-gray-200 px-4 py-2">
              <Clock className="h-5 w-5 text-gray-500 mr-2" />
              <span className="font-mono text-lg font-semibold text-gray-900">
                {formatTime(elapsedTime)}
              </span>
              <button
                onClick={toggleTimer}
                className="ml-3 p-1 rounded-full hover:bg-gray-100"
              >
                {isTimerRunning ? (
                  <Pause className="h-4 w-4 text-gray-600" />
                ) : (
                  <Play className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">
              {currentRoom?.name || 'Loading...'} ({currentStep + 1} of {rooms.length})
            </span>
            <span className="text-sm font-medium text-gray-500">
              {Math.round(((currentStep + 1) / rooms.length) * 100)}% Complete
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-primary-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / rooms.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Room content */}
      <div className="space-y-6">
        {currentRoom?.name === 'Signature' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Complete Inspection</h2>
            
            {/* Inspector Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Inspector Name</label>
              <Input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Enter inspector name"
                leftIcon={<UserCheck size={16} className="text-gray-400" />}
              />
            </div>

            {/* Guest Name (only for check-in) */}
            {isCheckIn && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guest Name</label>
                <Input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter guest name"
                  leftIcon={<User size={16} className="text-gray-400" />}
                />
              </div>
            )}

            {/* Inspector Signature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inspector Signature *
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                <SignatureCanvas
                  ref={(ref) => setInspectorSignature(ref)}
                  canvasProps={{
                    className: 'w-full h-48',
                    style: { background: 'white' }
                  }}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => inspectorSignature?.clear()}
                >
                  Clear Inspector Signature
                </Button>
              </div>
            </div>

            {/* Guest Signature (only for check-in) */}
            {isCheckIn && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Signature *
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                  <SignatureCanvas
                    ref={(ref) => setGuestSignature(ref)}
                    canvasProps={{
                      className: 'w-full h-48',
                      style: { background: 'white' }
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => guestSignature?.clear()}
                  >
                    Clear Guest Signature
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Signature Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Inspector signature is always required</li>
                {isCheckIn && <li>• Guest signature is required for check-in inspections</li>}
                {!isCheckIn && <li>• Guest signature is not required for check-out inspections</li>}
              </ul>
            </div>
          </div>
        ) : (
          currentRoom?.items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {item.label}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  
                  {item.type === 'single_choice' && (
                    <div className="space-y-2">
                      {item.options?.map((option, index) => (
                        <label key={index} className="flex items-center">
                          <input
                            type="radio"
                            name={item.id}
                            value={option}
                            checked={item.value === option}
                            onChange={(e) => handleItemUpdate(currentRoom.id, item.id, e.target.value)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {item.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {item.options?.map((option, index) => (
                        <label key={index} className="flex items-center">
                          <input
                            type="checkbox"
                            value={option}
                            checked={Array.isArray(item.value) && item.value.includes(option)}
                            onChange={(e) => {
                              const currentValues = Array.isArray(item.value) ? item.value : [];
                              const newValues = e.target.checked
                                ? [...currentValues, option]
                                : currentValues.filter(v => v !== option);
                              handleItemUpdate(currentRoom.id, item.id, newValues);
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {item.type === 'photo' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {item.photos?.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={() => handleRemovePhoto(currentRoom.id, item.id, index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                          <div className="flex flex-col items-center justify-center">
                            {uploadingPhotos.has(item.id) ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                            ) : (
                              <>
                                <Camera size={20} className="text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">Add Photo</span>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files && handlePhotoUpload(currentRoom.id, item.id, e.target.files)}
                            className="hidden"
                            disabled={uploadingPhotos.has(item.id)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {item.type === 'text' && (
                    <textarea
                      className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      rows={3}
                      value={item.value as string || ''}
                      onChange={(e) => handleItemUpdate(currentRoom.id, item.id, e.target.value)}
                      placeholder="Enter notes here..."
                    />
                  )}
                  
                  {(item.type === 'single_choice' || item.type === 'multiple_choice' || item.type === 'photo') && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        rows={2}
                        value={item.notes || ''}
                        onChange={(e) => handleItemUpdate(currentRoom.id, item.id, e.target.value, 'notes')}
                        placeholder="Add any additional notes..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between items-center">
        <Button
          variant="secondary"
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={isFirstStep}
          leftIcon={<ArrowLeft size={16} />}
        >
          Previous
        </Button>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Save size={16} />}
            onClick={handleSaveInspection}
            isLoading={saving}
          >
            Save Progress
          </Button>
          
          {isLastStep ? (
            <Button
              leftIcon={<Send size={16} />}
              onClick={handleCompleteInspection}
              disabled={completing}
              isLoading={completing}
              className="bg-green-600 hover:bg-green-700"
            >
              Complete Inspection
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceedToNext()}
              rightIcon={<ArrowRight size={16} />}
            >
              Next
            </Button>
          )}
        </div>
      </div>

      {/* Required fields warning */}
      {!canProceedToNext() && !isLastStep && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Required fields missing</h4>
              <p className="text-sm text-amber-700 mt-1">
                Please complete all required fields before proceeding to the next section.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionPage;