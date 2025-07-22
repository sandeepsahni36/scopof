import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, ArrowLeft, FolderPlus, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TemplateItemType, TemplateItem } from '../../types';
import { getTemplate, createTemplate, updateTemplate } from '../../lib/templates';
import { getReportServiceTeams, ReportServiceTeam } from '../../lib/reportServiceTeams';
import { toast } from 'sonner';

type FormValues = {
  name: string;
  description: string;
  items: {
    id?: string;
    parentId?: string;
    type: TemplateItemType;
    label: string;
    sectionName?: string;
    required: boolean;
    options?: string[];
    reportEnabled: boolean;
    reportRecipientId?: string;
  }[];
};

const TemplateDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [reportServiceTeams, setReportServiceTeams] = useState<ReportServiceTeam[]>([]);
  const isNew = id === 'new';

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      description: '',
      items: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);

      // Load report service teams
      const teamsData = await getReportServiceTeams();
      if (teamsData) {
        setReportServiceTeams(teamsData);
      }

      // Load template if editing
      if (!isNew && id) {
        const templateData = await getTemplate(id);
        if (templateData) {
          setValue('name', templateData.template.name);
          setValue('description', templateData.template.description || '');
          
          // Convert hierarchical items to flat structure for form
          const flatItems = flattenTemplateItems(templateData.items);
          setValue('items', flatItems);
          
          // Expand all sections by default
          const sectionIndexes = flatItems
            .map((item, index) => item.type === 'section' ? index : -1)
            .filter(index => index !== -1);
          setExpandedSections(new Set(sectionIndexes));
        } else {
          toast.error('Template not found');
          navigate('/dashboard/templates');
        }
      }
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load template data');
      navigate('/dashboard/templates');
    } finally {
      setInitialLoading(false);
    }
  };

  const flattenTemplateItems = (items: TemplateItem[]): FormValues['items'] => {
    const result: FormValues['items'] = [];
    
    const processItems = (itemList: TemplateItem[], parentId?: string) => {
      itemList
        .sort((a, b) => a.order - b.order)
        .forEach(item => {
          result.push({
            id: item.id,
            parentId: parentId,
            type: item.type,
            label: item.label,
            sectionName: item.sectionName || undefined,
            required: item.required,
            options: item.options || undefined,
            reportEnabled: item.reportEnabled,
            reportRecipientId: item.reportRecipientId || undefined,
          });
          
          // Process children if they exist
          if (item.children && item.children.length > 0) {
            processItems(item.children, item.id);
          }
        });
    };
    
    // First process root items (no parent)
    const rootItems = items.filter(item => !item.parentId);
    processItems(rootItems);
    
    return result;
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);

      const templateData = {
        name: data.name,
        description: data.description || undefined,
      };

      // Convert flat items back to API format
      const apiItems = data.items.map((item, index) => ({
        parentId: item.parentId,
        type: item.type,
        label: item.label,
        sectionName: item.sectionName,
        required: item.required,
        options: item.options,
        reportEnabled: item.reportEnabled,
        reportRecipientId: item.reportRecipientId,
        order: index + 1,
      }));

      if (isNew) {
        const result = await createTemplate(templateData, apiItems);
        if (result) {
          toast.success('Template created successfully');
          navigate('/dashboard/templates');
        }
      } else {
        const result = await updateTemplate(id!, templateData, apiItems);
        if (result) {
          toast.success('Template updated successfully');
          navigate('/dashboard/templates');
        }
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (type: TemplateItemType, parentIndex?: number) => {
    const newItem = {
      parentId: parentIndex !== undefined ? fields[parentIndex].id : undefined,
      type,
      label: '',
      sectionName: type === 'section' ? '' : undefined,
      required: false,
      options: type === 'single_choice' || type === 'multiple_choice' ? [''] : undefined,
      reportEnabled: false,
      reportRecipientId: undefined,
    };

    if (parentIndex !== undefined) {
      // Add after the parent section and its children
      const insertIndex = findInsertIndexAfterSection(parentIndex);
      append(newItem);
      // Move the new item to the correct position
      move(fields.length, insertIndex);
    } else {
      append(newItem);
    }
  };

  const findInsertIndexAfterSection = (sectionIndex: number): number => {
    const sectionId = fields[sectionIndex].id;
    let insertIndex = sectionIndex + 1;
    
    // Find the end of this section's children
    for (let i = sectionIndex + 1; i < fields.length; i++) {
      if (fields[i].parentId === sectionId) {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    
    return insertIndex;
  };

  const addOptionToItem = (itemIndex: number) => {
    const currentOptions = watch(`items.${itemIndex}.options`) || [];
    setValue(`items.${itemIndex}.options`, [...currentOptions, '']);
  };

  const removeOptionFromItem = (itemIndex: number, optionIndex: number) => {
    const currentOptions = watch(`items.${itemIndex}.options`) || [];
    const newOptions = currentOptions.filter((_, index) => index !== optionIndex);
    setValue(`items.${itemIndex}.options`, newOptions);
  };

  const toggleSection = (sectionIndex: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionIndex)) {
      newExpanded.delete(sectionIndex);
    } else {
      newExpanded.add(sectionIndex);
    }
    setExpandedSections(newExpanded);
  };

  const getSectionChildren = (sectionIndex: number) => {
    const sectionId = fields[sectionIndex].id;
    return fields
      .map((field, index) => ({ field, index }))
      .filter(({ field }) => field.parentId === sectionId);
  };

  const isChildOfSection = (itemIndex: number) => {
    return fields[itemIndex].parentId !== undefined;
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    // If dropped outside a valid droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (destination.index === source.index) {
      return;
    }

    // Move the item to the new position
    move(source.index, destination.index);
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/dashboard/templates')}
        >
          Back to Templates
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Create Template' : 'Edit Template'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            <Input
              label="Template Name"
              error={errors.name?.message}
              {...register('name', { required: 'Template name is required' })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Optional description for this template..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900">Template Items</h2>
            <p className="mt-1 text-sm text-gray-500">
              Add sections and items for this template. Items can be organized within sections.
            </p>
          </div>

          <div className="space-y-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="template-items">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
                  >
                    {fields.map((field, index) => {
                      const isSection = field.type === 'section';
                      const isChild = isChildOfSection(index);
                      const isExpanded = expandedSections.has(index);
                      const sectionChildren = isSection ? getSectionChildren(index) : [];

                      // Don't render child items directly - they're rendered within sections
                      if (isChild && !isSection) {
                        return null;
                      }

                      return (
                        <Draggable key={field.id} draggableId={field.id || `item-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border border-gray-200 rounded-lg transition-all duration-200 ${
                                isSection ? 'bg-blue-50' : 'bg-white'
                              } ${
                                snapshot.isDragging ? 'shadow-lg rotate-2 scale-105' : 'shadow-sm'
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
                                    {isSection && (
                                      <button
                                        type="button"
                                        onClick={() => toggleSection(index)}
                                        className="p-1 text-gray-600 hover:text-gray-800 mr-2"
                                      >
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                      </button>
                                    )}
                                    <span className="text-sm font-medium text-gray-900">
                                      {isSection ? 'Section' : `Item ${index + 1}`} - {field.type.replace('_', ' ')}
                                      {isSection ? 'Section' : field.type === 'divider' ? 'Divider' : `Item ${index + 1}`} - {field.type.replace('_', ' ')}
                                      {isSection && ` (${sectionChildren.length} items)`}
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => remove(index)}
                                    leftIcon={<Trash2 size={16} />}
                                  >
                                    Remove
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  {isSection ? (
                                    <Input
                                      label="Section Name"
                                      error={errors.items?.[index]?.sectionName?.message}
                                      {...register(`items.${index}.sectionName` as const, {
                                        required: 'Section name is required',
                                      })}
                                      placeholder="Enter section name"
                                    />
                                  ) : field.type === 'divider' ? (
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

                                  {!isSection && (
                                  {!isSection && field.type !== 'divider' && (
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

                                      {(field.type === 'single_choice' || field.type === 'multiple_choice') && (
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
                                                  onClick={() => removeOptionFromItem(index, optionIndex)}
                                                  leftIcon={<Trash2 size={16} />}
                                                />
                                              </div>
                                            ))}
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => addOptionToItem(index)}
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

                                {/* Section Children */}
                                {isSection && isExpanded && (
                                  <div className="mt-6 pl-6 border-l-2 border-blue-200">
                                    <div className="mb-4">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Section Items</h4>
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAddItem('text', index)}
                                          leftIcon={<Plus size={16} />}
                                        >
                                          Add Text Field
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAddItem('single_choice', index)}
                                          leftIcon={<Plus size={16} />}
                                        >
                                          Add Single Choice
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAddItem('multiple_choice', index)}
                                          leftIcon={<Plus size={16} />}
                                        >
                                          Add Multiple Choice
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAddItem('photo', index)}
                                          leftIcon={<Plus size={16} />}
                                        >
                                          Add Photo Upload
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAddItem('divider', index)}
                                          leftIcon={<Plus size={16} />}
                                        >
                                          Add Divider
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAddItem('divider', index)}
                                          leftIcon={<Plus size={16} />}
                                        >
                                          Add Divider
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Render section children */}
                                    <div className="space-y-3">
                                      {sectionChildren.map(({ field: childField, index: childIndex }) => (
                                        <div key={childField.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                          <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center">
                                              <button
                                                type="button"
                                                className="cursor-move p-1 text-gray-400 hover:text-gray-600"
                                              >
                                                <GripVertical size={16} />
                                              </button>
                                              <span className="ml-2 text-sm font-medium text-gray-900">
                                                {childField.type.replace('_', ' ')}
                                              </span>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => remove(childIndex)}
                                              leftIcon={<Trash2 size={16} />}
                                            >
                                              Remove
                                            </Button>
                                          </div>

                                          <div className="grid grid-cols-1 gap-4">
                                            <Input
                                              label="Label"
                                              error={errors.items?.[childIndex]?.label?.message}
                                              {...register(`items.${childIndex}.label` as const, {
                                                required: childField.type !== 'divider' ? 'Label is required' : false,
                                              })}
                                            />

                                            <div className="flex items-center space-x-4">
                                            {childField.type !== 'divider' && (
                                              <div className="flex items-center space-x-4">
                                              <label className="flex items-center">
                                                <input
                                                  type="checkbox"
                                                  {...register(`items.${childIndex}.required` as const)}
                                                  className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-900">Required</span>
                                              </label>

                                              <label className="flex items-center">
                                                <input
                                                  type="checkbox"
                                                  {...register(`items.${childIndex}.reportEnabled` as const)}
                                                  className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-900">Enable Reporting</span>
                                              </label>
                                            </div>
                                              </div>
                                            )}

                                            {childField.type === 'divider' && (
                                              <div className="py-4">
                                                <div className="border-t border-gray-300"></div>
                                                <p className="text-sm text-gray-500 text-center mt-2">
                                                  Visual divider - no configuration needed
                                                </p>
                                              </div>
                                            )}

                                            {watch(`items.${childIndex}.reportEnabled`) && (
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                  Report Recipient
                                                </label>
                                                <select
                                                  {...register(`items.${childIndex}.reportRecipientId` as const, {
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
                                                {errors.items?.[childIndex]?.reportRecipientId && (
                                                  <p className="mt-1 text-sm text-red-600">
                                                    {errors.items[childIndex]?.reportRecipientId?.message}
                                                  </p>
                                                )}
                                                {reportServiceTeams.length === 0 && (
                                                  <p className="mt-1 text-sm text-amber-600">
                                                    No teams available. Add teams in Company Settings first.
                                                  </p>
                                                )}
                                              </div>
                                            )}

                                            {(childField.type === 'single_choice' || childField.type === 'multiple_choice') && (
                                              <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                  Options
                                                </label>
                                                <div className="space-y-2">
                                                  {(watch(`items.${childIndex}.options`) || []).map((_, optionIndex) => (
                                                    <div key={optionIndex} className="flex items-center space-x-2">
                                                      <Input
                                                        {...register(
                                                          `items.${childIndex}.options.${optionIndex}` as const,
                                                          { required: 'Option is required' }
                                                        )}
                                                        placeholder={`Option ${optionIndex + 1}`}
                                                      />
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeOptionFromItem(childIndex, optionIndex)}
                                                        leftIcon={<Trash2 size={16} />}
                                                      />
                                                    </div>
                                                  ))}
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addOptionToItem(childIndex)}
                                                    leftIcon={<Plus size={16} />}
                                                  >
                                                    Add Option
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddItem('section')}
                leftIcon={<FolderPlus size={16} />}
              >
                Add Section
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddItem('text')}
                leftIcon={<Plus size={16} />}
              >
                Add Text Field
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddItem('single_choice')}
                leftIcon={<Plus size={16} />}
              >
                Add Single Choice
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddItem('multiple_choice')}
                leftIcon={<Plus size={16} />}
              >
                Add Multiple Choice
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddItem('photo')}
                leftIcon={<Plus size={16} />}
              >
                Add Photo Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddItem('divider')}
                leftIcon={<Plus size={16} />}
              >
                Add Divider
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/dashboard/templates')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            {isNew ? 'Create Template' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TemplateDetailPage;