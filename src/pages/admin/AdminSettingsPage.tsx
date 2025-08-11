import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Users, CreditCard, Upload, X, Check, AlertTriangle, Crown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../lib/storage';
import { isImageValid, resizeAndOptimizeImage } from '../../lib/utils';
import { createCheckoutSession, createCustomerPortalSession, getCurrentSubscription } from '../../lib/stripe';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { toast } from 'sonner';

interface CompanyFormData {
  companyName: string;
  brandColor: string;
  reportBackground: string;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
}

const AdminSettingsPage = () => {
  const { user, company, isAdmin } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'subscription'>('company');
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const isStarterTier = company?.tier === 'starter';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyFormData>({
    defaultValues: {
      companyName: company?.name || '',
      brandColor: company?.brandColor || '#2563EB',
      reportBackground: company?.reportBackground || '#FFFFFF',
    },
  });

  useEffect(() => {
    if (company) {
      setValue('companyName', company.name);
      setValue('brandColor', company.brandColor || '#2563EB');
      setValue('reportBackground', company.reportBackground || '#FFFFFF');
    }
  }, [company, setValue]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadTeamMembers();
    } else if (activeTab === 'subscription') {
      loadSubscriptionData();
    }
  }, [activeTab]);

  const loadTeamMembers = async () => {
    try {
      setTeamLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          role,
          created_at,
          profiles (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const members: TeamMember[] = data.map(member => ({
        id: member.id,
        email: member.profiles?.email || '',
        fullName: member.profiles?.full_name || '',
        role: member.role,
        createdAt: member.created_at,
      }));

      setTeamMembers(members);
    } catch (error: any) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setTeamLoading(false);
    }
  };

  const loadSubscriptionData = async () => {
    try {
      setSubscriptionLoading(true);
      const subscriptionData = await getCurrentSubscription();
      setSubscription(subscriptionData);
    } catch (error: any) {
      console.error('Error loading subscription:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setLoading(true);

      // For starter tier, force default values
      const updateData = isStarterTier ? {
        company_name: data.companyName,
        brand_color: '#2563EB',
        report_background: '#FFFFFF',
      } : {
        company_name: data.companyName,
        brand_color: data.brandColor,
        report_background: data.reportBackground,
      };

      const { error } = await supabase
        .from('admin')
        .update(updateData)
        .eq('owner_id', user?.id);

      if (error) throw error;

      toast.success('Company settings updated successfully');
      
      // Refresh the auth store to get updated company data
      const { initialize } = useAuthStore.getState();
      await initialize();
    } catch (error: any) {
      console.error('Error updating company settings:', error);
      toast.error('Failed to update company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate image
    const validation = isImageValid(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setLogoUploading(true);

      // Resize and optimize the image
      const optimizedFile = await resizeAndOptimizeImage(file, 100, 100, 0.8);

      // Upload the logo
      const uploadResult = await uploadFile(optimizedFile, 'logo');
      
      if (!uploadResult) {
        throw new Error('Failed to upload logo');
      }

      // Update admin record with logo URL
      const { error } = await supabase
        .from('admin')
        .update({ logo_url: uploadResult.fileUrl })
        .eq('owner_id', user?.id);

      if (error) throw error;

      toast.success('Logo uploaded successfully');
      
      // Refresh the auth store to get updated company data
      const { initialize } = useAuthStore.getState();
      await initialize();
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleManageBilling = async () => {
    try {
      const portalUrl = await createCustomerPortalSession(
        `${window.location.origin}/dashboard/admin/settings?tab=subscription`
      );
      
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal');
    }
  };

  const handleUpgrade = async (planKey: string) => {
    try {
      const checkoutUrl = await createCheckoutSession(planKey as any);
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start upgrade process');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Only administrators can access company settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
        <p className="mt-1 text-lg text-gray-500">
          Manage your company information, team members, and subscription
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-8">
            <button
              onClick={() => setActiveTab('company')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'company'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <Building2 className="w-4 h-4 inline mr-2" />
              Company Info
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <Users className="w-4 h-4 inline mr-2" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'subscription'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Subscription
            </button>
          </nav>
        </div>

        <div className="p-8">
          {activeTab === 'company' && (
            <div className="space-y-8">
              {/* Starter Tier Notice */}
              {isStarterTier && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Crown className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Starter Plan Limitations
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          Your current plan includes basic branding features. Upgrade to Professional or Enterprise 
                          to customize your brand colors, report backgrounds, and company logo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Company Name */}
                <Input
                  label="Company Name"
                  error={errors.companyName?.message}
                  {...register('companyName', {
                    required: 'Company name is required',
                  })}
                />

                {/* Company Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                    {isStarterTier && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Upgrade Required
                      </span>
                    )}
                  </label>
                  
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {company?.logo ? (
                        <img
                          src={company.logo}
                          alt="Company Logo"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <img
                          src="/Scopostay long full logo blue.png"
                          alt="Default Logo"
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      {isStarterTier ? (
                        <div className="text-sm text-gray-500">
                          <p>Logo customization is available with Professional and Enterprise plans.</p>
                          <p className="mt-1">Currently using scopoStay default logo.</p>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                            disabled={logoUploading}
                          />
                          <label
                            htmlFor="logo-upload"
                            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                              logoUploading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {logoUploading ? 'Uploading...' : 'Upload Logo'}
                          </label>
                          <p className="mt-2 text-xs text-gray-500">
                            PNG or JPG, max 300KB, recommended 100x100px
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Brand Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Color
                    {isStarterTier && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Upgrade Required
                      </span>
                    )}
                  </label>
                  <div className="flex items-center space-x-4">
                    <div
                      className="h-10 w-16 rounded border border-gray-300"
                      style={{ backgroundColor: isStarterTier ? '#2563EB' : watch('brandColor') }}
                    />
                    <input
                      type="color"
                      disabled={isStarterTier}
                      className={`h-10 w-20 rounded border border-gray-300 ${
                        isStarterTier ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      {...register('brandColor')}
                    />
                    {isStarterTier && (
                      <span className="text-sm text-gray-500">
                        Color customization available with Professional and Enterprise plans
                      </span>
                    )}
                  </div>
                </div>

                {/* Report Background */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Background Color
                    {isStarterTier && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Upgrade Required
                      </span>
                    )}
                  </label>
                  <div className="flex items-center space-x-4">
                    <div
                      className="h-10 w-16 rounded border border-gray-300"
                      style={{ backgroundColor: isStarterTier ? '#FFFFFF' : watch('reportBackground') }}
                    />
                    <input
                      type="color"
                      disabled={isStarterTier}
                      className={`h-10 w-20 rounded border border-gray-300 ${
                        isStarterTier ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      {...register('reportBackground')}
                    />
                    {isStarterTier && (
                      <span className="text-sm text-gray-500">
                        Background customization available with Professional and Enterprise plans
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <Button
                    type="submit"
                    isLoading={loading}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                  <p className="text-sm text-gray-500">Manage your team members and their roles</p>
                </div>
                <Button leftIcon={<Users size={16} />}>
                  Invite Member
                </Button>
              </div>

              {teamLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading team members...</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teamMembers.map((member) => (
                        <tr key={member.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary-700">
                                  {member.fullName?.charAt(0) || member.email?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {member.fullName || 'No name'}
                                </div>
                                <div className="text-sm text-gray-500">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.role === 'owner'
                                ? 'bg-purple-100 text-purple-800'
                                : member.role === 'admin'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(member.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {member.role !== 'owner' && (
                              <Button variant="ghost" size="sm">
                                Remove
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                <p className="text-sm text-gray-500">Manage your subscription and billing</p>
              </div>

              {subscriptionLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading subscription...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Plan Card */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 capitalize">
                          {company?.tier || 'Starter'} Plan
                        </h4>
                        <p className="text-sm text-gray-500">
                          {STRIPE_PRODUCTS[company?.tier as keyof typeof STRIPE_PRODUCTS]?.description || 'Basic plan features'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${STRIPE_PRODUCTS[company?.tier as keyof typeof STRIPE_PRODUCTS]?.price || 29}
                        </div>
                        <div className="text-sm text-gray-500">per month</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button onClick={handleManageBilling}>
                        Manage Billing
                      </Button>
                    </div>
                  </div>

                  {/* Available Plans */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {Object.entries(STRIPE_PRODUCTS).map(([key, product]) => {
                        const isCurrentPlan = company?.tier === key;
                        const isUpgrade = !isCurrentPlan;

                        return (
                          <div
                            key={key}
                            className={`border rounded-lg p-6 ${
                              isCurrentPlan
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-lg font-semibold text-gray-900">
                                {product.name}
                              </h5>
                              {isCurrentPlan && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                  Current
                                </span>
                              )}
                            </div>

                            <div className="mb-4">
                              <span className="text-3xl font-bold text-gray-900">${product.price}</span>
                              <span className="text-gray-500">/month</span>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">{product.description}</p>

                            <ul className="space-y-2 mb-6">
                              {product.features.map((feature, index) => (
                                <li key={index} className="flex items-center text-sm text-gray-600">
                                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>

                            {isUpgrade && (
                              <Button
                                fullWidth
                                onClick={() => handleUpgrade(key)}
                                className="bg-primary-600 hover:bg-primary-700"
                              >
                                Upgrade to {product.name}
                              </Button>
                            )}
                          </div>
                        );
                      })}
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