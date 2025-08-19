import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Building2, Bed, Bath, MapPin, ClipboardCheck, Camera, Edit, ArrowLeft, Calendar, User, Plus, X, Check, Trash2, GripVertical, ArrowUp, ArrowDown, Folder, LayoutTemplate } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Property, Template, TemplateCategory } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { getProperty, updateProperty } from '../../lib/properties';
import { getTemplates, getTemplateCategories } from '../../lib/templates';
import { getPropertyChecklist, createPropertyChecklist, updatePropertyChecklist, deletePropertyChecklist, reorderChecklistTemplates, PropertyChecklist } from '../../lib/propertyChecklists';
import { getInspectionsForProperty } from '../../lib/inspections';
import PropertyForm, { PropertyFormData } from '../../components/properties/PropertyForm';
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
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [propertyChecklist, setPropertyChecklist] = useState<PropertyChecklist | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [checklistName, setChecklistName] = useState('');
  const [propertyInspections, setPropertyInspections] = useState<any[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [deletingInspections, setDeletingInspections] = useState<Set<string>>(new Set());
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

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
      
      // Load available templates and categories
      const [templates, categoriesData] = await Promise.all([
        getTemplates(),
        getTemplateCategories()
      ]);
      
      setAvailableTemplates(templates || []);
      setCategories(categoriesData || []);
      
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

  const handleDeleteInspection = async (inspectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this inspection? This action cannot be undone and will remove all associated photos and reports.')) {
      return;
    }

    try {
      setDeletingInspections(prev => new Set(prev).add(inspectionId));
      
      const { deleteInspection } = await import('../../lib/inspections');
      const success = await deleteInspection(inspectionId);
      
      if (success) {
        toast.success('Inspection deleted successfully');
        // Reload inspection history
        loadInspectionHistory();
      }
    } catch (error: any) {
      console.error('Error deleting inspection:', error);
      toast.error('Failed to delete inspection');
    } finally {
      setDeletingInspections(prev => {
        const newSet = new Set(prev);
        newSet.delete(inspectionId);
        return newSet;
      });
    }
  };

  const handleEditProperty = () => {
    if (!isAdmin) {
      toast.error('Only admins can edit properties');
      return;
    }
    setShowPropertyForm(true);
  };

  const handleFormSubmit = async (data: PropertyFormData) => {
    if (!property) return;

    try {
      setFormLoading(true);
      const updatedProperty = await updateProperty(property.id, data);
      if (updatedProperty) {
        setProperty(updatedProperty);
        toast.success('Property updated successfully');
        setShowPropertyForm(false);
      }
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast.error('Failed to update property');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowPropertyForm(false);
  };

  const handleDeleteProperty = async () => {
    if (!property) return;

    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone and will remove all associated inspections and checklists.')) {
      return;
    }

    try {
      const { deleteProperty } = await import('../../lib/properties');
      const success = await deleteProperty(property.id);
      
      if (success) {
        toast.success('Property deleted successfully');
        navigate('/dashboard/properties');
      }
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'apartment':
        return '🏢';
      case 'hotel_apartment':
        return '🏨';
      case 'penthouse':
        return '🏙️';
      case 'villa':
        return '🏡';
      default:
        return '🏢';
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
    <div className="w-full">
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
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit size={16} />}
                  onClick={handleEditProperty}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 size={16} />}
                  onClick={handleDeleteProperty}
                  className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
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
          <nav className="-mb-px flex space-x-4 sm:space-x-8 px-4 sm:px-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0
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
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0
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
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0
                ${activeTab === 'inspections'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Inspection History
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-8">
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
                <ChecklistBuilder
                  checklistName={checklistName}
                  setChecklistName={setChecklistName}
                  availableTemplates={availableTemplates}
                  selectedTemplates={selectedTemplates}
                  setSelectedTemplates={setSelectedTemplates}
                  onSave={handleSaveChecklist}
                  onCancel={handleCancelCreateChecklist}
                  loading={checklistLoading}
                  isEditing={!!propertyChecklist}
                />
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
            <>
              {inspectionsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading inspection history...</p>
                </div>
              ) : propertyInspections.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Inspection History</h3>
                    <Link to={`/start-inspection/${property.id}`}>
                      <Button 
                        leftIcon={<Camera size={16} />}
                        disabled={!propertyChecklist}
                        size="sm"
                      >
                        New Inspection
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Inspector
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contact
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Duration
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {propertyInspections.map((inspection) => (
                            <tr key={inspection.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  inspection.inspection_type === 'check_in' || inspection.inspection_type === 'move_in'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {inspection.inspection_type?.replace('_', '-')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {inspection.inspector_name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {inspection.primary_contact_name || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(inspection.start_time).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  inspection.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : inspection.status === 'in_progress'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {inspection.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {inspection.duration_seconds 
                                  ? `${Math.floor(inspection.duration_seconds / 60)}m`
                                  : 'N/A'
                                }
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  {inspection.status === 'in_progress' && (
                                    <Link to={`/dashboard/inspections/${inspection.id}`}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<Camera size={16} />}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        Continue
                                      </Button>
                                    </Link>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    isLoading={deletingInspections.has(inspection.id)}
                                    disabled={deletingInspections.has(inspection.id)}
                                    leftIcon={<Trash2 size={16} />}
                                    onClick={() => handleDeleteInspection(inspection.id)}
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
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="mx-auto h-16 w-16 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">No Inspections Yet</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Inspection history will appear here once you complete inspections for this property.
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
            </>
          )}
        </div>
      </div>

      {/* Property Form Modal */}
      {showPropertyForm && property && (
        <PropertyForm
          property={property}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          loading={formLoading}
        />
      )}
    </div>
  );
};

// New Checklist Builder Component
interface ChecklistBuilderProps {
  checklistName: string;
  setChecklistName: (name: string) => void;
  availableTemplates: any[];
  selectedTemplates: string[];
  setSelectedTemplates: (templates: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  isEditing: boolean;
}

const ChecklistBuilder: React.FC<ChecklistBuilderProps> = ({
  checklistName,
  setChecklistName,
  availableTemplates,
  selectedTemplates,
  setSelectedTemplates,
  onSave,
  onCancel,
  loading,
  isEditing,
}) => {
  const handleTemplateAdd = (templateId: string) => {
    if (!selectedTemplates.includes(templateId)) {
      setSelectedTemplates([...selectedTemplates, templateId]);
    }
  };

  const handleTemplateRemove = (templateId: string) => {
    setSelectedTemplates(selectedTemplates.filter(id => id !== templateId));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newOrder = Array.from(selectedTemplates);
    const [reorderedItem] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, reorderedItem);

    setSelectedTemplates(newOrder);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Available Templates */}
      <div className="lg:col-span-1">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Available Templates</h4>
          {availableTemplates.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="mx-auto h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">No templates available</p>
              <Link to="/dashboard/templates/new">
                <Button size="sm" className="mt-2">Create Template</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {availableTemplates
                .filter(template => !selectedTemplates.includes(template.id))
                .map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-3 cursor-pointer transition-all hover:border-primary-300 hover:bg-primary-50"
                  onClick={() => handleTemplateAdd(template.id)}
                >
                  <div className="flex items-center">
                    <Plus className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">{template.name}</h5>
                      {template.description && (
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center Panel - Checklist Builder */}
      <div className="lg:col-span-2">
        <div className="space-y-4">
          <Input
            label="Checklist Name"
            value={checklistName}
            onChange={(e) => setChecklistName(e.target.value)}
            placeholder="Enter checklist name"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Inspection Flow (Drag to Reorder)
            </label>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="checklist-templates">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`min-h-[200px] rounded-lg border-2 border-dashed transition-colors p-4 ${
                      snapshot.isDraggingOver 
                        ? 'border-primary-300 bg-primary-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    {selectedTemplates.length === 0 ? (
                      <div className="flex items-center justify-center h-48 text-gray-400">
                        <div className="text-center">
                          <ClipboardCheck className="h-12 w-12 mx-auto mb-4" />
                          <p className="text-lg font-medium">No templates selected</p>
                          <p className="text-sm">Add templates from the left panel</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedTemplates.map((templateId, index) => {
                          const template = availableTemplates.find(t => t.id === templateId);
                          if (!template) return null;
                          
                          return (
                            <Draggable key={templateId} draggableId={templateId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border border-primary-200 bg-primary-50 rounded-lg p-4 transition-all ${
                                    snapshot.isDragging ? 'shadow-lg rotate-1 scale-105' : 'shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="cursor-move p-1 text-gray-400 hover:text-gray-600 mr-3 rounded hover:bg-white/50 transition-colors"
                                      >
                                        <GripVertical size={16} />
                                      </div>
                                      <div className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 rounded-full text-xs font-medium mr-3">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                                        {template.description && (
                                          <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleTemplateRemove(templateId)}
                                      leftIcon={<X size={16} />}
                                    />
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={selectedTemplates.length === 0 || !checklistName.trim()}
              isLoading={loading}
            >
              {isEditing ? 'Update Checklist' : 'Create Checklist'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;
