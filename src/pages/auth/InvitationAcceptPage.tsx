import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Mail, UserPlus, AlertTriangle, CheckCircle, Eye, EyeOff, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getInvitationByToken, Invitation } from '../../lib/invitations';
import { signUp } from '../../lib/supabase';
import { toast } from 'sonner';

type AcceptInvitationFormInputs = {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
};

const InvitationAcceptPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AcceptInvitationFormInputs>();

  const password = watch('password');

  useEffect(() => {
    if (token) {
      validateInvitation(token);
    } else {
      setError('Invalid invitation link - no token provided');
      setLoading(false);
    }
  }, [token]);

  const validateInvitation = async (invitationToken: string) => {
    try {
      setLoading(true);
      const invitationData = await getInvitationByToken(invitationToken);
      
      if (!invitationData) {
        setError('This invitation link is invalid, expired, or has already been used.');
        return;
      }

      setInvitation(invitationData);
      // Set the email value in the form when invitation is loaded
      setValue('email', invitationData.email);
    } catch (error: any) {
      console.error('Error validating invitation:', error);
      setError('Failed to validate invitation. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit: SubmitHandler<AcceptInvitationFormInputs> = async (data) => {
    if (!invitation) return;

    // Explicit validation to prevent anonymous signup error
    if (!data.password || data.password.length === 0) {
      toast.error('Password is required');
      return;
    }

    if (!data.email || data.email.length === 0) {
      toast.error('Email is required');
      return;
    }

    setSubmitting(true);

    try {
      // Sign up the user with Supabase
      const { error: signUpError } = await signUp(
        data.email,
        data.password,
        {
          full_name: data.full_name,
          invitation_token: invitation.token, // Include token in metadata for trigger
        } as any
      );

      if (signUpError) {
        console.error('Signup error:', signUpError);
        
        if (signUpError.message.includes('Email not confirmed')) {
          // For invited users, we'll handle this differently
          toast.success('Account created successfully! Please check your email to confirm your account.');
          navigate('/auth/confirm-email', { 
            state: { 
              email: data.email,
              isInvitedUser: true,
              invitationToken: invitation.token
            }
          });
          return;
        }
        
        const errorMessage = signUpError.message.includes('already registered')
          ? 'This email is already registered. Please try logging in instead.'
          : signUpError.message;
        
        toast.error(errorMessage);
        return;
      }

      // Success - user will be automatically assigned to team via database trigger
      toast.success('Account created successfully! Welcome to the team.');
      navigate('/auth/confirm-email', { 
        state: { 
          email: data.email,
          isInvitedUser: true,
          invitationToken: invitation.token
        }
      });
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
              <h2 className="text-lg font-medium text-gray-900">Validating invitation...</h2>
              <p className="mt-2 text-sm text-gray-600">Please wait while we verify your invitation.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex-shrink-0 pb-4 sm:pb-6 text-center">
            <img src="/Scopostay long full logo blue.png" alt="scopoStay Logo" className="h-8 sm:h-10 w-auto mx-auto" />
          </div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
              <p className="text-sm text-gray-600 text-center mb-6">{error}</p>
              <div className="space-y-3 w-full">
                <Link to="/login">
                  <Button fullWidth>
                    Go to Login
                  </Button>
                </Link>
                <p className="text-xs text-gray-500 text-center">
                  Need help? Contact support@scopostay.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex-shrink-0 pb-4 sm:pb-6 text-center">
          <img src="/Scopostay long full logo blue.png" alt="scopoStay Logo" className="h-8 sm:h-10 w-auto mx-auto" />
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Invitation Header */}
          <div className="text-center mb-6">
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Join the Team
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You've been invited to join as a <span className="font-medium text-primary-600">{invitation.role}</span>
            </p>
          </div>

          {/* Invitation Details */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-primary-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-primary-900">
                  Company Invitation
                </p>
                <p className="text-xs text-primary-700">
                  You're being invited to join a property management team
                </p>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={invitation.email}
                readOnly
                className="h-10 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed"
                {...register('email', { value: invitation.email })}
              />
            </div>

            <Input
              label="Full Name"
              type="text"
              autoComplete="name"
              error={errors.full_name?.message}
              {...register('full_name', {
                required: 'Full name is required',
              })}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff size={20} aria-label="Hide password" />
                ) : (
                  <Eye size={20} aria-label="Show password" />
                )}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === password || 'Passwords do not match',
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} aria-label="Hide password" />
                ) : (
                  <Eye size={20} aria-label="Show password" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              fullWidth={true}
              isLoading={submitting}
              leftIcon={<CheckCircle size={16} />}
            >
              Create Account & Join Team
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationAcceptPage;