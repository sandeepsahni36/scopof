import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Plus, Search, Filter, Pencil, Trash2, FolderPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Template, TemplateCategory } from '../../types';
import { getTemplates, getTemplateCategories, createTemplateCategory, deleteTemplate } from '../../lib/templates';
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

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
          <p className="mt-1 text-lg text-gray-500">
            Manage your inspection templates
          </p>
        </div>
        <div className="flex gap-3">
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
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Template List */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {template.name}
                    </h3>
                    {template.categoryId && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-2">
                        {categories.find(c => c.id === template.categoryId)?.name}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Link to={`/dashboard/templates/${template.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil size={16} />}
                      >
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={16} />}
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {template.description && (
                  <p className="mt-2 text-sm text-gray-500">
                    {template.description}
                  </p>
                )}
                <div className="mt-4 text-sm text-gray-500">
                  Created {new Date(template.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
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
