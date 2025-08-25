// src/pages/templates/TemplateDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, GripVertical, ArrowLeft, Type, CheckSquare, Square, Camera, Hash, Minus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TemplateItemType, RatingOption, RATING_COLORS, TemplateCategory } from '../../types';
import { getTemplate, createTemplate, updateTemplate, getTemplateCategories } from '../../lib/templates';
import { getReportServiceTeams, ReportServiceTeam } from '../../lib/reportServiceTeams';
import { toast } from 'sonner';

type FormValues = {
  name: string;
  description: string;
  categoryId: string;
  items: {
    id: string;
    type: TemplateItemType;
    label: string;
    required: boolean;
    options?: string[] | RatingOption[];
    reportEnabled: boolean;
    reportRecipientId?: string;
  }[];
};

const TemplateDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [reportServiceTeams, setReportServiceTeams] = useState<ReportServiceTeam[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
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
      categoryId: '',
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

      const teamsData = await getReportServiceTeams();
      if (teamsData) setReportServiceTeams(teamsData);

      const categoriesData = await getTemplateCategories();
      if (categoriesData) setCategories(categoriesData);

      if (!isNew && id) {
        const templateData = await getTemplate(id);
        if (templateData) {
          setValue('name', templateData.template.name);
          setValue('description', templateData.template.description || '');
          setValue('categoryId', templateData.template.category_id || '');

          const formItems = templateData.items.map(item => ({
            id: item.id || uuidv4(),
            type: item.type,
            label: item.label,
            required: item.required,
            options: item.options || undefined,
            reportEnabled: item.reportEnabled,
            reportRecipientId: item.reportRecipientId || undefined,
          }));
          setValue('items', formItems);
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

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);

      const templateData = {
        name: data.name,
        description: data.description || undefined,
        categoryId: data.categoryId || undefined,
      };

      const apiItems = data.items.map((item, index) => ({
        id: item.id,
        type: item.type,
        label: item.label,
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

  const handleAddItem = (type: TemplateItemType) => {
    const newItem = {
      id: uuidv4(),
      type,
      label: '',
      required: false,
      options: type === 'single_choice' || type === 'multiple_choice' ? [{ label: '', color: RATING_COLORS.green }] : undefined,
      reportEnabled: false,
      reportRecipientId: undefined,
    };
    append(newItem);
    setSelectedItemIndex(fields.length);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    move(result.source.index, result.destination.index);
  };

  const handleItemSelect = (index: number) => setSelectedItemIndex(index);

  const addOptionToItem = (itemIndex: number) => {
    const currentOptions = (watch(`items.${itemIndex}.options`) as RatingOption[]) || [];
    const newOption = { label: '', color: RATING_COLORS.green };
    setValue(`items.${itemIndex}.options`, [...currentOptions, newOption]);
  };

  const removeOptionFromItem = (itemIndex: number, optionIndex: number) => {
    const currentOptions = (watch(`items.${itemIndex}.options`) as RatingOption[]) || [];
    const newOptions = currentOptions.filter((_, idx) => idx !== optionIndex);
    setValue(`items.${itemIndex}.options`, newOptions);
  };

  const updateOptionLabel = (itemIndex: number, optionIndex: number, label: string) => {
    const currentOptions = (watch(`items.${itemIndex}.options`) as RatingOption[]) || [];
    const next = [...currentOptions];
    next[optionIndex] = { ...next[optionIndex], label };
    setValue(`items.${itemIndex}.options`, next);
  };

  const updateOptionColor = (itemIndex: number, optionIndex: number, color: string) => {
    const currentOptions = (watch(`items.${itemIndex}.options`) as RatingOption[]) || [];
    const next = [...currentOptions];
    next[optionIndex] = { ...next[optionIndex], color };
    setValue(`items.${itemIndex}.options`, next);
  };

  if (initialLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const selectedItem = selectedItemIndex !== null ? fields[selectedItemIndex] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/templates')}>
          Back to Templates
        </Button>
      </div>

      {/* Title */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'Create Template' : 'Edit Template'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="overflow-visible">
        {/* TOP FULL-WIDTH: Template Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Template Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Template Name"
              error={errors.name?.message}
              {...register('name', { required: 'Template name is required' })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                {...register('categoryId')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Optional description for this template..."
              />
            </div>
          </div>
        </div>

        {/* ROW OF THREE CARDS (desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Field Types */}
          <div className="bg-white shadow rounded-lg p-6 lg:sticky lg:top-6 overflow-hidden">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Field Types</h3>

            {/* Never bleed on mobile */}
            <div className="grid grid-cols-1 gap-3">
              <Button type="button" variant="outline" size="sm" className="w-full overflow-hidden" onClick={() => handleAddItem('text')} leftIcon={<Type size={16} />}>
                <span className="truncate">Text Field</span>
              </Button>
              <Button type="button" variant="outline" size="sm" className="w-full overflow-hidden" onClick={() => handleAddItem('number')} leftIcon={<Hash size={16} />}>
                <span className="truncate">Number Field</span>
              </Button>
              <Button type="button" variant="outline" size="sm" className="w-full overflow-hidden" onClick={() => handleAddItem('single_choice')} leftIcon={<CheckSquare size={16} />}>
                <span className="truncate">Single Choice</span>
              </Button>
              <Button type="button" variant="outline" size="sm" className="w-full overflow-hidden" onClick={() => handleAddItem('multiple_choice')} leftIcon={<Square size={16} />}>
                <span className="truncate">Multiple Choice</span>
              </Button>
              <Button type="button" variant="outline" size="sm" className="w-full overflow-hidden" onClick={() => handleAddItem('photo')} leftIcon={<Camera size={16} />}>
                <span className="truncate">Image Upload</span>
              </Button>
              <Button type="button" variant="outline" size="sm" className="w-full overflow-hidden" onClick={() => handleAddItem('divider')} leftIcon={<Minus size={16} />}>
                <span className="truncate">Divider Line</span>
              </Button>
            </div>
          </div>

          {/* Template Items */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">Template Items</h2>
              <p className="mt-1 text-sm text-gray-500">Drag and drop to reorder items. Click an item to edit its settings.</p>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="template-items">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`min-h-[220px] rounded-lg border-2 border-dashed transition-colors p-4 ${
                      snapshot.isDraggingOver ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    {fields.length === 0 && (
                      <div className="flex items-center justify-center h-48">
                        {/* Perfectly centered empty state */}
                        <div className="text-center text-gray-500">
                          <Plus className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-base font-medium text-gray-700">No items yet</p>
                          <p className="text-sm">Add field types from the left panel</p>
                        </div>
                      </div>
                    )}

                    {fields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`border border-gray-200 rounded-lg bg-white transition-all duration-200 cursor-pointer ${
                              dragSnapshot.isDragging ? 'shadow-lg rotate-1 scale-105' : 'shadow-sm hover:shadow-md'
                            } ${selectedItemIndex === index ? 'ring-2 ring-primary-500 border-primary-500' : ''} mb-3`}
                            onClick={() => handleItemSelect(index)}
                          >
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div
                                    {...dragProvided.dragHandleProps}
                                    className="cursor-move p-1 text-gray-400 hover:text-gray-600 mr-3 rounded hover:bg-gray-100 transition-colors"
                                  >
                                    <GripVertical size={20} />
                                  </div>
                                  <div>
                                    <div className="flex items-center">
                                      {field.type === 'text' && <Type size={16} className="mr-2 text-gray-500" />}
                                      {field.type === 'number' && <Hash size={16} className="mr-2 text-gray-500" />}
                                      {field.type === 'single_choice' && <CheckSquare size={16} className="mr-2 text-gray-500" />}
                                      {field.type === 'multiple_choice' && <Square size={16} className="mr-2 text-gray-500" />}
                                      {field.type === 'photo' && <Camera size={16} className="mr-2 text-gray-500" />}
                                      {field.type === 'divider' && <Minus size={16} className="mr-2 text-gray-500" />}
                                      <span className="text-sm font-medium text-gray-900">
                                        {field.label || `${field.type.replace('_', ' ')} field`}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {field.type.replace('_', ' ')} • {field.required ? 'Required' : 'Optional'}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    remove(index);
                                    if (selectedItemIndex === index) {
                                      setSelectedItemIndex(null);
                                    } else if (selectedItemIndex !== null && selectedItemIndex > index) {
                                      setSelectedItemIndex(selectedItemIndex - 1);
                                    }
                                  }}
                                  leftIcon={<Trash2 size={16} />}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Field Settings */}
          <div className="bg-white shadow rounded-lg p-6 lg:sticky lg:top-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Field Settings</h3>

            {selectedItem ? (
              <div className="space-y-4">
                {/* Field Label */}
                {selectedItem.type !== 'divider' && (
                  <Input
                    label="Field Label"
                    error={errors.items?.[selectedItemIndex!]?.label?.message}
                    {...register(`items.${selectedItemIndex}.label` as const, { required: 'Label is required' })}
                    placeholder="Enter field label"
                  />
                )}

                {/* Required Toggle */}
                {selectedItem.type !== 'divider' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`items.${selectedItemIndex}.required` as const)}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">Required field</span>
                  </div>
                )}

                {/* Number Field Settings */}
                {selectedItem.type === 'number' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Number Field Settings</h4>
                    <p className="text-xs text-gray-500">This field accepts whole numbers only (0-999)</p>
                  </div>
                )}

                {/* Single/Multiple Choice Options */}
                {(selectedItem.type === 'single_choice' || selectedItem.type === 'multiple_choice') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rating Options</label>
                    <div className="space-y-3">
                      {((watch(`items.${selectedItemIndex}.options`) as RatingOption[]) || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => updateOptionLabel(selectedItemIndex!, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <div className="flex space-x-1">
                            {Object.entries(RATING_COLORS).map(([colorKey, colorValue]) => (
                              <button
                                key={colorKey}
                                type="button"
                                onClick={() => updateOptionColor(selectedItemIndex!, optionIndex, colorValue)}
                                className={`w-6 h-6 rounded border-2 transition-all ${
                                  option.color === colorValue ? 'border-gray-800 scale-110' : 'border-gray-300 hover:border-gray-400'
                                }`}
                                style={{ backgroundColor: colorValue }}
                                title={colorKey}
                              />
                            ))}
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeOptionFromItem(selectedItemIndex!, optionIndex)} leftIcon={<Trash2 size={16} />} />
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addOptionToItem(selectedItemIndex!)} leftIcon={<Plus size={16} />}>
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}

                {/* Photo Field Settings */}
                {selectedItem.type === 'photo' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Photo Field Settings</h4>
                    <p className="text-xs text-gray-500">
                      During inspection, users will be able to choose between taking a photo with camera or uploading from file.
                    </p>
                  </div>
                )}

                {/* Divider Settings */}
                {selectedItem.type === 'divider' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Divider Line</h4>
                    <p className="text-xs text-gray-500">This creates a visual separator between sections of your template.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Plus className="h-12 w-12 mx-auto mb-4" />
                <p className="text-sm">Select an item to edit its settings</p>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-8 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/templates')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            {isNew ? 'Create Template' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TemplateDetailPage;
