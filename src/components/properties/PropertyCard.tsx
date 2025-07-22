import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Bed, Bath, MoreVertical, Edit, Trash2, ClipboardCheck } from 'lucide-react';
import { Property } from '../../types';
import { Button } from '../ui/Button';
import { getPropertyChecklist } from '../../lib/propertyChecklists';
import { toast } from 'sonner';

interface PropertyCardProps {
  property: Property;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  isAdmin: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onEdit, onDelete, isAdmin }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(true);

  useEffect(() => {
    const checkChecklist = async () => {
      setChecklistLoading(true);
      try {
        const checklist = await getPropertyChecklist(property.id);
        setHasChecklist(!!checklist); // Set to true if checklist exists
      } catch (error) {
        console.error('Error checking property checklist:', error);
        setHasChecklist(false); // Assume no checklist on error
      } finally {
        setChecklistLoading(false);
      }
    };
    checkChecklist();
  }, [property.id]); // Re-run when property ID changes

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
    return bedrooms === 'studio' ? 'Studio' : `${bedrooms} Bed`;
  };

  const handleInspectClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasChecklist || checklistLoading) {
      e.preventDefault(); // Prevent navigation if disabled
      if (!checklistLoading) toast.info('Please create an inspection checklist for this property first.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Property Image Placeholder */}
      <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">{getPropertyTypeIcon(property.type)}</span>
        </div>
        
        {/* Property Type Badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/90 text-gray-700 capitalize">
            {property.type}
          </span>
        </div>

        {/* Actions Menu */}
        {isAdmin && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              >
                <MoreVertical size={16} className="text-gray-600" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={() => {
                      onEdit(property);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit Property
                  </button>
                  <button
                    onClick={() => {
                      onDelete(property);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete Property
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
            {property.name}
          </h3>
          <div className="flex items-start text-gray-500 text-sm">
            <MapPin size={16} className="mr-1 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{property.address}</span>
          </div>
        </div>

        {/* Property Stats */}
        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Bed size={16} className="mr-1" />
            <span>{formatBedrooms(property.bedrooms)}</span>
          </div>
          <div className="flex items-center">
            <Bath size={16} className="mr-1" />
            <span>{property.bathrooms} Bath</span>
          </div>
        </div>

        {/* Notes Preview */}
        {property.notes && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 line-clamp-2">{property.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Link to={`/dashboard/properties/${property.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Building2 size={16} className="mr-2" />
              View Details
            </Button>
          </Link>
          <Link 
            to={`/start-inspection/${property.id}`} 
            className="flex-1"
            onClick={handleInspectClick}
          >
            <Button 
              variant="default" 
              size="sm" 
              className="w-full"
              disabled={!hasChecklist || checklistLoading}
            >
              <ClipboardCheck size={16} className="mr-2" />
              Inspect
            </Button>
          </Link>
        </div>

        {/* Created Date */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Added {new Date(property.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;