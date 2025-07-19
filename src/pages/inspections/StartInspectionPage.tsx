import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Camera, ClipboardCheck, User, Calendar, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Property, InspectionType } from '../../types';
import { getProperty } from '../../lib/properties';
import { createInspection } from '../../lib/inspections';
import { toast } from 'sonner';

interface StartInspectionFormData {
  inspectionType: InspectionType;
  guestName?: string;
  inspectorName: string;
}

const StartInspectionPage = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StartInspectionFormData>({
    defaultValues: {
      inspectionType: 'check_in',
      guestName: '',
      inspectorName: '',
    },
  });

  const inspectionType = watch('inspectionType');

  useEffect(() => {
    if (propertyId) {
      loadProperty(propertyId);
    }
  }, [propertyId]);

  const loadProperty = async (id: string) => {
    try {
      setLoading(true);
      const data = await getProperty(id);
      if (data) {
        setProperty(data);
      } else {
        toast.error('Property not found');
        navigate('/dashboard/properties');
      }
    } catch (error: any) {
      console.error('Error loading property:', error);
      toast.error('Failed to load property');
      navigate('/dashboard/properties');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: StartInspectionFormData) => {
    if (!property) return;

    try {
      setSubmitting(true);

      // For now, we'll use a mock checklist ID since property checklists aren't implemented yet
      const mockChecklistId = 'mock-checklist-1';

      const inspection = await createInspection(
        property.id,
        mockChecklistId,
        data.inspectionType,
        data.guestName,
        data.inspectorName
      );

      if (inspection) {
        toast.success('Inspection started successfully');
        navigate(`/dashboard/inspections/${inspection.id}`);
      } else {
        throw new Error('Failed to create inspection');
      }
    } catch (error: any) {
      console.error('Error starting inspection:', error);
      toast.error('Failed to start inspection');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Property not found</h1>
          <Button className="mt-4" onClick={() => navigate('/dashboard/properties')}>
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate(`/dashboard/properties/${property.id}`)}
        >
          Back to Property
        </Button>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Inspection</h1>
        <p className="text-lg text-gray-600">{property.name}</p>
        <p className="text-sm text-gray-500">{property.address}</p>
      </div>

      {/* Inspection Form */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Inspection Type Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection Type</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  inspectionType === 'check_in'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    value="check_in"
                    {...register('inspectionType', { required: 'Please select an inspection type' })}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      inspectionType === 'check_in'
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {inspectionType === 'check_in' && (
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">Check-In</span>
                      </div>
                      <p className="text-sm text-gray-500">Guest arrival inspection</p>
                    </div>
                  </div>
                </label>

                <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  inspectionType === 'check_out'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    value="check_out"
                    {...register('inspectionType', { required: 'Please select an inspection type' })}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      inspectionType === 'check_out'
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {inspectionType === 'check_out' && (
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">Check-Out</span>
                      </div>
                      <p className="text-sm text-gray-500">Guest departure inspection</p>
                    </div>
                  </div>
                </label>
              </div>
              {errors.inspectionType && (
                <p className="mt-2 text-sm text-red-600">{errors.inspectionType.message}</p>
              )}
            </div>

            {/* Inspector Name (always required) */}
            <div>
              <Input
                label="Inspector Name"
                error={errors.inspectorName?.message}
                {...register('inspectorName', {
                  required: 'Inspector name is required',
                  minLength: {
                    value: 2,
                    message: 'Inspector name must be at least 2 characters',
                  },
                })}
                placeholder="Enter the inspector's full name"
                leftIcon={<UserCheck size={16} className="text-gray-400" />}
              />
              <p className="mt-2 text-sm text-gray-500">
                This name will appear on the inspection report and signature page.
              </p>
            </div>

            {/* Guest Name (required for check-in) */}
            {inspectionType === 'check_in' && (
              <div>
                <Input
                  label="Guest Name"
                  error={errors.guestName?.message}
                  {...register('guestName', {
                    required: inspectionType === 'check_in' ? 'Guest name is required for check-in inspections' : false,
                    minLength: {
                      value: 2,
                      message: 'Guest name must be at least 2 characters',
                    },
                  })}
                  placeholder="Enter the guest's full name"
                  leftIcon={<User size={16} className="text-gray-400" />}
                />
                <p className="mt-2 text-sm text-gray-500">
                  This name will appear on the inspection report and signature page.
                </p>
              </div>
            )}

            {/* Inspection Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">What happens next?</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <ClipboardCheck className="h-4 w-4 text-primary-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Follow the inspection checklist step by step</span>
                </li>
                <li className="flex items-start">
                  <Camera className="h-4 w-4 text-primary-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Take photos and document any issues found</span>
                </li>
                <li className="flex items-start">
                  <UserCheck className="h-4 w-4 text-primary-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>
                    {inspectionType === 'check_in' 
                      ? 'Get both guest and inspector signatures to confirm property condition'
                      : 'Complete final inspection with inspector signature'
                    }
                  </span>
                </li>
              </ul>
            </div>

            {/* Start Button */}
            <div className="pt-6">
              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={submitting}
                leftIcon={<Camera size={20} />}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {submitting ? 'Starting Inspection...' : 'START INSPECTION'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StartInspectionPage;