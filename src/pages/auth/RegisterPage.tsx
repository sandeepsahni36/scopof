import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { signUp } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

type RegisterFormInputs = {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  company_name: string;
};

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInputs>();
  
  const password = watch('password');
  
  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    setLoading(true);
    
    try {
      const { error } = await signUp(
        data.email, 
        data.password,
        {
          full_name: data.full_name,
          company_name: data.company_name,
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
          email: data.email 
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
    <div>
      <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 mb-6">
        Start your free trial
      </h2>
      
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
          Start Free Trial
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
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