import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { signIn, resendConfirmationEmail } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

type LoginFormInputs = {
  email: string;
  password: string;
};

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { initialize } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormInputs>();
  
  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setLoading(true);
    
    try {
      const { error, data: authData } = await signIn(data.email, data.password);
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setNeedsConfirmation(true);
          toast.error('Please confirm your email before logging in.');
          
          // Redirect to email confirmation page with the email
          navigate('/auth/confirm-email', { 
            state: { 
              email: data.email 
            }
          });
          return;
        } else {
          toast.error(error.message || 'Failed to sign in');
        }
        return;
      }
      
      await initialize();
      toast.success('Logged in successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendConfirmation = async () => {
    const email = getValues('email');
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await resendConfirmationEmail(email);
      
      if (error) {
        toast.error(error.message || 'Failed to resend confirmation email');
        return;
      }
      
      toast.success('Confirmation email has been resent');
      
      // Redirect to email confirmation page
      navigate('/auth/confirm-email', { 
        state: { 
          email: email 
        }
      });
    } catch (error) {
      console.error('Resend confirmation error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Check for message in URL params
  React.useEffect(() => {
    const message = new URLSearchParams(location.search).get('message');
    if (message) {
      toast.info(message);
    }
    
    const error = new URLSearchParams(location.search).get('error');
    if (error) {
      toast.error(decodeURIComponent(error));
    }
  }, [location]);
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-center text-xl sm:text-2xl font-bold leading-tight tracking-tight text-gray-900">
        Sign in to your account
      </h2>
      
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
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
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 sm:h-5 sm:w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-gray-900">
              Remember me
            </label>
          </div>
          
          <div className="text-xs sm:text-sm">
            <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500 whitespace-nowrap">
              Forgot your password?
            </Link>
          </div>
        </div>
        
        {needsConfirmation && (
          <div className="text-center bg-amber-50 p-2 sm:p-3 rounded-md">
            <p className="text-xs sm:text-sm text-amber-800 mb-2">
              Please confirm your email address before logging in.
            </p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              className="text-xs sm:text-sm font-medium text-amber-800 underline"
              disabled={loading}
            >
              Resend confirmation email
            </button>
          </div>
        )}
        
        <Button type="submit" fullWidth={true} isLoading={loading}>
          Sign in
        </Button>
      </form>
      
      <div className="mt-4 sm:mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs sm:text-sm">
            <span className="bg-white px-2 text-gray-500">Or</span>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;