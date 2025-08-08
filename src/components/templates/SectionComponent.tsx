import React from 'react';
import { Droppable, Draggable, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { Trash2, GripVertical, Plus, ChevronDown, ChevronRight, FolderPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import ItemComponent from './ItemComponent';

interface SectionComponentProps {
  section: any;
  sectionIndex: number;
  children: Array<{ item: any; index: number }>;
  isExpanded: boolean;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  register: any;
  watch: any;
  setValue: any;
  errors: any;
  onRemove: (index: number) => void;
  onToggleExpansion: (sectionIndex: number) => void;
  onAddItem: (type: string, parentIndex?: number) => void;
  onAddOption: (itemIndex: number) => void;
  onRemoveOption: (itemIndex: number, optionIndex: number) => void;
  reportServiceTeams: any[];
}

const SectionComponent: React.FC<SectionComponentProps> = ({
  section,
  sectionIndex,
  children,
  isExpanded,
  provided,
  snapshot,
  register,
  watch,
  setValue,
  errors,
  onRemove,
  onToggleExpansion,
  onAddItem,
  onAddOption,
  onRemoveOption,
  reportServiceTeams,
}) => {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`border border-gray-200 rounded-lg bg-blue-50 transition-all duration-200 ${
        snapshot.isDragging ? 'shadow-lg rotate-1 scale-105' : 'shadow-sm'
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div
              {...provided.dragHandleProps}
              className="cursor-move p-1 text-gray-400 hover:text-gray-600 mr-2 rounded hover:bg-gray-100 transition-colors"
              title="Drag to reorder"
            >
              <GripVertical size={20} />
            </div>
            <button
              type="button"
              onClick={() => onToggleExpansion(sectionIndex)}
              className="p-1 text-gray-600 hover:text-gray-800 mr-2"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <span className="text-sm font-medium text-gray-900">
              Section - {section.type.replace('_', ' ')} ({children.length} items)
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(sectionIndex)}
            leftIcon={<Trash2 size={16} />}
          >
            Remove
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Section Name"
            error={errors.items?.[sectionIndex]?.sectionName?.message}
            {...register(`items.${sectionIndex}.sectionName` as const, {
              required: 'Section name is required',
            })}
            placeholder="Enter section name"
          />
        </div>

        {/* Section Children */}
        {isExpanded && (
          <div className="mt-6 pl-6 border-l-2 border-blue-200">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Section Items</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAddItem('text', sectionIndex)}
                  leftIcon={<Plus size={16} />}
                >
                  Add Text Field
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAddItem('single_choice', sectionIndex)}
                  leftIcon={<Plus size={16} />}
                >
                  Add Single Choice
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAddItem('multiple_choice', sectionIndex)}
                  leftIcon={<Plus size={16} />}
                >
                  Add Multiple Choice
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAddItem('photo', sectionIndex)}
                  leftIcon={<Plus size={16} />}
                >
                  Add Photo Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAddItem('divider', sectionIndex)}
                  leftIcon={<Plus size={16} />}
                >
                  Add Divider
                </Button>
              </div>
            </div>

            {/* Droppable area for section children */}
            <Droppable droppableId={`section-${section.id}`} type="ITEM">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`space-y-3 min-h-[100px] rounded-lg border-2 border-dashed transition-colors ${
                    snapshot.isDraggingOver 
                      ? 'border-primary-300 bg-primary-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {children.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-gray-400">
                      <div className="text-center">
                        <FolderPlus className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Drop items here or use buttons above</p>
                      </div>
                    </div>
                  )}
                  {children.map(({ item: childItem, index: childIndex }, childArrayIndex) => (
                    <Draggable key={childItem.id} draggableId={childItem.id} index={childArrayIndex}>
                      {(childProvided, childSnapshot) => (
                        <ItemComponent
                          item={childItem}
                          index={childIndex}
                          provided={childProvided}
                          snapshot={childSnapshot}
                          register={register}
                          watch={watch}
                          setValue={setValue}
                          errors={errors}
                          onRemove={onRemove}
                          onAddOption={onAddOption}
                          onRemoveOption={onRemoveOption}
                          reportServiceTeams={reportServiceTeams}
                        />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionComponent;