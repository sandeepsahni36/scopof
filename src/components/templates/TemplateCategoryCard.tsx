import React, { useState } from 'react';
import { Folder, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { TemplateCategory } from '../../types';

interface TemplateCategoryCardProps {
  category: TemplateCategory;
  templateCount: number;
  isDraggedOver?: boolean;
  onDelete?: (categoryId: string) => void;
}

const TemplateCategoryCard: React.FC<TemplateCategoryCardProps> = ({
  category,
  templateCount,
  isDraggedOver = false,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`
        bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-6 relative group
        transition-all duration-200 hover:bg-blue-100 hover:border-blue-300
        ${isDraggedOver ? 'bg-blue-100 border-blue-400 scale-105 shadow-lg' : ''}
        overflow-hidden                      /* ← NEW: keep popover within the card */
      `}
    >
      {/* Category Menu */}
      {onDelete && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-30">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className="
                  absolute right-0 mt-2 w-44                      /* ← was w-48 */
                  max-w-[calc(100%-0.75rem)]                      /* ← NEW: fit inside (0.75rem = right-3) */
                  bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50
                "
              >
                <button
                  onClick={() => {
                    onDelete(category.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Category
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="h-12 w-12 bg-blue-200 rounded-lg flex items-center justify-center mx-auto mb-3">
          <Folder className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-blue-900 mb-1">
          {category.name}
        </h3>
        <p className="text-sm text-blue-700">
          {templateCount} template{templateCount !== 1 ? 's' : ''}
        </p>
        <div className="mt-3 text-xs text-blue-600 flex items-center justify-center">
          <Plus className="h-3 w-3 mr-1" />
          Drop templates here
        </div>
      </div>
    </div>
  );
};

export default TemplateCategoryCard;
