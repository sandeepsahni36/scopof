import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';
import { validateUserSession, handleAuthError } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

const StartTrialPage = () => {
  const navigate = useNavigate();
  const { hasActiveSubscription, isTrialExpired, requiresPayment } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState('professional');
  const [authError, setAuthError] = useState<string | null>(null);
  const [validatingAuth, setValidatingAuth] = useState(true);

  useEffect(() => {
    // Redirect users who already have active paid subscriptions (not trial users)
    if (hasActiveSubscription && company?.subscription_status === 'active') {
      navigate('/dashboard');
      return;
    }

    // Redirect users whose trial has expired to subscription required page
    if (isTrialExpired || requiresPayment) {
      navigate('/subscription-required');
      return;
    }

    // Validate user session on component mount
    const checkAuth = async () => {
      try {
        const user = await validateUserSession();
        if (!user) {
          setAuthError('Your session has expired. Please sign in again.');
        }
      } catch (error: any) {
        console.error('Auth validation error:', error);
        setAuthError('Authentication error. Please sign in again.');
      } finally {
        setValidatingAuth(false);
      }
    };

    checkAuth();
  }, [hasActiveSubscription, isTrialExpired, requiresPayment, navigate]);

  const handleStartTrial = async () => {
    try {
      setLoading(true);
      
      // Validate session before proceeding
      const user = await validateUserSession();
      if (!user) {
        await handleAuthError(new Error('Session expired'));
        return;
      }

      console.log('Starting trial with selected tier:', selectedTier);
      console.log('StartTrialPage: About to call createCheckoutSession');
      
      const checkoutUrl = await createCheckoutSession(selectedTier as any);
      
      console.log('StartTrialPage: Received checkout URL:', checkoutUrl);
      
      if (!checkoutUrl) {
        console.error('StartTrialPage: No checkout URL returned');
        throw new Error('Failed to create checkout session');
      }
      
      console.log('Redirecting to checkout URL:', checkoutUrl);
      console.log('StartTrialPage: About to redirect to Stripe checkout');
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Failed to start trial:', error);
      
      // Check if it's an authentication error
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return;
      }
      
      toast.error(error.message || 'Failed to start trial');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryAuth = () => {
    navigate('/login?message=Please sign in again to continue');
  };

  // Convert Stripe products to display format
  const pricingTiers = Object.entries(STRIPE_PRODUCTS).map(([key, product]) => ({
    id: key,
    name: product.name,
    price: product.price,
    description: product.description,
    features: product.features,
    popular: product.popular || false,
  }));

  if (validatingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
              <h2 className="text-lg font-medium text-gray-900">Validating session...</h2>
              <p className="mt-2 text-sm text-gray-600">Please wait while we verify your credentials.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
              <p className="text-sm text-gray-600 text-center mb-6">{authError}</p>
              <Button onClick={handleRetryAuth} className="w-full">
                Sign In Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Start Your Free Trial
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Choose your plan and start managing your properties today
          </p>
        </div>

        {/* Pricing Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-8 mb-12"
        >
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                selectedTier === tier.id
                  ? 'border-2 border-primary-500 bg-primary-50 shadow-xl'
                  : 'border border-gray-200 bg-white hover:shadow-xl'
              }`}
              onClick={() => setSelectedTier(tier.id)}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-primary-500 text-white px-4 py-2 text-sm font-medium rounded-bl-lg">
                  Popular
                </div>
              )}
              
              {/* Plan Header */}
              <div className="px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                      selectedTier === tier.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedTier === tier.id && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6">{tier.description}</p>
                
                <div className="mb-6">
                  <span className="text-5xl font-extrabold text-gray-900">${tier.price}</span>
                  <span className="text-xl text-gray-500">/month</span>
                </div>
              </div>

              {/* Features */}
              <div className="px-8 pb-8 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                  What's included
                </h4>
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="flex-shrink-0 h-5 w-5 text-primary-500 mt-0.5" />
                      <span className="ml-3 text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Action Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <Button
              fullWidth
              size="lg"
              onClick={handleStartTrial}
              isLoading={loading}
              rightIcon={!loading ? <ArrowRight size={20} /> : undefined}
              className="bg-primary-600 hover:bg-primary-700 text-lg py-4 mb-6"
            >
              Start 14-Day Free Trial
            </Button>
            
            <div className="text-center mb-6">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Sign out instead
              </button>
            </div>

            {/* What happens next */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                What happens next?
              </h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <Check className="flex-shrink-0 h-5 w-5 text-primary-500 mt-0.5" />
                  <span className="ml-3">Start your 14-day free trial immediately</span>
                </li>
                <li className="flex items-start">
                  <Check className="flex-shrink-0 h-5 w-5 text-primary-500 mt-0.5" />
                  <span className="ml-3">
                    Full access to all {STRIPE_PRODUCTS[selectedTier as keyof typeof STRIPE_PRODUCTS]?.name} features
                  </span>
                </li>
                <li className="flex items-start">
                  <Check className="flex-shrink-0 h-5 w-5 text-primary-500 mt-0.5" />
                  <span className="ml-3">No charges during trial period</span>
                </li>
                <li className="flex items-start">
                  <Check className="flex-shrink-0 h-5 w-5 text-primary-500 mt-0.5" />
                  <span className="ml-3">Cancel anytime before trial ends</span>
                </li>
                <li className="flex items-start">
                  <Check className="flex-shrink-0 h-5 w-5 text-primary-500 mt-0.5" />
                  <span className="ml-3">Automatic billing starts after trial expires</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartTrialPage;