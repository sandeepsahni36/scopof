import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Building2, Bed, Bath, MapPin, ClipboardCheck, Camera, Edit, ArrowLeft, Calendar, User, Plus, X, Check, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Property, Template } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { getProperty } from '../../lib/properties';
import { getTemplates } from '../../lib/templates';
import { getPropertyChecklist, createPropertyChecklist, updatePropertyChecklist, deletePropertyChecklist, reorderChecklistTemplates, PropertyChecklist } from '../../lib/propertyChecklists';
import { getInspectionsForProperty } from '../../lib/inspections';
import { toast } from 'sonner';

const PropertyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'inspections'>('details');
  const [showCreateChecklistForm, setShowCreateChecklistForm] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
  const [propertyChecklist, setPropertyChecklist] = useState<PropertyChecklist | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [checklistName, setChecklistName] = useState('');
  const [propertyInspections, setPropertyInspections] = useState<any[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadProperty(id);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'checklist') {
      loadChecklistData();
    } else if (activeTab === 'inspections') {
      loadInspectionHistory();
    }
  }, [activeTab, id]);

  const loadProperty = async (propertyId: string) => {
    try {
      setLoading(true);
      const data = await getProperty(propertyId);
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

  const loadChecklistData = async () => {
    if (!id) return;
    
    try {
      setChecklistLoading(true);
      
      // Load existing checklist for this property
      const checklist = await getPropertyChecklist(id);
      setPropertyChecklist(checklist);
      
      // Load available templates
      const templates = await getTemplates();
      setAvailableTemplates(templates || []);
      
      // Set default checklist name if creating new
      if (!checklist && property) {
        setChecklistName(`${property.name} Inspection Checklist`);
      }
      
      // If editing existing checklist, populate the form
      if (checklist) {
        setChecklistName(checklist.name);
        setSelectedTemplates(checklist.templates?.map(t => t.templateId) || []);
      }
    } catch (error: any) {
      console.error('Error loading checklist data:', error);
      toast.error('Failed to load checklist data');
    } finally {
      setChecklistLoading(false);
    }
  };

  const loadInspectionHistory = async () => {
    if (!id) return;
    
    try {
      setInspectionsLoading(true);
      const inspections = await getInspectionsForProperty(id);
      setPropertyInspections(inspections || []);
    } catch (error: any) {
      console.error('Error loading inspection history:', error);
      toast.error('Failed to load inspection history');
    } finally {
      setInspectionsLoading(false);
    }
  };

  const handleCreateChecklist = () => {
    setShowCreateChecklistForm(true);
    setSelectedTemplates([]);
    if (property) {
      setChecklistName(`${property.name} Inspection Checklist`);
    }
  };

  const handleEditChecklist = () => {
    if (propertyChecklist) {
      setShowCreateChecklistForm(true);
      setChecklistName(propertyChecklist.name);
      setSelectedTemplates(propertyChecklist.templates?.map(t => t.templateId) || []);
    }
  };

  const handleCancelCreateChecklist = () => {
    setShowCreateChecklistForm(false);
    setSelectedTemplates([]);
    setChecklistName('');
  };

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const moveTemplateUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...selectedTemplates];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      setSelectedTemplates(newOrder);
    }
  };

  const moveTemplateDown = (index: number) => {
    if (index < selectedTemplates.length - 1) {
      const newOrder = [...selectedTemplates];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setSelectedTemplates(newOrder);
    }
  };

  const handleSaveChecklist = async () => {
    if (!property || !checklistName.trim()) {
      toast.error('Please enter a checklist name');
      return;
    }

    if (selectedTemplates.length === 0) {
      toast.error('Please select at least one template');
      return;
    }

    try {
      setChecklistLoading(true);
      
      const checklistData = {
        propertyId: property.id,
        name: checklistName.trim(),
        description: `Inspection checklist for ${property.name}`,
        templateIds: selectedTemplates,
      };

      let result;
      if (propertyChecklist) {
        // Update existing checklist
        result = await updatePropertyChecklist(propertyChecklist.id, {
          name: checklistData.name,
          description: checklistData.description,
          templateIds: checklistData.templateIds,
        });
      } else {
        // Create new checklist
        result = await createPropertyChecklist(checklistData);
      }
      
      if (result) {
        toast.success(propertyChecklist ? 'Checklist updated successfully' : 'Checklist created successfully');
        setShowCreateChecklistForm(false);
        setSelectedTemplates([]);
        setChecklistName('');
        loadChecklistData(); // Reload to show the new/updated checklist
      }
    } catch (error: any) {
      console.error('Error saving checklist:', error);
      toast.error('Failed to save checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleDeleteChecklist = async () => {
    if (!propertyChecklist || !property) return;

    if (!window.confirm('Are you sure you want to delete this checklist? This action cannot be undone.')) {
      return;
    }

    try {
      setChecklistLoading(true);
      
      const success = await deletePropertyChecklist(propertyChecklist.id);
      
      if (success) {
        toast.success('Checklist deleted successfully');
        setPropertyChecklist(null);
      }
    } catch (error: any) {
      console.error('Error deleting checklist:', error);
      toast.error('Failed to delete checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'villa':
        return '🏖️';
      case 'house':
        return '🏠';
      case 'condo':
        return '🏢';
      default:
        return '🏠';
    }
  };

  const formatBedrooms = (bedrooms: string) => {
    return bedrooms === 'studio' ? 'Studio' : `${bedrooms} Bedroom${bedrooms !== '1' ? 's' : ''}`;
  };

  const formatBathrooms = (bathrooms: string) => {
    return `${bathrooms} Bathroom${bathrooms !== '1' ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Property not found</h1>
          <Link to="/dashboard/properties">
            <Button className="mt-4">Back to Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/dashboard/properties')}
        >
          Back to Properties
        </Button>
      </div>

      {/* Property Header */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden mb-8">
        {/* Hero Image */}
        <div className="h-64 bg-gradient-to-br from-primary-100 to-primary-200 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">{getPropertyTypeIcon(property.type)}</span>
          </div>
          
          {/* Property Type Badge */}
          <div className="absolute top-6 left-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/90 text-gray-700 capitalize">
              {property.type}
            </span>
          </div>

          {/* Edit Button */}
          {isAdmin && (
            <div className="absolute top-6 right-6">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Edit size={16} />}
                onClick={() => {
                  // TODO: Open edit modal
                  toast.info('Edit functionality coming soon');
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Property Info */}
        <div className="p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{property.name}</h1>
              
              <div className="flex items-start text-gray-600 mb-6">
                <MapPin size={20} className="mr-2 mt-1 flex-shrink-0" />
                <span className="text-lg">{property.address}</span>
              </div>

              {/* Property Stats */}
              <div className="flex items-center space-x-8 mb-6">
                <div className="flex items-center text-gray-700">
                  <Building2 size={20} className="mr-2" />
                  <span className="font-medium capitalize">{property.type}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Bed size={20} className="mr-2" />
                  <span className="font-medium">{formatBedrooms(property.bedrooms)}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Bath size={20} className="mr-2" />
                  <span className="font-medium">{formatBathrooms(property.bathrooms)}</span>
                </div>
              </div>

              {/* Notes */}
              {property.notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-600 leading-relaxed">{property.notes}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-64">
              <Link to={`/start-inspection/${property.id}`}>
                <Button
                  size="lg"
                  leftIcon={<Camera size={20} />}
                  className="w-full"
                  disabled={!propertyChecklist}
                >
                  Start Inspection
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                leftIcon={<ClipboardCheck size={20} />}
                onClick={() => setActiveTab('checklist')}
                className="w-full"
              >
                {propertyChecklist ? 'View Checklist' : 'Create Checklist'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'details'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Property Details
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'checklist'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Inspection Checklist
              {propertyChecklist && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Ready
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('inspections')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'inspections'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Inspection History
            </button>
          </nav>
        </div>

        <div className="p-8">
          {activeTab === 'details' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Property Information</h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Property Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{property.type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Bedrooms</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatBedrooms(property.bedrooms)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Bathrooms</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatBathrooms(property.bathrooms)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date Added</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      <Calendar size={16} className="mr-1" />
                      {new Date(property.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      <Calendar size={16} className="mr-1" />
                      {new Date(property.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              {property.notes && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed">{property.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'checklist' && (
            <div>
              {checklistLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading checklist...</p>
                </div>
              ) : propertyChecklist && !showCreateChecklistForm ? (
                /* Existing Checklist View */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{propertyChecklist.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{propertyChecklist.description}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit size={16} />}
                          onClick={handleEditChecklist}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Trash2 size={16} />}
                          onClick={handleDeleteChecklist}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Checklist Ready
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>
                            This property has an inspection checklist with {propertyChecklist.templates?.length || 0} template(s). 
                            You can now start inspections for this property.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {propertyChecklist.templates && propertyChecklist.templates.length > 0 && (
                    <div>
                      <h4 className="text-base font-medium text-gray-900 mb-4">Template Order (Inspection Flow)</h4>
                      <div className="space-y-3">
                        {propertyChecklist.templates
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((template, index) => (
                          <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mr-3">
                                  {index + 1}
                                </div>
                                <div>
                                  <h5 className="font-medium text-gray-900">{template.template?.name}</h5>
                                  {template.template?.description && (
                                    <p className="text-sm text-gray-500 mt-1">{template.template.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400">
                                {template.template?.itemCount || 0} items
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-6">
                    <Link to={`/start-inspection/${property.id}`}>
                      <Button
                        size="lg"
                        leftIcon={<Camera size={20} />}
                        className="w-full sm:w-auto"
                      >
                        Start Inspection
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : showCreateChecklistForm ? (
                /* Create/Edit Checklist Form */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {propertyChecklist ? 'Edit Checklist' : 'Create Inspection Checklist'}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<X size={16} />}
                      onClick={handleCancelCreateChecklist}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Checklist Name"
                      value={checklistName}
                      onChange={(e) => setChecklistName(e.target.value)}
                      placeholder="Enter checklist name"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Templates and Set Order
                      </label>
                      
                      {availableTemplates.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
                          <h4 className="mt-2 text-sm font-medium text-gray-900">No Templates Available</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            You need to create templates first before building a checklist.
                          </p>
                          <div className="mt-4">
                            <Link to="/dashboard/templates/new">
                              <Button size="sm">Create Template</Button>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Available Templates */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Available Templates</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {availableTemplates
                                .filter(template => !selectedTemplates.includes(template.id))
                                .map((template) => (
                                <div
                                  key={template.id}
                                  className="border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:border-gray-300"
                                  onClick={() => handleTemplateToggle(template.id)}
                                >
                                  <div className="flex items-start">
                                    <div className="h-5 w-5 rounded border-2 border-gray-300 flex items-center justify-center mt-0.5">
                                      <Plus className="h-3 w-3 text-gray-400" />
                                    </div>
                                    <div className="ml-3 flex-1">
                                      <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                                      {template.description && (
                                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Selected Templates with Ordering */}
                          {selectedTemplates.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Selected Templates (Inspection Order)
                              </h4>
                              <div className="space-y-2">
                                {selectedTemplates.map((templateId, index) => {
                                  const template = availableTemplates.find(t => t.id === templateId);
                                  if (!template) return null;
                                  
                                  return (
                                    <div
                                      key={templateId}
                                      className="border border-primary-200 bg-primary-50 rounded-lg p-4"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mr-3">
                                            {index + 1}
                                          </div>
                                          <div className="flex-1">
                                            <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                                            {template.description && (
                                              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveTemplateUp(index)}
                                            disabled={index === 0}
                                            leftIcon={<ArrowUp size={16} />}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveTemplateDown(index)}
                                            disabled={index === selectedTemplates.length - 1}
                                            leftIcon={<ArrowDown size={16} />}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleTemplateToggle(templateId)}
                                            leftIcon={<X size={16} />}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {availableTemplates.length > 0 && (
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                      <Button
                        variant="secondary"
                        onClick={handleCancelCreateChecklist}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveChecklist}
                        disabled={selectedTemplates.length === 0 || !checklistName.trim()}
                        isLoading={checklistLoading}
                      >
                        {propertyChecklist ? 'Update Checklist' : 'Create Checklist'}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* No Checklist - Create New */
                <div className="text-center py-12">
                  <ClipboardCheck className="mx-auto h-16 w-16 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">No Checklist Assigned</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Create a custom inspection checklist for this property to get started.
                  </p>
                  <div className="mt-6">
                    {isAdmin ? (
                      <Button 
                        leftIcon={<Plus size={16} />}
                        onClick={handleCreateChecklist}
                      >
                        Create a Checklist
                      </Button>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Contact your admin to create a checklist for this property.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inspections' && (
            <div className="text-center py-12">
              <Camera className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No Inspections Yet</h3>
              <p className="mt-2 text-base text-gray-500">
                Inspection history will appear here once you start conducting inspections.
              </p>
              <div className="mt-6">
                <Link to={`/start-inspection/${property.id}`}>
                  <Button 
                    leftIcon={<Camera size={16} />}
                    disabled={!propertyChecklist}
                  >
                    {propertyChecklist ? 'Start First Inspection' : 'Create Checklist First'}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;