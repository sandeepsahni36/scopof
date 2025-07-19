import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { resetPassword } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';

type ForgotPasswordFormInputs = {
  email: string;
};

const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormInputs>();
  
  const onSubmit: SubmitHandler<ForgotPasswordFormInputs> = async (data) => {
    setLoading(true);
    
    try {
      const { error } = await resetPassword(data.email);
      
      if (error) {
        toast.error(error.message || 'Failed to send reset password email');
        return;
      }
      
      setSubmitted(true);
      toast.success('Password reset instructions have been sent to your email');
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 mb-6">
        Reset your password
      </h2>
      
      {submitted ? (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            We've sent password reset instructions to your email address.
            Please check your inbox and follow the link to reset your password.
          </p>
          <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Return to login
          </Link>
        </div>
      ) : (
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
          
          <Button type="submit" fullWidth={true} isLoading={loading}>
            Send reset instructions
          </Button>
          
          <div className="text-center">
            <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              Back to login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;