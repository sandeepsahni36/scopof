import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, GripVertical, ArrowLeft, FolderPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TemplateItemType, TemplateItem } from '../../types';
import { getTemplate, createTemplate, updateTemplate } from '../../lib/templates';
import { getReportServiceTeams, ReportServiceTeam } from '../../lib/reportServiceTeams';
import SectionComponent from '../../components/templates/SectionComponent';
import ItemComponent from '../../components/templates/ItemComponent';
import { toast } from 'sonner';

type FormValues = {
  name: string;
  description: string;
  items: {
    id: string;
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
          // Ensure all items have client-side IDs
          const itemsWithIds = flatItems.map(item => ({
            ...item,
            id: item.id || uuidv4()
          }));
          setValue('items', itemsWithIds);
          
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
            id: item.id || uuidv4(),
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
      id: uuidv4(),
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
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    console.log('Drag operation:', {
      sourceDroppableId: source.droppableId,
      destinationDroppableId: destination.droppableId,
      sourceIndex: source.index,
      destinationIndex: destination.index
    });

    // Handle different types of moves
    if (source.droppableId === destination.droppableId) {
      // Same droppable area - simple reorder
      if (source.droppableId === 'template-items') {
        // Root level reorder
        move(source.index, destination.index);
      } else {
        // Section children reorder - need to find actual indices in fields array
        const sourceItem = fields[source.index];
        const destinationItem = fields[destination.index];
        move(source.index, destination.index);
      }
    } else {
      // Different droppable areas - need to update parent relationships
      const draggedItem = fields[source.index];
      
      // Determine new parent ID
      let newParentId = null;
      if (destination.droppableId.startsWith('section-')) {
        newParentId = destination.droppableId.replace('section-', '');
      }
      
      // Update the item's parentId
      setValue(`items.${source.index}.parentId`, newParentId);
      
      // Move the item in the array
      move(source.index, destination.index);
      
      console.log('Updated parent relationship:', {
        itemId: draggedItem.id,
        oldParentId: draggedItem.parentId,
        newParentId: newParentId
      });
    }
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
              <Droppable droppableId="template-items" type="ITEM">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-4 min-h-[200px] rounded-lg border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver 
                        ? 'border-primary-300 bg-primary-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    {fields.length === 0 && (
                      <div className="flex items-center justify-center h-48 text-gray-400">
                        <div className="text-center">
                          <FolderPlus className="h-12 w-12 mx-auto mb-4" />
                          <p className="text-lg font-medium">No items yet</p>
                          <p className="text-sm">Add sections and items using the buttons below</p>
                        </div>
                      </div>
                    )}
                    {fields.map((field, index) => {
                      const isSection = field.type === 'section';
                      const isChild = isChildOfSection(index);
                      const isExpanded = expandedSections.has(index);
                      const sectionChildren = isSection ? getSectionChildren(index) : [];

                      // Don't render child items directly - they're rendered within sections
                      if (isChild) {
                        return null;
                      }

                      if (isSection) {
                        return (
                          <SectionComponent
                            key={field.id}
                            section={field}
                            sectionIndex={index}
                            children={sectionChildren}
                            isExpanded={isExpanded}
                            register={register}
                            watch={watch}
                            setValue={setValue}
                            errors={errors}
                            onRemove={remove}
                            onToggleExpansion={toggleSection}
                            onAddItem={handleAddItem}
                            onAddOption={addOptionToItem}
                            onRemoveOption={removeOptionFromItem}
                            reportServiceTeams={reportServiceTeams}
                          />
                        );
                      } else {
                        return (
                          <ItemComponent
                            key={field.id}
                            item={field}
                            index={index}
                            register={register}
                            watch={watch}
                            setValue={setValue}
                            errors={errors}
                            onRemove={remove}
                            onAddOption={addOptionToItem}
                            onRemoveOption={removeOptionFromItem}
                            reportServiceTeams={reportServiceTeams}
                          />
                        );
                      }
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