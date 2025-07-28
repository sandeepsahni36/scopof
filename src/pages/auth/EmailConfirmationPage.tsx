import React from 'react';
import { useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { resendConfirmationEmail } from '../../lib/supabase';
import { toast } from 'sonner';

const EmailConfirmationPage = () => {
  const location = useLocation();
  const email = location.state?.email;
  const registrationType = location.state?.registrationType || 'trial';
  const [resending, setResending] = React.useState(false);

  const handleResendEmail = async () => {
    if (!email) return;
    
    try {
      setResending(true);
      await resendConfirmationEmail(email);
      toast.success('Confirmation email has been resent');
    } catch (error) {
      console.error('Failed to resend confirmation email:', error);
      toast.error('Failed to resend confirmation email');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="text-center">
        <p className="text-gray-600">No email address provided. Please return to registration.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 mb-6">
        Check your email
      </h2>

      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col items-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <Mail className="h-6 w-6 text-primary-600" />
          </div>
          
          <p className="mt-4 text-center text-gray-600">
            We've sent a confirmation email to{' '}
            <span className="font-medium text-gray-900">{email}</span>
          </p>
          
          <p className="mt-2 text-sm text-center text-gray-500">
            Please verify your email address by following the instructions sent to your email.
            {registrationType === 'trial' && ' After confirmation, you\'ll be able to start your 14-day free trial.'}
            {registrationType === 'no_trial' && ' After confirmation, you\'ll be able to choose your plan and get started.'}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Didn't receive the email?</h3>
            <p className="mt-2 text-sm text-gray-500">
              Check your spam folder or click the button below to resend the confirmation email.
            </p>
            <Button
              variant="link"
              className="mt-2 p-0"
              onClick={handleResendEmail}
              isLoading={resending}
            >
              Resend confirmation email
            </Button>
          </div>

          <p className="text-sm text-center text-gray-500">
            You can close this page after verifying your email address.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationPage;