import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Pencil, Copy, Trash2, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Template } from '../../types';

interface TemplateDisplayCardProps {
  template: Template;
  onDuplicate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  isDragging?: boolean;
}

const TemplateDisplayCard: React.FC<TemplateDisplayCardProps> = ({
  template,
  onDuplicate,
  onDelete,
  isDragging = false,
}) => {
  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md 
        transition-all duration-200 group
        ${isDragging ? 'opacity-50 rotate-2 scale-105 shadow-lg' : ''}
      `}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
              <LayoutTemplate className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 line-clamp-1">
                {template.name}
              </h3>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(template.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {template.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Link to={`/dashboard/templates/${template.id}`}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Pencil size={14} />}
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
            >
              Edit
            </Button>
          </Link>
          
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Copy size={14} />}
              onClick={() => onDuplicate(template.id)}
              className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
            >
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => onDelete(template.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDisplayCard;