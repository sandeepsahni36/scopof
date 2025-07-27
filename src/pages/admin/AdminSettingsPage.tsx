import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Mail, Phone, MapPin, Palette, Plus, Edit, Trash2, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { getReportServiceTeams, createReportServiceTeam, updateReportServiceTeam, deleteReportServiceTeam, ReportServiceTeam } from '../../lib/reportServiceTeams';
import StorageUsageIndicator from '../../components/admin/StorageUsageIndicator';
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
  const [loading, setLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teams, setTeams] = useState<ReportServiceTeam[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ReportServiceTeam | null>(null);
  const [teamFormLoading, setTeamFormLoading] = useState(false);
  const { company } = useAuthStore();
  
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
  }, []);

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
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your company information and team settings.
          </p>
        </div>
        
        {/* Company Information */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-gray-200">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Update your company's basic information.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Input
                  label="Company Name"
                  error={errors.name?.message}
                  {...register('name', {
                    required: 'Company name is required',
                  })}
                  leftIcon={<Building2 className="text-gray-400" size={20} />}
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
                  leftIcon={<Mail className="text-gray-400" size={20} />}
                />
                
                <Input
                  label="Phone Number"
                  error={errors.phone?.message}
                  {...register('phone')}
                  leftIcon={<Phone className="text-gray-400" size={20} />}
                />
                
                <Input
                  label="Address"
                  error={errors.address?.message}
                  {...register('address')}
                  leftIcon={<MapPin className="text-gray-400" size={20} />}
                />
              </div>
            </div>
            
            {/* Branding Settings */}
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Branding</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Customize your company's brand colors and report appearance.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Color
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      className="h-10 w-10 rounded-md border border-gray-300"
                      {...register('brandColor')}
                    />
                    <Input
                      className="ml-2"
                      {...register('brandColor')}
                      leftIcon={<Palette className="text-gray-400" size={20} />}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Background
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      className="h-10 w-10 rounded-md border border-gray-300"
                      {...register('reportBackground')}
                    />
                    <Input
                      className="ml-2"
                      {...register('reportBackground')}
                      leftIcon={<Palette className="text-gray-400" size={20} />}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end rounded-b-lg">
              <Button
                type="button"
                variant="secondary"
                className="mr-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={loading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Report Service Teams */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Report Service Teams</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage team designations and email addresses for inspection reporting.
                </p>
              </div>
              <Button
                leftIcon={<Plus size={16} />}
                onClick={handleAddTeam}
              >
                Add Team
              </Button>
            </div>

            {teamsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading teams...</p>
              </div>
            ) : teams.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Designation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teams.map((team) => (
                      <tr key={team.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Users className="h-5 w-5 text-gray-400 mr-3" />
                            <div className="text-sm font-medium text-gray-900">
                              {team.designation}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No teams yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first team designation.
                </p>
                <div className="mt-6">
                  <Button
                    leftIcon={<Plus size={16} />}
                    onClick={handleAddTeam}
                  >
                    Add Team
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Form Modal */}
        {showTeamForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingTeam ? 'Edit Team' : 'Add New Team'}
                </h3>
                
                <form onSubmit={handleSubmitTeam(onSubmitTeam)} className="space-y-4">
                  <Input
                    label="Designation"
                    error={teamErrors.designation?.message}
                    {...registerTeam('designation', {
                      required: 'Designation is required',
                      minLength: {
                        value: 2,
                        message: 'Designation must be at least 2 characters',
                      },
                    })}
                    placeholder="e.g., Operations Manager"
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    error={teamErrors.email?.message}
                    {...registerTeam('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    placeholder="team@company.com"
                    leftIcon={<Mail className="text-gray-400" size={16} />}
                  />

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelTeamForm}
                      disabled={teamFormLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={teamFormLoading}
                      disabled={teamFormLoading}
                    >
                      {editingTeam ? 'Update Team' : 'Add Team'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Danger Zone */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900">Danger Zone</h2>
            <p className="mt-1 text-sm text-gray-500">
              Careful, these actions cannot be undone.
            </p>
            
            <div className="mt-6">
              <Button
                variant="danger"
                onClick={() => {
                  // Handle account deletion
                  toast.error('This feature is not implemented yet');
                }}
              >
                Delete Company Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900">Storage Usage</h2>
            <p className="mt-1 text-sm text-gray-500">
              Monitor your storage consumption and manage your plan.
            </p>
          </div>
          <StorageUsageIndicator showDetails={true} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900">Danger Zone</h2>
          <p className="mt-1 text-sm text-gray-500">
            Careful, these actions cannot be undone.
          </p>
          
          <div className="mt-6">
            <Button
              variant="danger"
              onClick={() => {
                // Handle account deletion
                toast.error('This feature is not implemented yet');
              }}
            >
              Delete Company Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;