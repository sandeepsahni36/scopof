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

  const { update } = useFieldArray({
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

      console.log('=== TEMPLATE FORM SUBMIT DEBUG START ===');
      console.log('Form data being submitted:', data);
      console.log('Form items:', data.items);
      console.log('Form items count:', data.items.length);
      console.log('Form items with parentId:', data.items.filter(item => item.parentId).length);
      
      // Log each form item's parent-child relationship
      data.items.forEach((item, index) => {
        console.log(`Form Item ${index}: ${item.id} (parent: ${item.parentId || 'none'}) - ${item.label} (type: ${item.type})`);
      });
      const templateData = {
        name: data.name,
        description: data.description || undefined,
      };

      // Convert flat items back to API format
      const apiItems = data.items.map((item, index) => ({
        id: item.id, // Preserve the client-side ID for mapping
        parentId: item.parentId || undefined, // Ensure undefined instead of null
        type: item.type,
        label: item.label,
        sectionName: item.sectionName,
        required: item.required,
        options: item.options,
        reportEnabled: item.reportEnabled,
        reportRecipientId: item.reportRecipientId,
        order: index + 1,
      }));

      console.log('API items being sent:', apiItems);
      console.log('API items with parentId:', apiItems.filter(item => item.parentId).length);
      
      // Log each API item's parent-child relationship
      apiItems.forEach((item, index) => {
        console.log(`API Item ${index}: order=${item.order} (parent: ${item.parentId || 'none'}) - ${item.label} (type: ${item.type})`);
      });
      
      // Log parent-child relationships to debug mapping issues
      console.log('=== PARENT-CHILD RELATIONSHIP DEBUG ===');
      const parentChildMap = new Map<string, string[]>();
      apiItems.forEach(item => {
        if (item.parentId) {
          if (!parentChildMap.has(item.parentId)) {
            parentChildMap.set(item.parentId, []);
          }
          parentChildMap.get(item.parentId)!.push(item.id);
        }
      });
      
      console.log('Parent-child relationships:');
      parentChildMap.forEach((children, parentId) => {
        const parentItem = apiItems.find(item => item.id === parentId);
        console.log(`Parent: ${parentId} (${parentItem?.label || 'NOT FOUND'}) -> Children: [${children.join(', ')}]`);
      });
      
      // Check for orphaned children (children whose parents don't exist)
      const allParentIds = new Set(apiItems.map(item => item.id));
      const orphanedChildren = apiItems.filter(item => item.parentId && !allParentIds.has(item.parentId));
      if (orphanedChildren.length > 0) {
        console.error('ORPHANED CHILDREN DETECTED:', orphanedChildren.map(child => ({
          id: child.id,
          label: child.label,
          parentId: child.parentId
        })));
      }
      console.log('=== END PARENT-CHILD RELATIONSHIP DEBUG ===');
      if (isNew) {
        console.log('Creating new template...');
        const result = await createTemplate(templateData, apiItems);
        if (result) {
          toast.success('Template created successfully');
          navigate('/dashboard/templates');
        }
      } else {
        console.log('Updating existing template...');
        const result = await updateTemplate(id!, templateData, apiItems);
        if (result) {
          toast.success('Template updated successfully');
          navigate('/dashboard/templates');
        }
      }
      console.log('=== TEMPLATE FORM SUBMIT DEBUG END ===');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (type: TemplateItemType, parentIndex?: number) => {
    const newItemId = uuidv4();
    const newItem = {
      id: newItemId,
      parentId: parentIndex !== undefined ? fields[parentIndex].id : undefined,
      type,
      label: '',
      sectionName: type === 'section' ? '' : undefined,
      required: false,
      options: type === 'single_choice' || type === 'multiple_choice' ? [''] : undefined,
      reportEnabled: false,
      reportRecipientId: undefined,
    };

    console.log('Adding new item:', {
      id: newItemId,
      parentId: newItem.parentId,
      type: type,
      parentIndex: parentIndex
    });

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

  const handleRemoveItem = (itemIndex: number) => {
    const itemToRemove = fields[itemIndex];
    
    // If removing a section, atomically clean up orphaned children
    if (itemToRemove.type === 'section') {
      const sectionId = itemToRemove.id;
      
      // Create new items array with orphaned children moved to root level and section removed
      const newItems = fields
        .filter((_, index) => index !== itemIndex) // Remove the section
        .map(field => {
          // If this item was a child of the removed section, move it to root level
          if (field.parentId === sectionId) {
            return { ...field, parentId: undefined };
          }
          return field;
        });
      
      // Update the entire items array atomically
      setValue('items', newItems);
    } else {
      // For non-section items, just remove normally
      remove(itemIndex);
    }
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
      .filter(({ field }) => field.parentId === sectionId)
      .map(({ field, index }) => ({ item: field, index }));
  };

  const isChildOfSection = (itemIndex: number) => {
    return fields[itemIndex].parentId !== undefined;
  };

  const getActualFieldIndex = (item: any) => {
    return fields.findIndex(field => field.id === item.id);
  };

  const sortHierarchicalItems = (items: FormValues['items']): FormValues['items'] => {
    const result: FormValues['items'] = [];
    
    // Create a map of all valid item IDs
    const validItemIds = new Set(items.map(item => item.id));
    
    // Clean up stale parentId references
    const cleanedItems = items.map(item => ({
      ...item,
      parentId: item.parentId && validItemIds.has(item.parentId) ? item.parentId : undefined
    }));
    
    const itemMap = new Map<string, FormValues['items'][0]>();
    
    // Create a map of all items by ID
    cleanedItems.forEach(item => {
      itemMap.set(item.id, item);
    });
    
    // Helper function to add an item and its children recursively
    const addItemWithChildren = (item: FormValues['items'][0]) => {
      result.push(item);
      
      // Find and add all direct children of this item
      const children = cleanedItems
        .filter(child => child.parentId === item.id)
        .sort((a, b) => {
          // Sort children by their current position in the original array
          const aIndex = cleanedItems.findIndex(i => i.id === a.id);
          const bIndex = cleanedItems.findIndex(i => i.id === b.id);
          return aIndex - bIndex;
        });
      
      children.forEach(child => {
        addItemWithChildren(child);
      });
    };
    
    // First, add all root items (items without parentId)
    const rootItems = cleanedItems
      .filter(item => !item.parentId)
      .sort((a, b) => {
        // Sort root items by their current position in the original array
        const aIndex = cleanedItems.findIndex(i => i.id === a.id);
        const bIndex = cleanedItems.findIndex(i => i.id === b.id);
        return aIndex - bIndex;
      });
    
    rootItems.forEach(rootItem => {
      addItemWithChildren(rootItem);
    });
    
    return result;
  };
  const rootDraggableItems = fields.filter(field => !field.parentId);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    // If dropped outside a valid droppable area
    if (!destination) {
      return;
    }
    console.log('=== DRAG AND DROP DEBUG START ===');
    console.log('Source:', source);
    console.log('Destination:', destination);
    console.log('Current fields before drag:', fields.map(f => ({ id: f.id, label: f.label, parentId: f.parentId })));

    // Find the dragged item
    const sourceActualIndex = fields.findIndex(field => field.id === result.draggableId);
    
    if (sourceActualIndex === -1) {
      console.error('Could not find dragged item with ID:', result.draggableId);
      return;
    }
    
    const draggedItem = fields[sourceActualIndex];
    console.log('Dragged item found:', { 
      id: draggedItem.id, 
      label: draggedItem.label, 
      currentParentId: draggedItem.parentId,
      sourceActualIndex 
    });

    // Determine new parent ID based on destination
    let newParentId = undefined;
    if (destination.droppableId.startsWith('section-')) {
      newParentId = destination.droppableId.replace('section-', '');
      console.log('Moving item into section with ID:', newParentId);
    } else {
      console.log('Moving item to root level');
    }

    // Update the parentId of the dragged item
    // Create a new items array with atomic update
    const newItems = [...fields];
    
    // Remove the dragged item from its current position
    const draggedItemCopy = { ...draggedItem, parentId: newParentId };
    newItems.splice(sourceActualIndex, 1);
    
    // Calculate the destination index in the new array
    let destinationGlobalIndex;
    
    if (newParentId) {
      // Moving into a section
      const sectionIndex = newItems.findIndex(item => item.id === newParentId);
      if (sectionIndex === -1) {
        console.error('Section not found with ID:', newParentId);
        return;
      }
      
      // Find existing children of this section
      const existingChildren = newItems.filter(item => item.parentId === newParentId);
      
      if (destination.index === 0) {
        // Insert as first child (right after section header)
        destinationGlobalIndex = sectionIndex + 1;
      } else {
        // Insert after the nth existing child
        const targetChildIndex = Math.min(destination.index - 1, existingChildren.length - 1);
        if (targetChildIndex >= 0 && existingChildren[targetChildIndex]) {
          const targetChildGlobalIndex = newItems.findIndex(item => item.id === existingChildren[targetChildIndex].id);
          destinationGlobalIndex = targetChildGlobalIndex + 1;
        } else {
          destinationGlobalIndex = sectionIndex + 1;
        }
      }
    } else {
      // Moving to root level
      const rootItems = newItems.filter(item => !item.parentId);
      
      if (destination.index === 0) {
        destinationGlobalIndex = 0;
      } else {
        const targetRootIndex = Math.min(destination.index - 1, rootItems.length - 1);
        if (targetRootIndex >= 0 && rootItems[targetRootIndex]) {
          const targetRootGlobalIndex = newItems.findIndex(item => item.id === rootItems[targetRootIndex].id);
          destinationGlobalIndex = targetRootGlobalIndex + 1;
        } else {
          destinationGlobalIndex = newItems.length;
        }
      }
    }
    
    // Insert the item at the calculated position
    newItems.splice(destinationGlobalIndex, 0, draggedItemCopy);
    
    // Sort the items hierarchically to ensure proper order
    const sortedItems = sortHierarchicalItems(newItems);
    
    console.log('Final sorted items:', sortedItems.map(f => ({ id: f.id, label: f.label, parentId: f.parentId })));
    
    // Update the form with the new items array atomically
    setValue('items', sortedItems);
    
    console.log('=== DRAG AND DROP DEBUG END ===');
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
                    {rootDraggableItems.map((field, rootIndex) => {
                      const actualFieldIndex = getActualFieldIndex(field);
                      const isSection = field.type === 'section';
                      const isExpanded = expandedSections.has(actualFieldIndex);
                      const sectionChildren = isSection ? getSectionChildren(actualFieldIndex) : [];

                      return (
                        <Draggable key={field.id} draggableId={field.id} index={rootIndex}>
                          {(provided, snapshot) => {
                            if (isSection) {
                              return (
                                <SectionComponent
                                  section={field}
                                  sectionIndex={actualFieldIndex}
                                  children={sectionChildren}
                                  isExpanded={isExpanded}
                                  provided={provided}
                                  snapshot={snapshot}
                                  register={register}
                                  watch={watch}
                                  setValue={setValue}
                                  errors={errors}
                                  onRemove={handleRemoveItem}
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
                                  item={field}
                                  index={actualFieldIndex}
                                  provided={provided}
                                  snapshot={snapshot}
                                  register={register}
                                  watch={watch}
                                  setValue={setValue}
                                  errors={errors}
                                  onRemove={handleRemoveItem}
                                  onAddOption={addOptionToItem}
                                  onRemoveOption={removeOptionFromItem}
                                  reportServiceTeams={reportServiceTeams}
                                />
                              );
                            }
                          }}
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