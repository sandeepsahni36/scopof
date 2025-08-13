import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';
import { validateUserSession, handleAuthError } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

const StartTrialPage = () => {
  const navigate = useNavigate();
  const { hasActiveSubscription, isTrialExpired, requiresPayment, company } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState('professional');
  const [authError, setAuthError] = useState<string | null>(null);
  const [validatingAuth, setValidatingAuth] = useState(true);

  // Get registration type from localStorage
  const registrationType = localStorage.getItem('registration_type');
  const skipTrial = registrationType === 'no_trial';

  console.log('StartTrialPage: Component state:', {
    hasActiveSubscription,
    isTrialExpired,
    requiresPayment,
    company: company?.name,
    subscriptionStatus: company?.subscription_status,
    registrationType,
    skipTrial
  });

  useEffect(() => {
    // Redirect users who already have active paid subscriptions (not trial users)
    if (hasActiveSubscription && company?.subscription_status === 'active') {
      console.log('StartTrialPage: Redirecting to dashboard - active paid subscription');
      navigate('/dashboard');
      return;
    }

    // Redirect users whose trial has expired to subscription required page
    if (isTrialExpired || requiresPayment) {
      console.log('StartTrialPage: Redirecting to subscription-required - trial expired or payment required');
      navigate('/subscription-required');
      return;
    }

    // Validate user session on component mount
    const checkAuth = async () => {
      try {
        console.log('StartTrialPage: Validating user session...');
        const user = await validateUserSession();
        if (!user) {
          console.log('StartTrialPage: No valid user session found');
          setAuthError('Your session has expired. Please sign in again.');
        } else {
          console.log('StartTrialPage: User session validated successfully:', user.email);
        }
      } catch (error: any) {
        console.error('Auth validation error:', error);
        setAuthError('Authentication error. Please sign in again.');
      } finally {
        setValidatingAuth(false);
      }
    };

    checkAuth();
  }, [hasActiveSubscription, isTrialExpired, requiresPayment, navigate, company?.subscription_status]);

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
      
      const checkoutUrl = await createCheckoutSession(selectedTier as any, skipTrial);
      
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
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            {skipTrial ? 'Choose Your Plan' : 'Start Your Free Trial'}
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            {skipTrial 
              ? 'Select your plan and start managing your properties today'
              : 'Get full access to all features with our 14-day free trial'
            }
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                  selectedTier === tier.id
                    ? 'border-2 border-primary-500 bg-primary-50 shadow-xl ring-4 ring-primary-100 scale-[1.02]'
                    : 'border border-gray-200 bg-white hover:shadow-xl hover:border-primary-300'
                } flex flex-col h-full`}
                onClick={() => setSelectedTier(tier.id)}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-primary-500 text-white px-4 py-2 text-sm font-medium rounded-bl-lg z-10">
                    Popular
                  </div>
                )}
                
                {/* Plan Header */}
                <div className="p-8 flex-shrink-0">
                  <div className="flex items-center mb-6">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                      selectedTier === tier.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedTier === tier.id && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <h3 className="ml-4 text-2xl font-bold text-gray-900">{tier.name}</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed">{tier.description}</p>
                  
                  <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold text-gray-900">${tier.price}</span>
                    <span className="ml-2 text-xl text-gray-500">/month</span>
                  </div>
                </div>

                {/* Features */}
                <div className="px-8 pb-8 flex-grow">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">
                    What's included
                  </h4>
                  <ul className="space-y-4">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="flex-shrink-0 h-5 w-5 text-primary-500 mt-0.5" />
                        <span className="ml-4 text-gray-700 leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedTier === tier.id && (
                  <div className="mt-8 p-4 bg-primary-100 rounded-lg border border-primary-200">
                    <p className="text-base font-medium text-primary-800 text-center">
                      ✨ Selected Plan
                    </p>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Action Section */}
        <div className="mt-12 space-y-8 max-w-4xl mx-auto">
          <Button
            fullWidth
            size="lg"
            onClick={handleStartTrial}
            isLoading={loading}
            leftIcon={<CreditCard size={20} />}
            rightIcon={<ArrowRight size={20} />}
            className="bg-primary-600 hover:bg-primary-700 text-xl py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {skipTrial ? 'Choose Plan & Get Started' : 'Start 14-Day Free Trial'}
          </Button>
          
          <div className="text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
            >
              Sign out instead
            </button>
          </div>

          {/* What happens next */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <h4 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              What happens next?
            </h4>
            {skipTrial ? (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h5 className="text-base font-semibold text-green-800 mb-3">💳 Direct Subscription</h5>
                <ul className="text-sm text-green-700 space-y-2">
                  <li>• Start using all features immediately</li>
                  <li>• Billing begins immediately after setup</li>
                  <li>• Full access to your selected plan</li>
                  <li>• Cancel anytime from your account settings</li>
                  <li>• No trial period - direct access to premium features</li>
                </ul>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="text-base font-semibold text-blue-800 mb-3">🎉 14-Day Free Trial</h5>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li>• Start using all features immediately</li>
                  <li>• No charges during the 14-day trial period</li>
                  <li>• Payment method secured for seamless transition</li>
                  <li>• Cancel anytime before trial ends</li>
                  <li>• Automatic billing starts after trial expires</li>
                </ul>
              </div>
            )}
            <ul className="space-y-4">
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-primary-500 mt-0.5" />
                <span className="ml-4 text-base leading-relaxed">
                  {skipTrial ? 'Start using your selected plan immediately' : 'Start your 14-day free trial immediately'}
                </span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-primary-500 mt-0.5" />
                <span className="ml-4 text-base leading-relaxed">
                  Full access to all {STRIPE_PRODUCTS[selectedTier as keyof typeof STRIPE_PRODUCTS]?.name} features
                </span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-primary-500 mt-0.5" />
                <span className="ml-4 text-base leading-relaxed">
                  {skipTrial ? 'Billing starts immediately' : 'No charges during trial period'}
                </span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 h-6 w-6 text-primary-500 mt-0.5" />
                <span className="ml-4 text-base leading-relaxed">
                  {skipTrial ? 'Cancel anytime from account settings' : 'Cancel anytime before trial ends'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartTrialPage;