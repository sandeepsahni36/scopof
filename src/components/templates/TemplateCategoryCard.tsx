import React from 'react';
import { Folder, Plus } from 'lucide-react';
import { TemplateCategory } from '../../types';

interface TemplateCategoryCardProps {
  category: TemplateCategory;
  templateCount: number;
  isDraggedOver?: boolean;
}

const TemplateCategoryCard: React.FC<TemplateCategoryCardProps> = ({
  category,
  templateCount,
  isDraggedOver = false,
}) => {
  return (
    <div
      className={`
        bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-6 
        transition-all duration-200 hover:bg-blue-100 hover:border-blue-300
        ${isDraggedOver ? 'bg-blue-100 border-blue-400 scale-105 shadow-lg' : ''}
      `}
    >
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