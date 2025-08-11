import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Mail, Phone, MapPin, Palette, Plus, Edit, Trash2, Users, ImageIcon, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { getReportServiceTeams, createReportServiceTeam, updateReportServiceTeam, deleteReportServiceTeam, ReportServiceTeam } from '../../lib/reportServiceTeams';
import { uploadFile, deleteFile } from '../../lib/storage';
import { isImageValid, resizeAndOptimizeImage } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

type CompanySettingsFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  brandColor: string;
  reportBackground: string;
};

type TeamFormData = {
  designation: string;
  email: string;
};

const AdminSettingsPage = () => {
  const { company, initialize } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url || null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teams, setTeams] = useState<ReportServiceTeam[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ReportServiceTeam | null>(null);
  const [teamFormLoading, setTeamFormLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySettingsFormData>({
    defaultValues: {
      name: company?.name || '',
      email: '',
      phone: '',
      address: '',
      brandColor: company?.brandColor || '#2563EB',
      reportBackground: company?.reportBackground || '#FFFFFF',
    },
  });

  const {
    register: registerTeam,
    handleSubmit: handleSubmitTeam,
    reset: resetTeam,
    formState: { errors: teamErrors },
  } = useForm<TeamFormData>({
    defaultValues: {
      designation: '',
      email: '',
    },
  });

  useEffect(() => {
    loadTeams();
    // Set logo preview from company data
    if (company?.logo_url) {
      setLogoPreview(company.logo_url);
    }
  }, [company?.logo_url]);

  const loadTeams = async () => {
    try {
      setTeamsLoading(true);
      const teamsData = await getReportServiceTeams();
      if (teamsData) {
        setTeams(teamsData);
      }
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setTeamsLoading(false);
    }
  };
  
  const onSubmit = async (data: CompanySettingsFormData) => {
    setLoading(true);
    
    try {
      // In a real implementation, we would update the company settings in Supabase here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Company settings updated successfully');
    } catch (error) {
      console.error('Failed to update company settings:', error);
      toast.error('Failed to update company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = () => {
    setEditingTeam(null);
    resetTeam();
    setShowTeamForm(true);
  };

  const handleEditTeam = (team: ReportServiceTeam) => {
    setEditingTeam(team);
    resetTeam({
      designation: team.designation,
      email: team.email,
    });
    setShowTeamForm(true);
  };

  const handleDeleteTeam = async (team: ReportServiceTeam) => {
    if (!window.confirm(`Are you sure you want to delete "${team.designation}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const success = await deleteReportServiceTeam(team.id);
      if (success) {
        toast.success('Team deleted successfully');
        setTeams(teams.filter(t => t.id !== team.id));
      }
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  const onSubmitTeam = async (data: TeamFormData) => {
    try {
      setTeamFormLoading(true);

      if (editingTeam) {
        const updatedTeam = await updateReportServiceTeam(editingTeam.id, data);
        if (updatedTeam) {
          toast.success('Team updated successfully');
          setTeams(teams.map(t => t.id === editingTeam.id ? updatedTeam : t));
        }
      } else {
        const newTeam = await createReportServiceTeam(data);
        if (newTeam) {
          toast.success('Team added successfully');
          setTeams([...teams, newTeam]);
        }
      }

      setShowTeamForm(false);
      setEditingTeam(null);
      resetTeam();
    } catch (error: any) {
      console.error('Error saving team:', error);
      toast.error(editingTeam ? 'Failed to update team' : 'Failed to add team');
    } finally {
      setTeamFormLoading(false);
    }
  };

  const handleCancelTeamForm = () => {
    setShowTeamForm(false);
    setEditingTeam(null);
    resetTeam();
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = isImageValid(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setLogoUploading(true);

      // Resize and optimize the image
      const optimizedFile = await resizeAndOptimizeImage(file, 100, 100, 0.9);

      // Upload the logo
      const uploadResult = await uploadFile(optimizedFile, 'logo');
      
      if (!uploadResult) {
        throw new Error('Failed to upload logo');
      }

      // Update admin record with new logo URL
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .update({ logo_url: uploadResult.fileUrl })
        .eq('id', company?.id)
        .select()
        .single();

      if (adminError) {
        throw new Error(adminError.message);
      }

      // Update logo preview and refresh auth store
      setLogoPreview(uploadResult.fileUrl);
      await initialize();
      
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const extractFileKeyFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'storage-files');
      
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting file key from URL:', error);
      return null;
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoPreview || !company?.id) return;

    if (!window.confirm('Are you sure you want to remove the company logo?')) {
      return;
    }

    try {
      setLogoRemoving(true);

      // Extract file key from current logo URL for storage cleanup
      const fileKey = extractFileKeyFromUrl(logoPreview);
      
      // Delete from storage if file key exists
      if (fileKey) {
        try {
          await deleteFile(fileKey);
          console.log('Logo file deleted from storage:', fileKey);
        } catch (storageError) {
          console.error('Error deleting logo from storage:', storageError);
          // Continue with database update even if storage cleanup fails
        }
      }

      // Update admin record to remove logo URL
      const { error: adminError } = await supabase
        .from('admin')
        .update({ logo_url: null })
        .eq('id', company.id);

      if (adminError) {
        throw new Error(adminError.message);
      }

      // Clear logo preview and refresh auth store
      setLogoPreview(null);
      await initialize();
      
      toast.success('Logo removed successfully');
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast.error(error.message || 'Failed to remove logo');
    } finally {
      setLogoRemoving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your company information and preferences.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Company Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Company Information</h2>
            
            {/* Company Logo Section */}
            <div className="mb-8">
              <h3 className="text-base font-medium text-gray-900 mb-4">Company Logo</h3>
              <div className="flex items-center space-x-6">
                {/* Logo Preview */}
                <div className="h-20 w-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                
                {/* Logo Actions */}
                <div className="flex flex-col space-y-2">
                  {!logoPreview ? (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                        disabled={logoUploading}
                      />
                      <label htmlFor="logo-upload">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<Upload size={16} />}
                          disabled={logoUploading}
                          isLoading={logoUploading}
                          className="cursor-pointer"
                          as="span"
                        >
                          {logoUploading ? 'Uploading...' : 'Upload Logo'}
                        </Button>
                      </label>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Trash2 size={16} />}
                      onClick={handleRemoveLogo}
                      isLoading={logoRemoving}
                      disabled={logoRemoving}
                    >
                      {logoRemoving ? 'Removing...' : 'Remove Logo'}
                    </Button>
                  )}
                  <p className="text-xs text-gray-500">
                    PNG or JPG, max 300KB<br />
                    Recommended: 100x100px
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Company Name"
                error={errors.name?.message}
                {...register('name', { required: 'Company name is required' })}
              />

              <Input
                label="Email Address"
                type="email"
                error={errors.email?.message}
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />

              <Input
                label="Phone Number"
                type="tel"
                error={errors.phone?.message}
                {...register('phone')}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Company address..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      {...register('brandColor')}
                      className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      {...register('brandColor')}
                      placeholder="#2563EB"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Background
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      {...register('reportBackground')}
                      className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      {...register('reportBackground')}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" isLoading={loading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Report Service Teams */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Report Service Teams</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage teams that receive email alerts for flagged inspection items.
                </p>
              </div>
              <Button
                onClick={handleAddTeam}
                leftIcon={<Plus size={16} />}
                size="sm"
              >
                Add Team
              </Button>
            </div>

            {/* Team Form */}
            {showTeamForm && (
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-base font-medium text-gray-900 mb-4">
                  {editingTeam ? 'Edit Team' : 'Add New Team'}
                </h3>
                <form onSubmit={handleSubmitTeam(onSubmitTeam)} className="space-y-4">
                  <Input
                    label="Team Designation"
                    error={teamErrors.designation?.message}
                    {...registerTeam('designation', {
                      required: 'Team designation is required',
                    })}
                    placeholder="e.g., Maintenance Team, Cleaning Crew"
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    error={teamErrors.email?.message}
                    {...registerTeam('email', {
                      required: 'Email address is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    placeholder="team@example.com"
                  />

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelTeamForm}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={teamFormLoading}
                    >
                      {editingTeam ? 'Update Team' : 'Add Team'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Teams List */}
            {teamsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading teams...</p>
              </div>
            ) : teams.length > 0 ? (
              <div className="space-y-3">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900">
                          {team.designation}
                        </h4>
                        <p className="text-sm text-gray-500">{team.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Edit size={16} />}
                        onClick={() => handleEditTeam(team)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 size={16} />}
                        onClick={() => handleDeleteTeam(team)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No teams yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add teams to receive email alerts for flagged inspection items.
                </p>
                <div className="mt-6">
                  <Button
                    onClick={handleAddTeam}
                    leftIcon={<Plus size={16} />}
                    size="sm"
                  >
                    Add Your First Team
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;