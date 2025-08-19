import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Plus, Search, Filter, FolderPlus, Folder } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Template, TemplateCategory } from '../../types';
import { getTemplates, getTemplateCategories, createTemplateCategory, deleteTemplate, duplicateTemplate, updateTemplateCategory } from '../../lib/templates';
import TemplateCategoryCard from '../../components/templates/TemplateCategoryCard';
import TemplateDisplayCard from '../../components/templates/TemplateDisplayCard';
import { toast } from 'sonner';

function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [updatingTemplate, setUpdatingTemplate] = useState<string | null>(null);

  // Group templates by category - must be called before any conditional returns
  const groupedTemplates = React.useMemo(() => {
    const filtered = templates.filter(template => {
      const matchesSearch = searchTerm === '' || 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || template.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    const grouped: { [key: string]: Template[] } = {
      uncategorized: [],
    };

    // Initialize category groups
    categories.forEach(category => {
      grouped[category.id] = [];
    });

    // Group templates
    filtered.forEach(template => {
      if (template.categoryId && grouped[template.categoryId]) {
        grouped[template.categoryId].push(template);
      } else {
        grouped.uncategorized.push(template);
      }
    });

    return grouped;
  }, [templates, categories, searchTerm, selectedCategory]);

  useEffect(() => {
    loadTemplatesAndCategories();
  }, []);

  useEffect(() => {
    // Reload templates when search term or category changes
    loadTemplates();
  }, [searchTerm, selectedCategory]);

  const loadTemplatesAndCategories = async () => {
    try {
      setLoading(true);
      const [templatesData, categoriesData] = await Promise.all([
        getTemplates(searchTerm, selectedCategory),
        getTemplateCategories()
      ]);

      if (templatesData) {
        setTemplates(templatesData);
      }
      if (categoriesData) {
        setCategories(categoriesData);
      }
    } catch (error: any) {
      console.error('Error loading templates and categories:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesData = await getTemplates(searchTerm, selectedCategory);
      if (templatesData) {
        setTemplates(templatesData);
      }
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      const newCategory = await createTemplateCategory(newCategoryName.trim());
      if (newCategory) {
        toast.success('Category created successfully');
        setNewCategoryName('');
        setShowNewCategoryModal(false);
        
        // Reload categories
        const categoriesData = await getTemplateCategories();
        if (categoriesData) {
          setCategories(categoriesData);
        }
      }
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const success = await deleteTemplate(templateId);
      if (success) {
        toast.success('Template deleted successfully');
        setTemplates(templates.filter(t => t.id !== templateId));
      }
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      const result = await duplicateTemplate(templateId);
      if (result) {
        toast.success('Template duplicated successfully');
        // Reload templates to show the new duplicate
        loadTemplates();
      }
    } catch (error: any) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    const templatesInCategory = groupedTemplates[categoryId]?.length || 0;
    
    const confirmMessage = templatesInCategory > 0
      ? `Are you sure you want to delete the "${category?.name}" category? This will move ${templatesInCategory} template${templatesInCategory !== 1 ? 's' : ''} to "Uncategorized". This action cannot be undone.`
      : `Are you sure you want to delete the "${category?.name}" category? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const { deleteTemplateCategory } = await import('../../lib/templates');
      const success = await deleteTemplateCategory(categoryId);
      
      if (success) {
        toast.success('Category deleted successfully');
        
        // Update local state
        setCategories(categories.filter(c => c.id !== categoryId));
        
        // Move templates to uncategorized in local state
        setTemplates(prevTemplates => 
          prevTemplates.map(template => 
            template.categoryId === categoryId 
              ? { ...template, categoryId: null }
              : template
          )
        );
      }
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a valid droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Only handle drops onto category cards
    if (!destination.droppableId.startsWith('category-')) {
      return;
    }

    try {
      setUpdatingTemplate(draggableId);
      
      // Extract category ID from droppable ID
      const categoryId = destination.droppableId === 'category-uncategorized' 
        ? null 
        : destination.droppableId.replace('category-', '');

      console.log('Updating template category:', {
        templateId: draggableId,
        newCategoryId: categoryId,
        droppableId: destination.droppableId
      });

      const updatedTemplate = await updateTemplateCategory(draggableId, categoryId);
      
      if (updatedTemplate) {
        // Update local state
        setTemplates(prevTemplates => 
          prevTemplates.map(template => 
            template.id === draggableId 
              ? { ...template, categoryId }
              : template
          )
        );
        
        const categoryName = categoryId 
          ? categories.find(c => c.id === categoryId)?.name || 'Unknown Category'
          : 'Uncategorized';
        
        toast.success(`Template moved to ${categoryName}`);
      }
    } catch (error: any) {
      console.error('Error updating template category:', error);
      toast.error('Failed to move template');
    } finally {
      setUpdatingTemplate(null);
    }
  };

  if (loading) {
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

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
          <p className="mt-1 text-lg text-gray-500">
            Manage your inspection templates
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Button
            variant="outline"
            leftIcon={<Filter size={20} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            variant="outline"
            leftIcon={<FolderPlus size={20} />}
            onClick={() => setShowNewCategoryModal(true)}
          >
            New Category
          </Button>
          <Link to="/dashboard/templates/new">
            <Button
              leftIcon={<Plus size={20} />}
            >
              Create Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="border-t border-gray-200 p-4">
            <div className="w-full max-w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full max-w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value="">Uncategorized</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Templates with Categories */}
      <DragDropContext onDragEnd={handleDragEnd}>
        {Object.keys(groupedTemplates).some(key => groupedTemplates[key].length > 0) || categories.length > 0 ? (
          <div className="space-y-8">
            {/* Categories */}
            {categories.map(category => (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Folder className="h-5 w-5 text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
                    <span className="ml-2 text-sm text-gray-500">
                      ({groupedTemplates[category.id]?.length || 0} templates)
                    </span>
                  </div>
                </div>
                
                <Droppable droppableId={`category-${category.id}`} direction="horizontal">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        min-h-[200px] rounded-lg border-2 border-dashed p-4 transition-all duration-200
                        ${snapshot.isDraggingOver 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-blue-200 bg-blue-25'
                        }
                      `}
                    >
                      {groupedTemplates[category.id]?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedTemplates[category.id].map((template, index) => (
                            <Draggable key={template.id} draggableId={template.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <TemplateDisplayCard
                                    template={template}
                                    onDuplicate={handleDuplicateTemplate}
                                    onDelete={handleDeleteTemplate}
                                    isDragging={snapshot.isDragging}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                      ) : (
                        <TemplateCategoryCard
                          category={category}
                          templateCount={0}
                          isDraggedOver={snapshot.isDraggingOver}
                          onDelete={handleDeleteCategory}
                        />
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}

            {/* Uncategorized Templates */}
            {groupedTemplates.uncategorized?.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <LayoutTemplate className="h-5 w-5 text-gray-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">Uncategorized</h2>
                    <span className="ml-2 text-sm text-gray-500">
                      ({groupedTemplates.uncategorized.length} templates)
                    </span>
                  </div>
                </div>
                
                <Droppable droppableId="category-uncategorized" direction="horizontal">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        min-h-[200px] rounded-lg border-2 border-dashed p-4 transition-all duration-200
                        ${snapshot.isDraggingOver 
                          ? 'border-gray-400 bg-gray-50' 
                          : 'border-gray-200 bg-gray-25'
                        }
                      `}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedTemplates.uncategorized.map((template, index) => (
                          <Draggable key={template.id} draggableId={template.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TemplateDisplayCard
                                  template={template}
                                  onDuplicate={handleDuplicateTemplate}
                                  onDelete={handleDeleteTemplate}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-center py-12">
              <LayoutTemplate className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No templates</h3>
              <p className="mt-2 text-base text-gray-500">
                {searchTerm || selectedCategory !== 'all'
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : 'Get started by creating a new template.'}
              </p>
              <div className="mt-6">
                <Link to="/dashboard/templates/new">
                  <Button
                    leftIcon={<Plus size={20} />}
                  >
                    Create Template
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </DragDropContext>

      {/* Loading overlay for template updates */}
      {updatingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
              <span className="text-gray-900">Moving template...</span>
            </div>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create New Category
            </h3>
            <Input
              label="Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter category name"
            />
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setNewCategoryName('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCategory}>
                Create Category
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;
