import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Palette, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  ImageIcon, 
  Upload,
  Search,
  Shield,
  UserPlus,
  Check,
  CreditCard,
  Clock,
  AlertTriangle,
  Download,
  ArrowRight,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { getReportServiceTeams, createReportServiceTeam, updateReportServiceTeam, deleteReportServiceTeam, ReportServiceTeam } from '../../lib/reportServiceTeams';
import { uploadFile, deleteFile } from '../../lib/storage';
import { isImageValid, resizeAndOptimizeImage } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { createCheckoutSession, getCurrentSubscription, getOrderHistory, createCustomerPortalSession } from '../../lib/stripe';
import { differenceInDays, format } from 'date-fns';
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

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  lastLogin: string;
  status: 'active' | 'invited' | 'disabled';
};

const AdminSettingsPage = () => {
  const { company, hasActiveSubscription, isTrialExpired, initialize, logout } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'subscription'>('company');
  
  // Company settings state
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url || null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teams, setTeams] = useState<ReportServiceTeam[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ReportServiceTeam | null>(null);
  const [teamFormLoading, setTeamFormLoading] = useState(false);
  
  // User management state
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
      lastLogin: '2025-04-10T14:30:00Z',
      status: 'active',
    },
    {
      id: '2',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'user',
      lastLogin: '2025-04-09T10:15:00Z',
      status: 'active',
    },
    {
      id: '3',
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Johnson',
      role: 'user',
      lastLogin: '2025-04-08T16:45:00Z',
      status: 'invited',
    },
  ]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Subscription state
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');

  // Forms
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

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    reset: resetUser,
    formState: { errors: userErrors },
  } = useForm<{ email: string; role: 'admin' | 'user' }>({
    defaultValues: {
      email: '',
      role: 'user',
    },
  });

  useEffect(() => {
    loadTeams();
    if (company?.logo_url) {
      setLogoPreview(company.logo_url);
    }
  }, [company?.logo_url]);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success('Payment successful! Your subscription has been updated.');
      initialize().then(() => {
        console.log('Payment successful - auth state refreshed');
      });
    } else if (canceled === 'true') {
      toast.error('Payment canceled. Please try again if you want to upgrade your subscription.');
    }

    if (activeTab === 'subscription') {
      loadSubscriptionData();
    }
  }, [searchParams, initialize, activeTab]);

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

  const loadSubscriptionData = async () => {
    try {
      const [subData, orderData] = await Promise.all([
        getCurrentSubscription(),
        getOrderHistory(),
      ]);
      setSubscription(subData);
      setOrders(orderData || []);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription information');
    }
  };
  
  // Company settings handlers
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = isImageValid(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setLogoUploading(true);

      const optimizedFile = await resizeAndOptimizeImage(file, 100, 100, 0.9);
      const uploadResult = await uploadFile(optimizedFile, 'logo');
      
      if (!uploadResult) {
        throw new Error('Failed to upload logo');
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .update({ logo_url: uploadResult.fileUrl })
        .eq('id', company?.id)
        .select()
        .single();

      if (adminError) {
        throw new Error(adminError.message);
      }

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

      const fileKey = extractFileKeyFromUrl(logoPreview);
      
      if (fileKey) {
        try {
          await deleteFile(fileKey);
          console.log('Logo file deleted from storage:', fileKey);
        } catch (storageError) {
          console.error('Error deleting logo from storage:', storageError);
        }
      }

      const { error: adminError } = await supabase
        .from('admin')
        .update({ logo_url: null })
        .eq('id', company.id);

      if (adminError) {
        throw new Error(adminError.message);
      }

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

  // Team management handlers
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

  // User management handlers
  const handleInviteUser = async (data: { email: string; role: 'admin' | 'user' }) => {
    try {
      toast.success(`Invitation sent to ${data.email}`);
      setShowInviteForm(false);
      resetUser();
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setUsers(users.filter(user => user.id !== userId));
      toast.success('User removed successfully');
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };

  // Subscription handlers
  const handlePlanChange = async (plan: keyof typeof STRIPE_PRODUCTS) => {
    try {
      setSubscriptionLoading(true);
      setSelectedPlan(plan);
      
      const checkoutUrl = await createCheckoutSession(plan);
      
      if (!checkoutUrl) {
        throw new Error('Failed to create checkout session');
      }
      
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || 'Failed to process plan change');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const portalUrl = await createCustomerPortalSession(window.location.href);
      
      if (!portalUrl) {
        throw new Error('Failed to create customer portal session');
      }
      
      window.location.href = portalUrl;
    } catch (error: any) {
      console.error('Error creating customer portal session:', error);
      toast.error(error.message || 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await logout();
      navigate('/');
    }
  };
  // Calculated values
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const trialDaysRemaining = company?.trialEndsAt
    ? differenceInDays(new Date(company.trialEndsAt), new Date())
    : 0;

  const isTrialActive = company?.subscription_status === 'trialing' && trialDaysRemaining > 0;

  const currentPlan = Object.entries(STRIPE_PRODUCTS).find(([key, product]) => 
    key === company?.tier
  );

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your company information, users, and subscription.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://scopostay.com/support', '_blank')}
            leftIcon={<HelpCircle size={16} />}
            className="text-primary-600 hover:text-primary-700 border-primary-200 hover:border-primary-300"
          >
            <span className="hidden sm:inline">Support</span>
            <span className="sm:hidden">Help</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut size={16} />}
            className="text-gray-600 hover:text-gray-800"
          >
            <span className="hidden sm:inline">Sign Out</span>
            <span className="sm:hidden">Logout</span>
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('company')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'company'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                Company Info
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                User Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'subscription'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                Subscription
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Company Info Tab */}
          {activeTab === 'company' && (
            <div className="space-y-8">
              {/* Company Logo Section */}
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-4">Company Logo</h3>
                <div className="flex items-center space-x-6">
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

              {/* Company Information Form */}
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

              {/* Report Service Teams */}
              <div className="border-t border-gray-200 pt-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Report Service Teams</h3>
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

                {showTeamForm && (
                  <div className="mb-6 bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">
                      {editingTeam ? 'Edit Team' : 'Add New Team'}
                    </h4>
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
                    <h4 className="mt-2 text-sm font-medium text-gray-900">No teams yet</h4>
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
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-medium text-gray-900">User Management</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage user access and permissions for your organization.
                  </p>
                </div>
                <Button
                  onClick={() => setShowInviteForm(true)}
                  leftIcon={<UserPlus size={16} />}
                  size="sm"
                >
                  Invite User
                </Button>
              </div>

              {showInviteForm && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Invite New User</h4>
                  <form onSubmit={handleSubmitUser(handleInviteUser)} className="space-y-4">
                    <Input
                      label="Email address"
                      type="email"
                      error={userErrors.email?.message}
                      {...registerUser('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        {...registerUser('role')}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowInviteForm(false);
                          resetUser();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" leftIcon={<Mail size={16} />}>
                        Send Invitation
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-700 font-medium">
                                {user.firstName.charAt(0)}
                                {user.lastName.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Shield size={16} className="text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900 capitalize">{user.role}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : user.status === 'invited'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Edit size={16} />}
                              onClick={() => toast.info('Edit user functionality coming soon')}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 size={16} />}
                              onClick={() => handleDeleteUser(user.id)}
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
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-8">
              {/* Trial Status Banner */}
              {isTrialActive && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-primary-500 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-primary-800">Trial Period Active</h4>
                        <p className="text-sm text-primary-600">
                          {company?.subscription_status === 'trialing' 
                            ? `${trialDaysRemaining} days remaining • Ends ${company?.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : 'soon'}`
                            : 'Start your 14-day free trial with full access to all features'
                          }
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-primary-600">
                        Trial ends on {format(new Date(company!.trialEndsAt!), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trial Expired Banner */}
              {isTrialExpired && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Trial Expired</h4>
                      <p className="text-sm text-red-600">
                        Your trial period has ended. Please select a plan to continue using scopoStay.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Plan */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="text-base font-medium text-gray-900">
                      {currentPlan ? currentPlan[1].name : 'No Active Plan'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {isTrialActive ? 'Trial' : hasActiveSubscription ? 'Active' : 'Inactive'}
                    </p>
                    {subscription?.price_id && (
                      <p className="text-xs text-gray-400 mt-1">
                        Price ID: {subscription.price_id}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-shrink-0">
                    {subscription?.current_period_end && hasActiveSubscription && (
                      <div className="flex items-center text-sm text-gray-500 whitespace-nowrap">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          Renews on{' '}
                          {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      leftIcon={<CreditCard size={16} />}
                      onClick={handleManageBilling}
                      isLoading={portalLoading}
                    >
                      Manage Billing
                    </Button>
                  </div>
                </div>
              </div>

              {/* Available Plans */}
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4">Available Plans</h4>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-3"
                >
                  {Object.entries(STRIPE_PRODUCTS).map(([key, product]) => (
                    <div
                      key={key}
                      className={`relative rounded-lg shadow-sm divide-y divide-gray-200 w-full ${
                        currentPlan && currentPlan[0] === key
                          ? 'border-2 border-primary-500 bg-primary-50'
                          : 'border border-gray-200 bg-white'
                      }`}
                    >
                      {product.popular && (
                        <div className="absolute top-0 right-0 bg-primary-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg rounded-tr-lg">
                          Popular
                        </div>
                      )}
                      <div className="p-6">
                        <h5 className="text-lg font-medium text-gray-900">{product.name}</h5>
                        <p className="mt-2 text-sm text-gray-500">{product.description}</p>
                        <p className="mt-4">
                          <span className="text-3xl font-bold text-gray-900">${product.price}</span>
                          <span className="text-base font-medium text-gray-500">/month</span>
                        </p>
                        {company?.subscription_status === 'trialing' && (
                          <div className="mt-4 p-3 bg-white/50 rounded-lg">
                            <h6 className="text-sm font-semibold text-primary-800 mb-2">Trial Benefits</h6>
                            <ul className="text-sm text-primary-700 space-y-1">
                              <li>• Full access to all {company?.tier} features</li>
                              <li>• No charges until trial expires</li>
                              <li>• Automatic billing starts after trial period</li>
                              <li>• Cancel anytime before trial ends</li>
                            </ul>
                          </div>
                        )}
                        <Button
                          className="mt-6 w-full"
                          variant={currentPlan && currentPlan[0] === key ? 'secondary' : 'default'}
                          disabled={currentPlan && currentPlan[0] === key || subscriptionLoading}
                          onClick={() => handlePlanChange(key as keyof typeof STRIPE_PRODUCTS)}
                          isLoading={subscriptionLoading && selectedPlan === key}
                          rightIcon={<ArrowRight size={16} />}
                        >
                          {currentPlan && currentPlan[0] === key
                            ? 'Current Plan' 
                            : isTrialActive || isTrialExpired 
                              ? company?.subscription_status === 'trialing' ? 'Upgrade Now' : 'Start Free Trial'
                              : 'Select Plan'
                          }
                        </Button>
                      </div>
                      <div className="px-6 pt-6 pb-8">
                        <h6 className="text-sm font-medium text-gray-900 tracking-wide uppercase">
                          What's included
                        </h6>
                        <ul className="mt-4 space-y-3">
                          {product.features.map((feature, index) => (
                            <li key={index} className="flex">
                              <Check className="flex-shrink-0 h-5 w-5 text-success-500" />
                              <span className="ml-3 text-sm text-gray-500">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Billing History */}
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-4">Billing History</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.order_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.order_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: order.currency || 'USD',
                            }).format((order.amount_total || 0) / 100)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                order.payment_status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : order.payment_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {order.payment_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Download size={16} />}
                              onClick={handleManageBilling}
                            >
                              Download
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            No billing history available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Subscription Status */}
              {subscription?.subscription_status === 'past_due' && (
                <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-error-400" />
                    </div>
                    <div className="ml-3">
                      <h5 className="text-sm font-medium text-error-800">Payment Past Due</h5>
                      <div className="mt-2 text-sm text-error-700">
                        <p>
                          Your last payment was unsuccessful. Please update your payment method to
                          continue using our services.
                        </p>
                      </div>
                      <div className="mt-4">
                        <div className="-mx-2 -my-1.5 flex">
                          <Button
                            variant="outline"
                            className="bg-error-50 text-error-700 hover:bg-error-100"
                            onClick={handleManageBilling}
                            isLoading={portalLoading}
                          >
                            Update Payment Method
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;