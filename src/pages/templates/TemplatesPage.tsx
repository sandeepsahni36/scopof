// src/pages/templates/TemplatesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  Plus,
  Search,
  Filter,
  FolderPlus,
  Folder,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Template, TemplateCategory } from '../../types';
import {
  getTemplates,
  getTemplateCategories,
  createTemplateCategory,
  deleteTemplate,
  duplicateTemplate,
  updateTemplateCategory,
} from '../../lib/templates';
import TemplateCategoryCard from '../../components/templates/TemplateCategoryCard';
import TemplateDisplayCard from '../../components/templates/TemplateDisplayCard';
import { toast } from 'sonner';

function TemplatesPage() {
  // --- state ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [updatingTemplate, setUpdatingTemplate] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Accept search term from GlobalSearch (Dashboard)
  useEffect(() => {
    const st = (location.state as any)?.searchTerm;
    if (typeof st === 'string' && st.trim()) {
      setSearchTerm(st);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Grouped templates (memoized)
  const groupedTemplates = useMemo(() => {
    const filtered = templates.filter((t) => {
      const matchesSearch =
        searchTerm === '' ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || t.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    const grouped: Record<string, Template[]> = { uncategorized: [] };
    categories.forEach((c) => (grouped[c.id] = []));
    filtered.forEach((t) => {
      if (t.categoryId && grouped[t.categoryId]) grouped[t.categoryId].push(t);
      else grouped.uncategorized.push(t);
    });

    return grouped;
  }, [templates, categories, searchTerm, selectedCategory]);

  // initial load
  useEffect(() => {
    loadTemplatesAndCategories();
  }, []);

  // reload on search/category change
  useEffect(() => {
    loadTemplates();
  }, [searchTerm, selectedCategory]);

  const loadTemplatesAndCategories = async () => {
    try {
      setLoading(true);
      const [t, c] = await Promise.all([
        getTemplates(searchTerm, selectedCategory),
        getTemplateCategories(),
      ]);
      if (t) setTemplates(t);
      if (c) setCategories(c);
    } catch (err) {
      console.error('Error loading templates & categories:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const t = await getTemplates(searchTerm, selectedCategory);
      if (t) setTemplates(t);
    } catch (err) {
      console.error('Error loading templates:', err);
      toast.error('Failed to load templates');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    try {
      const newCat = await createTemplateCategory(newCategoryName.trim());
      if (newCat) {
        toast.success('Category created');
        setNewCategoryName('');
        setShowNewCategoryModal(false);
        const c = await getTemplateCategories();
        if (c) setCategories(c);
      }
    } catch (err) {
      console.error('Error creating category:', err);
      toast.error('Failed to create category');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    try {
      const ok = await deleteTemplate(templateId);
      if (ok) {
        toast.success('Template deleted');
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      const ok = await duplicateTemplate(templateId);
      if (ok) {
        toast.success('Template duplicated');
        loadTemplates();
      }
    } catch (err) {
      console.error('Error duplicating template:', err);
      toast.error('Failed to duplicate template');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    const count = groupedTemplates[categoryId]?.length || 0;
    const msg =
      count > 0
        ? `Delete "${category?.name}"? ${count} template${count !== 1 ? 's' : ''} will move to "Uncategorized".`
        : `Delete "${category?.name}"?`;
    if (!window.confirm(msg)) return;

    try {
      const { deleteTemplateCategory } = await import('../../lib/templates');
      const ok = await deleteTemplateCategory(categoryId);
      if (ok) {
        toast.success('Category deleted');
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
        setTemplates((prev) =>
          prev.map((t) => (t.categoryId === categoryId ? { ...t, categoryId: null } : t))
        );
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error('Failed to delete category');
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (!destination.droppableId.startsWith('category-')) return;

    try {
      setUpdatingTemplate(draggableId);
      const categoryId =
        destination.droppableId === 'category-uncategorized'
          ? null
          : destination.droppableId.replace('category-', '');
      const updated = await updateTemplateCategory(draggableId, categoryId);
      if (updated) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === draggableId ? { ...t, categoryId } : t))
        );
        toast.success(`Template moved${categoryId ? '' : ' to Uncategorized'}`);
      }
    } catch (err) {
      console.error('Error updating template category:', err);
      toast.error('Failed to move template');
    } finally {
      setUpdatingTemplate(null);
    }
  };

  // --- loading state ---
  if (loading) {
    return (
      <div className="max-w-6xl md:max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="py-10 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // --- UI ---
  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-6xl md:max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="mt-1 text-lg text-gray-500">Manage your inspection templates</p>
          </div>

          {/* Actions — wrap on mobile, no overflow */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              leftIcon={<Filter size={18} />}
              onClick={() => setShowFilters((v) => !v)}
              className="w-full sm:w-auto"
            >
              Filters
            </Button>
            <Button
              variant="outline"
              leftIcon={<FolderPlus size={18} />}
              onClick={() => setShowNewCategoryModal(true)}
              className="w-full sm:w-auto"
            >
              New Category
            </Button>
            <Link to="/dashboard/templates/new" className="w-full sm:w-auto">
              <Button leftIcon={<Plus size={18} />} className="w-full sm:w-auto">
                Create Template
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filters card (premium look) */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 mb-6">
          <div className="p-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search templates…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {showFilters && (
            <div className="border-t border-gray-100 p-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="">Uncategorized</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Templates + Categories */}
        <DragDropContext onDragEnd={handleDragEnd}>
          {Object.keys(groupedTemplates).some((k) => groupedTemplates[k].length > 0) ||
          categories.length > 0 ? (
            <div className="space-y-8">
              {/* Category sections */}
              {categories.map((category) => (
                <div key={category.id} className="space-y-4">
                  <div className="flex items-center">
                    <Folder className="h-5 w-5 text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
                    <span className="ml-2 text-sm text-gray-500">
                      ({groupedTemplates[category.id]?.length || 0} templates)
                    </span>
                  </div>

                  <Droppable droppableId={`category-${category.id}`} direction="horizontal">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={[
                          'min-h-[200px] w-full rounded-2xl border-2 border-dashed p-4 transition-all',
                          snapshot.isDraggingOver
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-blue-200 bg-blue-25',
                        ].join(' ')}
                      >
                        {groupedTemplates[category.id]?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedTemplates[category.id].map((template, index) => (
                              <Draggable key={template.id} draggableId={template.id} index={index}>
                                {(draggableProvided, snapshotDraggable) => (
                                  <div
                                    ref={draggableProvided.innerRef}
                                    {...draggableProvided.draggableProps}
                                    {...draggableProvided.dragHandleProps}
                                  >
                                    <TemplateDisplayCard
                                      template={template}
                                      onDuplicate={handleDuplicateTemplate}
                                      onDelete={handleDeleteTemplate}
                                      isDragging={snapshotDraggable.isDragging}
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

              {/* Uncategorized */}
              {groupedTemplates.uncategorized?.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <LayoutTemplate className="h-5 w-5 text-gray-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">Uncategorized</h2>
                    <span className="ml-2 text-sm text-gray-500">
                      ({groupedTemplates.uncategorized.length} templates)
                    </span>
                  </div>

                  <Droppable droppableId="category-uncategorized" direction="horizontal">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={[
                          'min-h-[200px] w-full rounded-2xl border-2 border-dashed p-4 transition-all',
                          snapshot.isDraggingOver
                            ? 'border-gray-400 bg-gray-50'
                            : 'border-gray-200 bg-gray-25',
                        ].join(' ')}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedTemplates.uncategorized.map((template, index) => (
                            <Draggable key={template.id} draggableId={template.id} index={index}>
                              {(draggableProvided, snapshotDraggable) => (
                                <div
                                  ref={draggableProvided.innerRef}
                                  {...draggableProvided.draggableProps}
                                  {...draggableProvided.dragHandleProps}
                                >
                                  <TemplateDisplayCard
                                    template={template}
                                    onDuplicate={handleDuplicateTemplate}
                                    onDelete={handleDeleteTemplate}
                                    isDragging={snapshotDraggable.isDragging}
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
            // Empty state
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100">
              <div className="text-center py-12 px-4">
                <LayoutTemplate className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No templates</h3>
                <p className="mt-2 text-base text-gray-500">
                  {searchTerm || selectedCategory !== 'all'
                    ? "Try adjusting your search or filters."
                    : 'Get started by creating a new template.'}
                </p>
                <div className="mt-6">
                  <Link to="/dashboard/templates/new">
                    <Button leftIcon={<Plus size={20} />}>Create Template</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DragDropContext>

        {/* Loading overlay while moving */}
        {updatingTemplate && (
          <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-xl">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3" />
                <span className="text-gray-900">Moving template…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Category Modal */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Category</h3>
            <Input
              label="Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter category name"
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setNewCategoryName('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCategory}>Create Category</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;
