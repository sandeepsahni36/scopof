import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

const SubscriptionRequiredPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState('professional');
  const { company, isTrialExpired, logout } = useAuthStore();

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
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
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
          {isTrialExpired ? 'Trial Expired' : 'Choose Your Plan'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isTrialExpired 
            ? 'Your free trial has ended. Please select a plan to continue using scopoStay.'
            : `You have ${trialDaysRemaining} days left in your trial. Select a plan to get started.`
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isTrialExpired && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Access Restricted
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Your trial period has ended and access to the dashboard has been suspended. 
                      Please select a subscription plan below to restore full access to your account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <motion.div 
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              {pricingTiers.map((tier) => (
                <motion.div
                  key={tier.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative rounded-lg border p-4 cursor-pointer transition-all duration-200 ${
                    selectedTier === tier.id
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {tier.popular && (
                    <div className="absolute top-0 right-0 bg-primary-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg rounded-tr-lg">
                      Popular
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        selectedTier === tier.id
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedTier === tier.id && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {tier.name}
                        </h3>
                        <p className="text-sm text-gray-500">{tier.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">${tier.price}</span>
                    <span className="text-base text-gray-500">/month</span>
                  </div>

                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <Check className="h-4 w-4 text-primary-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-6 space-y-4">
              <Button
                fullWidth
                size="lg"
                onClick={handleSelectPlan}
                isLoading={loading}
                leftIcon={<CreditCard size={16} />}
                rightIcon={<ArrowRight size={16} />}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {isTrialExpired ? 'Upgrade Now' : 'Select Plan'}
              </Button>
              
              <div className="text-center">
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Sign out instead
                </button>
              </div>
            </div>

            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {isTrialExpired ? 'Why upgrade now?' : `What's included with ${selectedTierData?.name}?`}
              </h4>
              {isTrialExpired ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Unlimited access to all features</li>
                  <li>• Professional inspection reports</li>
                  <li>• AI-powered damage detection</li>
                  <li>• Priority customer support</li>
                  <li>• Cancel anytime</li>
                </ul>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedTierData?.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequiredPage;