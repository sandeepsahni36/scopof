import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Filter, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Property } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { getProperties, createProperty, updateProperty, deleteProperty, checkPropertyLimit } from '../../lib/properties';
import PropertyCard from '../../components/properties/PropertyCard';
import PropertyForm, { PropertyFormData } from '../../components/properties/PropertyForm';
import { toast } from 'sonner';

interface Filters {
  type: string;
  bedrooms: string;
  bathrooms: string;
}

function PropertiesPage() {
  const { isAdmin } = useAuthStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    bedrooms: 'all',
    bathrooms: 'all'
  });
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [propertyLimits, setPropertyLimits] = useState<any>(null);

  useEffect(() => {
    loadProperties();
    if (isAdmin) {
      loadPropertyLimits();
    }
  }, [searchTerm, filters]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await getProperties(searchTerm, filters);
      if (data) {
        setProperties(data);
      }
    } catch (error: any) {
      console.error('Error loading properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyLimits = async () => {
    try {
      const limits = await checkPropertyLimit();
      setPropertyLimits(limits);
    } catch (error) {
      console.error('Error loading property limits:', error);
    }
  };

  const handleAddProperty = () => {
    if (!isAdmin) {
      toast.error('Only admins can add properties');
      return;
    }

    if (propertyLimits && !propertyLimits.canCreate) {
      toast.error(`Property limit reached (${propertyLimits.limit}). Please upgrade your plan to add more properties.`);
      return;
    }

    setEditingProperty(null);
    setShowPropertyForm(true);
  };

  const handleEditProperty = (property: Property) => {
    if (!isAdmin) {
      toast.error('Only admins can edit properties');
      return;
    }

    setEditingProperty(property);
    setShowPropertyForm(true);
  };

  const handleDeleteProperty = async (property: Property) => {
    if (!isAdmin) {
      toast.error('Only admins can delete properties');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${property.name}"? This action cannot be undone.`)) {
      try {
        const success = await deleteProperty(property.id);
        if (success) {
          toast.success('Property deleted successfully');
          loadProperties();
          loadPropertyLimits();
        }
      } catch (error: any) {
        console.error('Error deleting property:', error);
        toast.error('Failed to delete property');
      }
    }
  };

  const handleFormSubmit = async (data: PropertyFormData) => {
    try {
      setFormLoading(true);

      if (editingProperty) {
        const updatedProperty = await updateProperty(editingProperty.id, data);
        if (updatedProperty) {
          toast.success('Property updated successfully');
        }
      } else {
        const newProperty = await createProperty({
          ...data,
          companyId: '', // This will be set by the backend
        });
        if (newProperty) {
          toast.success('Property added successfully');
        }
      }

      setShowPropertyForm(false);
      setEditingProperty(null);
      loadProperties();
      loadPropertyLimits();
    } catch (error: any) {
      console.error('Error saving property:', error);
      toast.error(editingProperty ? 'Failed to update property' : 'Failed to add property');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowPropertyForm(false);
    setEditingProperty(null);
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = searchTerm === '' || 
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filters.type === 'all' || property.type === filters.type;
    const matchesBedrooms = filters.bedrooms === 'all' || property.bedrooms === filters.bedrooms;
    const matchesBathrooms = filters.bathrooms === 'all' || property.bathrooms === filters.bathrooms;
    
    return matchesSearch && matchesType && matchesBedrooms && matchesBathrooms;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="mt-1 text-lg text-gray-500">
            Manage your property portfolio
          </p>
          {propertyLimits && (
            <div className="mt-2 flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {propertyLimits.currentCount} of {propertyLimits.limit === Infinity ? '∞' : propertyLimits.limit} properties used
              </span>
              {propertyLimits.currentCount >= propertyLimits.limit * 0.8 && propertyLimits.limit !== Infinity && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <AlertTriangle size={12} className="mr-1" />
                  Approaching limit
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<Filter size={20} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          {isAdmin && (
            <Button
              leftIcon={<Plus size={20} />}
              onClick={handleAddProperty}
              disabled={propertyLimits && !propertyLimits.canCreate}
            >
              Add Property
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search properties by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="border-t border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="all">All Types</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="villa">Villa</option>
                  <option value="condo">Condo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bedrooms
                </label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="all">Any</option>
                  <option value="studio">Studio</option>
                  <option value="1">1 Bedroom</option>
                  <option value="2">2 Bedrooms</option>
                  <option value="3">3 Bedrooms</option>
                  <option value="4">4 Bedrooms</option>
                  <option value="5+">5+ Bedrooms</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bathrooms
                </label>
                <select
                  value={filters.bathrooms}
                  onChange={(e) => setFilters({ ...filters, bathrooms: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="all">Any</option>
                  <option value="1">1 Bathroom</option>
                  <option value="2">2 Bathrooms</option>
                  <option value="3">3 Bathrooms</option>
                  <option value="4">4 Bathrooms</option>
                  <option value="5">5 Bathrooms</option>
                  <option value="6+">6+ Bathrooms</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading properties...</span>
        </div>
      ) : filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={handleEditProperty}
              onDelete={handleDeleteProperty}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-center py-12">
            <Building2 className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {searchTerm || filters.type !== 'all' || filters.bedrooms !== 'all' || filters.bathrooms !== 'all'
                ? 'No properties found'
                : 'No properties yet'}
            </h3>
            <p className="mt-2 text-base text-gray-500">
              {searchTerm || filters.type !== 'all' || filters.bedrooms !== 'all' || filters.bathrooms !== 'all'
                ? "Try adjusting your search or filters to find what you're looking for."
                : isAdmin 
                  ? 'Get started by adding your first property.'
                  : 'Properties will appear here once your admin adds them.'}
            </p>
            {isAdmin && !searchTerm && filters.type === 'all' && filters.bedrooms === 'all' && filters.bathrooms === 'all' && (
              <div className="mt-6">
                <Button
                  leftIcon={<Plus size={20} />}
                  onClick={handleAddProperty}
                  disabled={propertyLimits && !propertyLimits.canCreate}
                >
                  Add Your First Property
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property Form Modal */}
      {showPropertyForm && (
        <PropertyForm
          property={editingProperty || undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          loading={formLoading}
        />
      )}
    </div>
  );
}

export default PropertiesPage;