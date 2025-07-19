import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, CreditCard, Clock, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { createCheckoutSession, getCurrentSubscription, getOrderHistory, createCustomerPortalSession } from '../../lib/stripe';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';

const SubscriptionPage = () => {
  const { company, hasActiveSubscription, isTrialExpired, initialize } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success('Payment successful! Your subscription has been updated.');
      // Refresh auth state to get updated subscription info
      initialize().then(() => {
        // After initializing auth state, redirect to dashboard
        navigate('/dashboard');
      });
    } else if (canceled === 'true') {
      toast.error('Payment canceled. Please try again if you want to upgrade your subscription.');
    }

    loadSubscriptionData();
  }, [searchParams, initialize, navigate]);

  const loadSubscriptionData = async () => {
    try {
      const [subData, orderData] = await Promise.all([
        getCurrentSubscription(),
        getOrderHistory(),
      ]);
      setSubscription(subData);
      setOrders(orderData || []);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription information');
    }
  };

  const handlePlanChange = async (plan: keyof typeof STRIPE_PRODUCTS) => {
    try {
      setLoading(true);
      setSelectedPlan(plan);
      
      const checkoutUrl = await createCheckoutSession(plan);
      
      if (!checkoutUrl) {
        throw new Error('Failed to create checkout session');
      }
      
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || 'Failed to process plan change');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const portalUrl = await createCustomerPortalSession(window.location.href);
      
      if (!portalUrl) {
        throw new Error('Failed to create customer portal session');
      }
      
      window.location.href = portalUrl;
    } catch (error: any) {
      console.error('Error creating customer portal session:', error);
      toast.error(error.message || 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  // Calculate remaining trial days
  const trialDaysRemaining = company?.trialEndsAt
    ? differenceInDays(new Date(company.trialEndsAt), new Date())
    : 0;

  const isTrialActive = company?.subscription_status === 'trialing' && trialDaysRemaining > 0;

  // Get current plan from Stripe products - use company.tier which is now properly set
  const currentPlan = Object.entries(STRIPE_PRODUCTS).find(([key, product]) => 
    key === company?.tier
  );

  console.log('Current company tier:', company?.tier);
  console.log('Current plan found:', currentPlan);
  console.log('Subscription data:', subscription);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="mt-1 text-gray-500">
            Manage your subscription and billing information.
          </p>
        </div>
      </div>

      {/* Trial Status Banner */}
      {isTrialActive && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-primary-500 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-primary-800">Trial Period Active</h3>
                <p className="text-sm text-primary-600">
                  {trialDaysRemaining} days remaining in your trial period
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-primary-600">
                Trial ends on {format(new Date(company!.trialEndsAt!), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trial Expired Banner */}
      {isTrialExpired && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Trial Expired</h3>
              <p className="text-sm text-red-600">
                Your trial period has ended. Please select a plan to continue using scopoStay.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {currentPlan ? currentPlan[1].name : 'No Active Plan'}
              </p>
              <p className="text-sm text-gray-500">
                {isTrialActive ? 'Trial' : hasActiveSubscription ? 'Active' : 'Inactive'}
              </p>
              {subscription?.price_id && (
                <p className="text-xs text-gray-400 mt-1">
                  Price ID: {subscription.price_id}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {subscription?.current_period_end && hasActiveSubscription && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>
                    Renews on{' '}
                    {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                leftIcon={<CreditCard size={16} />}
                onClick={handleManageBilling}
                isLoading={portalLoading}
              >
                Manage Billing
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h2>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {Object.entries(STRIPE_PRODUCTS).map(([key, product]) => (
            <div
              key={key}
              className={`relative rounded-lg shadow-sm divide-y divide-gray-200 ${
                currentPlan && currentPlan[0] === key
                  ? 'border-2 border-primary-500 bg-primary-50'
                  : 'border border-gray-200 bg-white'
              }`}
            >
              {product.popular && (
                <div className="absolute top-0 right-0 bg-primary-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg rounded-tr-lg">
                  Popular
                </div>
              )}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{product.description}</p>
                <p className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">${product.price}</span>
                  <span className="text-base font-medium text-gray-500">/month</span>
                </p>
                <Button
                  className="mt-6 w-full"
                  variant={currentPlan && currentPlan[0] === key ? 'secondary' : 'default'}
                  disabled={currentPlan && currentPlan[0] === key || loading}
                  onClick={() => handlePlanChange(key as keyof typeof STRIPE_PRODUCTS)}
                  isLoading={loading && selectedPlan === key}
                  rightIcon={<ArrowRight size={16} />}
                >
                  {currentPlan && currentPlan[0] === key
                    ? 'Current Plan' 
                    : isTrialActive || isTrialExpired 
                      ? 'Select Plan' 
                      : 'Upgrade'
                  }
                </Button>
              </div>
              <div className="px-6 pt-6 pb-8">
                <h4 className="text-sm font-medium text-gray-900 tracking-wide uppercase">
                  What's included
                </h4>
                <ul className="mt-4 space-y-3">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex">
                      <Check className="flex-shrink-0 h-5 w-5 text-success-500" />
                      <span className="ml-3 text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Billing History */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Billing History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.order_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: order.currency || 'USD',
                      }).format((order.amount_total || 0) / 100)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : order.payment_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Download size={16} />}
                        onClick={handleManageBilling}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No billing history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      {subscription?.subscription_status === 'past_due' && (
        <div className="mt-8 bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-error-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-error-800">Payment Past Due</h3>
              <div className="mt-2 text-sm text-error-700">
                <p>
                  Your last payment was unsuccessful. Please update your payment method to
                  continue using our services.
                </p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <Button
                    variant="outline"
                    className="bg-error-50 text-error-700 hover:bg-error-100"
                    onClick={handleManageBilling}
                    isLoading={portalLoading}
                  >
                    Update Payment Method
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;