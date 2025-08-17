import React, { useState } from 'react';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { signUp } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';
import { Eye, EyeOff, Clock, CreditCard } from 'lucide-react';

type RegisterFormInputs = {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  company_name: string;
  registration_type: 'trial' | 'no_trial';
};

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    defaultValues: {
      registration_type: 'trial',
    },
  });
  
  const password = watch('password');
  const registrationType = watch('registration_type');
  
  // Clear any existing session when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      console.log('RegisterPage: Existing authenticated session detected. Logging out...');
      logout();
      toast.info('Logged out existing session to allow new registration.');
    }
  }, [isAuthenticated, logout]);
  
  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    setLoading(true);
    
    try {
      const { error } = await signUp(
        data.email, 
        data.password,
        {
          full_name: data.full_name,
          company_name: data.company_name,
          registration_type: data.registration_type,
        }
      );

      if (error) {
        console.error('Registration error:', error);
        
        // If it's an email confirmation error, show success message
        if (error.message.includes('Email not confirmed')) {
          navigate('/auth/confirm-email', { 
            state: { 
              email: data.email 
            }
          });
          toast.success('Please check your email to confirm your account');
          return;
        }
        
        // Handle other errors
        const errorMessage = error.message.includes('row-level security policy')
          ? 'Unable to create account. Please try again later.'
          : error.message.includes('already registered')
          ? 'This email is already registered. Please try logging in instead.'
          : error.message;
        
        toast.error(errorMessage);
        return;
      }

      // If no error, registration was successful
      navigate('/auth/confirm-email', { 
        state: { 
          email: data.email,
          registrationType: data.registration_type
        }
      });
      toast.success('Please check your email to confirm your account');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-3 sm:space-y-4">
      <h2 className="text-center text-xl sm:text-2xl font-bold leading-tight tracking-tight text-gray-900">
        Create your account
      </h2>
      
      <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Registration Type Selection */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
            Choose your account type
          </label>
          <div className="space-y-2 sm:space-y-3">
            <label className={`relative flex cursor-pointer rounded-lg border p-3 sm:p-4 focus:outline-none ${
              registrationType === 'trial'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 bg-white hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                value="trial"
                {...register('registration_type')}
                className="sr-only"
              />
              <div className="flex items-center">
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  registrationType === 'trial'
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300'
                }`}>
                  {registrationType === 'trial' && (
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  )}
                </div>
                <div className="ml-3">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2" />
                    <span className="text-sm sm:text-base font-medium text-gray-900">Start 14-Day Free Trial</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">Try all features free for 14 days, then choose your plan</p>
                </div>
              </div>
            </label>

            <label className={`relative flex cursor-pointer rounded-lg border p-3 sm:p-4 focus:outline-none ${
              registrationType === 'no_trial'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 bg-white hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                value="no_trial"
                {...register('registration_type')}
                className="sr-only"
              />
              <div className="flex items-center">
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  registrationType === 'no_trial'
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300'
                }`}>
                  {registrationType === 'no_trial' && (
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  )}
                </div>
                <div className="ml-3">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2" />
                    <span className="text-sm sm:text-base font-medium text-gray-900">Create Account (No Trial)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">Choose your plan and start immediately</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
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
        
        <Input
          label="Full Name"
          type="text"
          autoComplete="name"
          error={errors.full_name?.message}
          {...register('full_name', {
            required: 'Full name is required',
          })}
        />
        
        <Input
          label="Company Name"
          type="text"
          autoComplete="organization"
          error={errors.company_name?.message}
          {...register('company_name', {
            required: 'Company name is required',
          })}
        />
        
        <Button
          type="submit"
          fullWidth={true}
          isLoading={loading}
        >
          {registrationType === 'trial' ? 'Start Free Trial' : 'Create Account'}
        </Button>
      </form>
      
      <div className="mt-3 sm:mt-4 text-center">
        <p className="text-xs sm:text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;