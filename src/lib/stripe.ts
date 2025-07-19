import { supabase, validateUserSession, handleAuthError } from './supabase';
import { StripePlan, STRIPE_PRODUCTS } from '../stripe-config';

export async function createCheckoutSession(plan: StripePlan) {
  try {
    console.log('Frontend: Starting checkout session creation for plan:', plan);
    
    // Validate user session before making the request
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    const product = STRIPE_PRODUCTS[plan];

    if (!product) {
      throw new Error('Invalid plan selected');
    }

    console.log('Creating checkout session for plan:', plan, 'user:', user.email);
    console.log('Frontend: Product details:', {
      priceId: product.priceId,
      mode: product.mode,
      name: product.name
    });

    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: {
        price_id: product.priceId,
        mode: product.mode,
        success_url: `${window.location.origin}/dashboard/admin/subscription?success=true`,
        cancel_url: `${window.location.origin}/dashboard/admin/subscription?canceled=true`,
      },
    });

    console.log('Frontend: Supabase function response:', { data, error });
    if (error) {
      console.error('Stripe checkout error:', error);
      
      // Check if it's an authentication error
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
        await handleAuthError(error);
        return null;
      }
      
      throw error;
    }

    if (!data || !data.session_url) {
      console.error('Frontend: No session URL in response data:', data);
      throw new Error('No checkout session URL returned from server');
    }

    console.log('Frontend: Successfully created checkout session, URL:', data.session_url);
    console.log('Frontend: About to redirect to:', data.session_url);
    return data.session_url;
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function createCustomerPortalSession(returnUrl: string) {
  try {
    // Validate user session before making the request
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    console.log('Creating customer portal session with return URL:', returnUrl);

    const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
      body: {
        return_url: returnUrl,
      },
    });

    if (error) {
      console.error('Stripe customer portal error:', error);
      
      // Check if it's an authentication error
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
        await handleAuthError(error);
        return null;
      }
      
      throw error;
    }

    if (!data || !data.url) {
      throw new Error('No customer portal URL returned from server');
    }

    console.log('Successfully created customer portal session');
    return data.url;
  } catch (error: any) {
    console.error('Error creating customer portal session:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function getCurrentSubscription() {
  try {
    // Validate user session before making the request
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .in('subscription_status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1);

    if (error) {
      // Check if it's an authentication error
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error: any) {
    console.error('Error getting current subscription:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}

export async function getOrderHistory() {
  try {
    // Validate user session before making the request
    const user = await validateUserSession();
    if (!user) {
      throw new Error('User session is invalid. Please sign in again.');
    }

    const { data, error } = await supabase
      .from('stripe_user_orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (error) {
      // Check if it's an authentication error
      if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
        await handleAuthError(error);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error getting order history:', error);
    
    // Check if it's an authentication error
    if (error.message?.includes('user_not_found') || error.message?.includes('JWT')) {
      await handleAuthError(error);
      return null;
    }
    
    throw error;
  }
}