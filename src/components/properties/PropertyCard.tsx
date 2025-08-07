import React, { useState, useEffect } from 'react';
import { MoreVertical, MapPin, Home, Building, Calendar, CheckCircle } from 'lucide-react';
import { Property } from '../../types';
import { getPropertyChecklists } from '../../lib/propertyChecklists';

interface PropertyCardProps {
  property: Property;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  isAdmin: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onEdit, onDelete, isAdmin }) => {
  const [showMenu, setShowMenu] = useState(false); // State to control dropdown visibility
   const [hasChecklist, setHasChecklist] = useState(false);
   const [checklistLoading, setChecklistLoading] = useState(true);

   return (
     <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group">
       {/* Property Image Placeholder */}
      <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-visible">
         <div className="absolute inset-0 flex items-center justify-center">
           <span className="text-4xl">{getPropertyTypeIcon(property.type)}</span>
         </div>

        {isAdmin && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button // Button to toggle the dropdown menu
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onEdit(property);
                    }}
                  >
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
     </div>
   );
};

export default PropertyCard;