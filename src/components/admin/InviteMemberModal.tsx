import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { X, Mail, UserPlus, Users, Crown } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'sonner';

interface InviteMemberModalProps {
  onClose: () => void;
  onInvite: (email: string, role: 'admin' | 'member') => Promise<void>;
  isLoading: boolean;
  currentAdminCount: number;
  totalCurrentUsers: number;
  tierLimits: { users: number; adminUsers: number };
}

type InviteFormData = {
  email: string;
  role: 'admin' | 'member';
};

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  onClose,
  onInvite,
  isLoading,
  currentAdminCount,
  totalCurrentUsers,
  tierLimits,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InviteFormData>({
    defaultValues: {
      email: '',
      role: 'member',
    },
  });

  const selectedRole = watch('role');

  const onSubmit: SubmitHandler<InviteFormData> = async (data) => {
    // Frontend validation for limits
    if (data.role === 'admin' && currentAdminCount >= tierLimits.adminUsers) {
      toast.error(`Admin limit reached (${tierLimits.adminUsers}). Upgrade your plan or change the role.`);
      return;
    }
    if (totalCurrentUsers >= tierLimits.users) {
      toast.error(`User limit reached (${tierLimits.users}). Upgrade your plan to invite more users.`);
      return;
    }

    try {
      if (!company?.id) {
        throw new Error('Company information not available');
      }

      // Create invitation record and get invitation URL
      const result = await createInvitation(data.email, data.role, company.id);
      
      if (!result) {
        throw new Error('Failed to create invitation');
      }

      // Send invitation email
      const emailSent = await sendInvitationEmail(
        data.email,
        result.invitationUrl,
        user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email || 'Team Admin',
        company.name,
        data.role
      );

      if (!emailSent) {
        throw new Error('Failed to send invitation email');
      }

      toast.success(`Invitation sent to ${data.email}. They will receive an email with instructions to join your team.`);
      onClose();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
    }
  };

  const canInviteAdmin = currentAdminCount < tierLimits.adminUsers;
  const canInviteMember = totalCurrentUsers < tierLimits.users;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite Team Member</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <Input
            label="Email Address"
            type="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            placeholder="member@example.com"
            leftIcon={<Mail size={16} className="text-gray-400" />}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Role
            </label>
            <div className="space-y-3">
              <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                selectedRole === 'member'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              } ${!canInviteMember ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  value="member"
                  {...register('role')}
                  className="sr-only"
                  disabled={!canInviteMember}
                />
                <div className="flex items-center w-full">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedRole === 'member'
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedRole === 'member' && (
                      <div className="h-2 w-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">Member</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Limited access
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Can perform inspections but cannot access company settings
                    </p>
                  </div>
                </div>
              </label>

              <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                selectedRole === 'admin'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              } ${!canInviteAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  value="admin"
                  {...register('role')}
                  className="sr-only"
                  disabled={!canInviteAdmin}
                />
                <div className="flex items-center w-full">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedRole === 'admin'
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedRole === 'admin' && (
                      <div className="h-2 w-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Crown className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">Admin</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Full access
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Can manage properties, templates, and company settings
                    </p>
                  </div>
                </div>
              </label>
            </div>
            
            {/* Usage limits display */}
            <div className="mt-3 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Current usage:</span>
                <span>
                  {totalCurrentUsers} / {tierLimits.users === Infinity ? '∞' : tierLimits.users} total users
                </span>
              </div>
              <div className="flex justify-between">
                <span>Admin users:</span>
                <span>
                  {currentAdminCount} / {tierLimits.adminUsers === Infinity ? '∞' : tierLimits.adminUsers} admins
                </span>
              </div>
            </div>

            {!canInviteMember && (
              <p className="mt-2 text-xs text-red-500">
                Total user limit reached for your plan. Upgrade to invite more users.
              </p>
            )}
            {!canInviteAdmin && selectedRole === 'admin' && (
              <p className="mt-2 text-xs text-red-500">
                Admin user limit reached for your plan. Upgrade to invite more admins.
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <Mail className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-xs font-medium text-blue-800">How it works</h4>
                <div className="mt-1 text-xs text-blue-700">
                  <p>
                    An invitation email will be sent to the provided address with a secure invitation link. The user will be prompted to create an account with their own password. Once they sign up, they will automatically be added to your team with the selected role.
                  </p>
                </div>
              </div>
            </div>
          </div>
          </form>
        </div>

        <div className="flex-shrink-0 flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            isLoading={isLoading}
            disabled={
              isLoading || 
              (!canInviteMember) || 
              (!canInviteAdmin && selectedRole === 'admin')
            }
            leftIcon={<UserPlus size={16} />}
          >
            Send Invitation
          </Button>
        </div>
      </div>
    </div>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={
                isLoading || 
                (!canInviteMember) || 
                (!canInviteAdmin && selectedRole === 'admin')
              }
              leftIcon={<UserPlus size={16} />}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberModal;