import React from 'react';
import { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { Trash2, GripVertical, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ItemComponentProps {
  item: any;
  index: number;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  register: any;
  watch: any;
  setValue: any;
  errors: any;
  onRemove: (index: number) => void;
  onAddOption: (itemIndex: number) => void;
  onRemoveOption: (itemIndex: number, optionIndex: number) => void;
  reportServiceTeams: any[];
}

const ItemComponent: React.FC<ItemComponentProps> = ({
  item,
  index,
  provided,
  snapshot,
  register,
  watch,
  setValue,
  errors,
  onRemove,
  onAddOption,
  onRemoveOption,
  reportServiceTeams,
}) => {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`border border-gray-200 rounded-lg bg-white transition-all duration-200 ${
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
            <span className="text-sm font-medium text-gray-900">
              Item {index + 1} - {item.type.replace('_', ' ')}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            leftIcon={<Trash2 size={16} />}
          >
            Remove
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {item.type === 'divider' ? (
            <div className="py-4">
              <div className="border-t border-gray-300"></div>
              <p className="text-sm text-gray-500 text-center mt-2">
                Visual divider - no configuration needed
              </p>
            </div>
          ) : (
            <Input
              label="Label"
              error={errors.items?.[index]?.label?.message}
              {...register(`items.${index}.label` as const, {
                required: 'Label is required',
              })}
            />
          )}

          {item.type !== 'divider' && (
            <>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register(`items.${index}.required` as const)}
                    className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">Required</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register(`items.${index}.reportEnabled` as const)}
                    className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">Enable Reporting</span>
                </label>
              </div>

              {watch(`items.${index}.reportEnabled`) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Recipient
                  </label>
                  <select
                    {...register(`items.${index}.reportRecipientId` as const, {
                      required: 'Report recipient is required when reporting is enabled',
                    })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select a team...</option>
                    {reportServiceTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.designation} ({team.email})
                      </option>
                    ))}
                  </select>
                  {errors.items?.[index]?.reportRecipientId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.items[index]?.reportRecipientId?.message}
                    </p>
                  )}
                  {reportServiceTeams.length === 0 && (
                    <p className="mt-1 text-sm text-amber-600">
                      No teams available. Add teams in Company Settings first.
                    </p>
                  )}
                </div>
              )}

              {(item.type === 'single_choice' || item.type === 'multiple_choice') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    {(watch(`items.${index}.options`) || []).map((_, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <Input
                          {...register(
                            `items.${index}.options.${optionIndex}` as const,
                            { required: 'Option is required' }
                          )}
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveOption(index, optionIndex)}
                          leftIcon={<Trash2 size={16} />}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onAddOption(index)}
                      leftIcon={<Plus size={16} />}
                    >
                      Add Option
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemComponent;