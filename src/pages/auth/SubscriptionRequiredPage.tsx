import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, AlertTriangle, Clock, CreditCard, LogOut, HelpCircle, Shield, Zap } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

const SubscriptionRequiredPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState('professional');
  const { company, isTrialExpired, logout, user } = useAuthStore();

  const handleSelectPlan = async () => {
    try {
      setLoading(true);
      
      console.log('Selecting plan:', selectedTier);
      console.log('SubscriptionRequiredPage: About to call createCheckoutSession');
      
      const checkoutUrl = await createCheckoutSession(selectedTier as any);
      
      console.log('SubscriptionRequiredPage: Received checkout URL:', checkoutUrl);
      
      if (!checkoutUrl) {
        console.error('SubscriptionRequiredPage: No checkout URL returned');
        throw new Error('Failed to create checkout session');
      }
      
      console.log('Redirecting to checkout URL:', checkoutUrl);
      console.log('SubscriptionRequiredPage: About to redirect to Stripe checkout');
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Failed to create checkout session:', error);
      toast.error(error.message || 'Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const trialDaysRemaining = company?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(company.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Convert Stripe products to display format
  const pricingTiers = Object.entries(STRIPE_PRODUCTS).map(([key, product]) => ({
    id: key,
    name: product.name,
    price: product.price,
    description: product.description,
    features: product.features,
    popular: product.popular || false,
  }));

  const selectedTierData = pricingTiers.find(tier => tier.id === selectedTier);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header with Logo and Sign Out */}
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <a href="https://scopostay.com" target="_blank" rel="noopener noreferrer">
            <img 
              src="/Scopostay long full logo blue.png" 
              alt="scopoStay Logo" 
              className="h-8 w-auto" 
            />
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut size={16} />}
            className="text-gray-600 hover:text-gray-800"
          >
            Sign Out
          </Button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="flex justify-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-6 ${
            isTrialExpired ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            {isTrialExpired ? (
              <AlertTriangle className="h-8 w-8 text-red-600" />
            ) : (
              <Clock className="h-8 w-8 text-amber-600" />
            )}
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isTrialExpired ? 'Your Trial Has Ended' : 'Complete Your Setup'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Welcome back, {user?.firstName || user?.email?.split('@')[0]}! 
          {isTrialExpired 
            ? ' Your free trial has ended. Select a plan below to restore full access to your property management tools.'
            : ` You have ${trialDaysRemaining} days left in your trial. Choose your plan to continue.`
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-6xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isTrialExpired && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    🚫 Dashboard Access Suspended
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Your 14-day free trial has ended. All your data is safely stored and will be restored immediately upon upgrading.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Value Proposition Section */}
          <div className="mb-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Continue Your Property Management Journey
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="flex flex-col items-center p-4">
                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-primary-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Your Data is Safe</h4>
                <p className="text-sm text-gray-600 text-center">All your properties, inspections, and reports are securely stored and ready to access.</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Instant Activation</h4>
                <p className="text-sm text-gray-600 text-center">Your subscription activates immediately after payment - no waiting period.</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <HelpCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Expert Support</h4>
                <p className="text-sm text-gray-600 text-center">Get priority support to help you maximize your property management efficiency.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h3>
              <p className="text-gray-600">Select the plan that best fits your property management needs</p>
            </div>

            <motion.div 
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto"
            >
              {pricingTiers.map((tier) => (
                <motion.div
                  key={tier.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative rounded-xl border-2 p-8 cursor-pointer transition-all duration-200 min-h-[600px] flex flex-col ${
                    selectedTier === tier.id
                      ? 'border-primary-500 bg-primary-50 shadow-xl ring-4 ring-primary-100 transform scale-105'
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-lg hover:scale-102'
                  }`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary-500 text-white px-6 py-2 text-sm font-medium rounded-full shadow-lg">
                      Popular
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-8">
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
                      <div className="ml-6">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {tier.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-8 text-center">
                    <div className="text-5xl font-bold text-gray-900 mb-3">${tier.price}</div>
                    <div className="text-lg text-gray-500 mb-4">per month</div>
                    <p className="text-base text-gray-600 leading-relaxed">{tier.description}</p>
                  </div>

                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">
                      What's included
                    </h4>
                    <ul className="space-y-4">
                    {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-base text-gray-700">
                          <Check className="h-5 w-5 text-green-500 mr-4 mt-0.5 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
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
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-12 space-y-8 max-w-4xl mx-auto">
              <Button
                fullWidth
                size="lg"
                onClick={handleSelectPlan}
                isLoading={loading}
                leftIcon={<CreditCard size={20} />}
                rightIcon={<ArrowRight size={20} />}
                className="bg-primary-600 hover:bg-primary-700 text-xl py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isTrialExpired ? 'Restore Access Now' : 'Continue with Selected Plan'}
              </Button>
              
              {/* What Happens Next Section */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="text-lg font-semibold text-blue-900 mb-4 text-center">
                  🚀 What Happens Next?
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</div>
                    <div>
                      <p className="font-medium text-blue-900">Secure Payment</p>
                      <p className="text-blue-700">Complete payment through Stripe's secure checkout</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</div>
                    <div>
                      <p className="font-medium text-blue-900">Instant Access</p>
                      <p className="text-blue-700">Immediately return to your dashboard with full features</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</div>
                    <div>
                      <p className="font-medium text-blue-900">Data Restored</p>
                      <p className="text-blue-700">All your properties, reports, and settings are preserved</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</div>
                    <div>
                      <p className="font-medium text-blue-900">Cancel Anytime</p>
                      <p className="text-blue-700">Manage your subscription easily from account settings</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security and Support */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center mb-2">
                    <Shield className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="font-medium text-green-900">Secure Payment</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    Your payment is processed securely by Stripe. We never store your payment information.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center mb-2">
                    <HelpCircle className="h-5 w-5 text-gray-600 mr-2" />
                    <h4 className="font-medium text-gray-900">Need Help?</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Contact our support team at{' '}
                    <a href="mailto:support@scopostay.com" className="text-primary-600 hover:text-primary-700 underline">
                      support@scopostay.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} scopoStay. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionRequiredPage;