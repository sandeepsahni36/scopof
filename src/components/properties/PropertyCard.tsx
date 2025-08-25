// src/components/properties/PropertyCard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MoreVertical,
  MapPin,
  Bed,
  Bath,
  Calendar,
  CheckCircle,
  Edit,
  Trash2,
  Camera,
  BarChart3,
} from 'lucide-react';
import { Property } from '../../types';
import { getPropertyChecklist } from '../../lib/propertyChecklists';
import { supabase, devModeEnabled } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { getPropertyTypeIcon } from '../../lib/utils';

interface PropertyCardProps {
  property: Property;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  isAdmin: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onEdit, onDelete, isAdmin }) => {
  const { canStartInspections, storageStatus } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [inspectionHistory, setInspectionHistory] = useState<number[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadChecklistStatus();
    loadInspectionHistory();
  }, [property.id]);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setShowMenu(false);
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onEsc);
    };
  }, [showMenu]);

  const loadChecklistStatus = async () => {
    try {
      setChecklistLoading(true);
      const checklist = await getPropertyChecklist(property.id);
      setHasChecklist(!!checklist);
    } catch {
      setHasChecklist(false);
    } finally {
      setChecklistLoading(false);
    }
  };

  const loadInspectionHistory = async () => {
    try {
      setHistoryLoading(true);

      if (devModeEnabled()) {
        setInspectionHistory([0, 1, 2, 1, 3, 2, 1, 4, 2, 1, 2, 3]);
        return;
      }

      const monthlyData: number[] = [];
      const now = new Date();

      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        const { count } = await supabase
          .from('inspections')
          .select('id', { count: 'exact' })
          .eq('property_id', property.id)
          .eq('status', 'completed')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        monthlyData.push(count || 0);
      }

      setInspectionHistory(monthlyData);
    } catch {
      setInspectionHistory(Array(12).fill(0));
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatBedrooms = (bedrooms: string) => (bedrooms === 'studio' ? 'Studio' : `${bedrooms} BR`);
  const formatBathrooms = (bathrooms: string) => `${bathrooms} BA`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group">
      {/* Property Image / header */}
      <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">{getPropertyTypeIcon(property.type)}</span>
        </div>

        {/* Checklist badge */}
        <div className="absolute top-3 left-3">
          {checklistLoading ? (
            <div className="h-6 w-14 bg-white/80 rounded-full animate-pulse" />
          ) : hasChecklist ? (
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready
            </div>
          ) : (
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Setup Required
            </div>
          )}
        </div>

        {/* Admin menu */}
        {isAdmin && (
          <div className="absolute top-3 right-3 z-[60]">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors shadow-sm"
                aria-haspopup="menu"
                aria-expanded={showMenu}
                aria-label="Open property actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 sm:w-48 rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden z-[80]"
                >
                  <button
                    onClick={() => {
                      onEdit(property);
                      setShowMenu(false);
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Property
                  </button>
                  <button
                    onClick={() => {
                      onDelete(property);
                      setShowMenu(false);
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Property
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{property.name}</h3>
          <div className="flex items-start text-gray-600 mb-3">
            <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-sm line-clamp-2">{property.address}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-600">
              <Bed size={16} className="mr-1" />
              <span className="text-sm font-medium">{formatBedrooms(property.bedrooms)}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Bath size={16} className="mr-1" />
              <span className="text-sm font-medium">{formatBathrooms(property.bathrooms)}</span>
            </div>
          </div>
          <span className="text-xs text-gray-500 capitalize">{property.type}</span>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center text-xs text-gray-500">
            <Calendar size={14} className="mr-1" />
            <span>Added {new Date(property.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Link to={`/dashboard/properties/${property.id}`}>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                View Details
              </button>
            </Link>

            {hasChecklist && canStartInspections && (
              <Link to={`/start-inspection/${property.id}`}>
                <button className="inline-flex items-center text-sm text-green-600 hover:text-green-700 font-medium">
                  <Camera size={14} className="mr-1" />
                  Inspect
                </button>
              </Link>
            )}

            {hasChecklist && !canStartInspections && (
              <button
                className="inline-flex items-center text-sm text-gray-400 font-medium cursor-not-allowed"
                title={
                  storageStatus.status === 'critical'
                    ? 'Storage limit reached - cannot start inspections'
                    : 'Upgrade required to start inspections'
                }
                disabled
              >
                <Camera size={14} className="mr-1" />
                Inspect
              </button>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">12-Month Activity</span>
            <BarChart3 size={12} className="text-gray-400" />
          </div>

          {historyLoading ? (
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
          ) : (
            <div className="flex items-end space-x-1 h-8">
              {inspectionHistory.map((count, index) => {
                const maxCount = Math.max(...inspectionHistory, 1);
                const height = Math.max((count / maxCount) * 100, count > 0 ? 10 : 2);
                return (
                  <div
                    key={index}
                    className={`flex-1 rounded-sm transition-all duration-200 ${
                      count > 0 ? 'bg-primary-500 hover:bg-primary-600' : 'bg-gray-200'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${count} inspection${count !== 1 ? 's' : ''} ${
                      index === 11 ? 'this month' : `${11 - index} month${11 - index !== 1 ? 's' : ''} ago`
                    }`}
                  />
                );
              })}
            </div>
          )}

          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>12mo</span>
            <span>Now</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
