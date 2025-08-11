import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';

type ResetPasswordFormInputs = {
  password: string;
  confirmPassword: string;
};

const ResetPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormInputs>();
  
  const password = watch('password');
  
  const onSubmit: SubmitHandler<ResetPasswordFormInputs> = async (data) => {
    setLoading(true);
    
    try {
      // In a real implementation, we would call Supabase to update the password
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Password has been reset successfully');
      navigate('/login');
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-center text-xl sm:text-2xl font-bold leading-tight tracking-tight text-gray-900">
        Create new password
      </h2>
      
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="New password"
          type="password"
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
        
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
        />
        
        <Button type="submit" fullWidth={true} isLoading={loading}>
          Reset password
        </Button>
        
        <div className="text-center mt-4">
          <Link to="/login" className="text-xs sm:text-sm font-medium text-primary-600 hover:text-primary-500">
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordPage;