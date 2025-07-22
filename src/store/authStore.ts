import { create } from 'zustand';
import { User, Company } from '../types';
import { supabase, getCurrentUser } from '../lib/supabase';
import { devModeEnabled } from '../lib/supabase';
import { STRIPE_PRODUCTS } from '../stripe-config';

type AuthState = {
  user: User | null;
  company: Company | null;
  loading: boolean;
  isDevMode: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasActiveSubscription: boolean;
  isTrialExpired: boolean;
  requiresPayment: boolean;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  setCompany: (company: Company | null) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  company: null,
  loading: true,
  isDevMode: devModeEnabled(),
  isAuthenticated: false,
  isAdmin: false,
  hasActiveSubscription: false,
  isTrialExpired: false,
  requiresPayment: false,

  initialize: async () => {
    try {
      console.log("Initializing auth store...");
      
      // Check if dev mode is enabled
      if (devModeEnabled()) {
        console.log('Dev mode enabled - setting mock user and company');
        
        const mockUser: User = {
          id: 'dev-user-id',
          email: 'dev@example.com',
          firstName: 'Dev',
          lastName: 'User',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };

        const mockCompany: Company = {
          id: 'dev-company-id',
          name: 'Dev Company',
          tier: 'professional',
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          subscription_status: 'trialing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set({
          user: mockUser,
          company: mockCompany,
          loading: false,
          isAuthenticated: true,
          isAdmin: true,
          hasActiveSubscription: true,
          isTrialExpired: false,
          requiresPayment: false,
        });
        return;
      }

      console.log("Getting current user from Supabase...");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("No user found, setting unauthenticated state");
        set({ 
          loading: false, 
          isAuthenticated: false,
          hasActiveSubscription: false,
          isTrialExpired: false,
          requiresPayment: false
        });
        return;
      }

      console.log("User found:", { id: user.id, email: user.email });

      // Fetch user profile
      console.log("Fetching user profile...");
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        console.log("Profile fetched successfully:", { 
          id: profile.id, 
          email: profile.email,
          fullName: profile.full_name
        });
      }

      // Check if user has admin access and subscription status
      console.log("Checking admin status...");
      const { data: adminStatus, error: adminStatusError } = await supabase
        .from('user_admin_status')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (adminStatusError) {
        console.error("Error fetching admin status:", adminStatusError);
      } else {
        console.log("Admin status fetched:", adminStatus);
      }

      const isAdmin = adminStatus?.is_owner || false;
      console.log("User is admin:", isAdmin);

      // Transform data to match our types
      const userData: User = {
        id: user.id,
        email: user.email!,
        firstName: profile?.full_name?.split(' ')[0],
        lastName: profile?.full_name?.split(' ')[1],
        role: isAdmin ? 'admin' : 'user',
        createdAt: profile?.created_at || user.created_at,
      };

      let companyData: Company | null = null;
      let hasActiveSubscription = false;
      let isTrialExpired = false;
      let requiresPayment = false;

      if (adminStatus?.admin_id) {
        console.log("Fetching admin record...");
        const { data: admin, error: adminError } = await supabase
          .from('admin')
          .select('*')
          .eq('id', adminStatus.admin_id)
          .single();

        if (adminError) {
          console.error("Error fetching admin record:", adminError);
        } else {
          console.log("Admin record fetched:", { 
            id: admin.id, 
            companyName: admin.company_name,
            subscriptionStatus: admin.subscription_status,
            subscriptionTier: admin.subscription_tier,
            trialStartedAt: admin.trial_started_at,
            trialEndsAt: admin.trial_ends_at,
            customerId: admin.customer_id
          });
        }

        if (admin) {
          // Get current subscription data to determine actual plan
          console.log("Fetching Stripe subscription data...");
          const { data: subscription, error: subscriptionError } = await supabase
            .from('stripe_user_subscriptions')
            .select('*')
            .eq('customer_id', admin.customer_id || '')
            .maybeSingle();

          if (subscriptionError) {
            console.error("Error fetching subscription data:", subscriptionError);
          } else if (subscription) {
            console.log("Subscription data fetched:", { 
              subscriptionId: subscription.subscription_id,
              status: subscription.subscription_status,
              priceId: subscription.price_id,
              currentPeriodEnd: subscription.current_period_end
            });
          } else {
            console.log("No subscription data found for customer:", admin.customer_id);
          }

          // Determine the actual subscription tier based on Stripe data
          let actualTier = admin.subscription_tier || 'starter';
          
          if (subscription?.price_id) {
            // Find the plan that matches the price_id
            const matchingPlan = Object.entries(STRIPE_PRODUCTS).find(
              ([key, product]) => product.priceId === subscription.price_id
            );
            
            if (matchingPlan) {
              actualTier = matchingPlan[0]; // Use the key (starter, professional, enterprise)
              console.log(`Found matching plan for price_id ${subscription.price_id}: ${actualTier}`);
            } else {
              console.warn(`No matching plan found for price_id: ${subscription.price_id}`);
            }
          }

          companyData = {
            id: admin.id,
            name: admin.company_name,
            logo: admin.logo_url,
            brandColor: admin.brand_color,
            reportBackground: admin.report_background,
            tier: actualTier as any,
            trialEndsAt: admin.trial_ends_at,
            subscription_status: admin.subscription_status,
            createdAt: admin.created_at,
            updatedAt: admin.updated_at,
          };

          // Check subscription status with improved logic
          const now = new Date();
          const trialEnd = admin.trial_ends_at ? new Date(admin.trial_ends_at) : null;
          
          console.log('Subscription status check:', {
            subscription_status: admin.subscription_status,
            stripe_status: subscription?.subscription_status,
            trial_ends_at: admin.trial_ends_at,
            now: now.toISOString(),
            trialEnd: trialEnd?.toISOString(),
            customer_id: admin.customer_id
          });

          // CRITICAL FIX: Completely revised subscription status determination
          hasActiveSubscription = false;
          isTrialExpired = false;
          requiresPayment = false;

          // First, check for active Stripe subscription
          if (subscription?.subscription_status === 'active') {
            hasActiveSubscription = true;
            console.log('Active subscription found via Stripe');
          } 
          // Then, check for active trial from admin table (if no active Stripe sub)
          else if (admin.subscription_status === 'trialing') {
            if (trialEnd && now < trialEnd) {
              hasActiveSubscription = true; // Trial is active
              console.log('Active trial found via admin table');
            } else {
              // Trial has ended - CRITICAL FIX: Always set requiresPayment to true
              isTrialExpired = true;
              requiresPayment = true;
              console.log('Trial expired, payment required');
            }
          } 
          // If not active and not an active trial, determine if payment is required
          else if (admin.subscription_status === 'not_started') {
            // User hasn't started trial yet, needs to select a plan
            requiresPayment = true;
            console.log('Trial not started, payment required');
          } else {
            // Other statuses (canceled, past_due, etc.)
            requiresPayment = true;
            console.log('Other status, payment required:', admin.subscription_status);
          }

          // Additional check: if no active subscription and no customer_id, payment is required
          // This handles cases where admin.customer_id might be null but subscription_status is 'trialing'
          // and trial has not started yet (e.g. after email confirmation, before start-trial page)
          if (!hasActiveSubscription && !admin.customer_id) {
            requiresPayment = true;
            console.log('No customer ID, payment required');
          }

          // CRITICAL FIX: If trial has 0 days remaining, always require payment
          if (trialEnd && now >= trialEnd && admin.subscription_status === 'trialing') {
            isTrialExpired = true;
            requiresPayment = true;
            hasActiveSubscription = false;
            console.log('CRITICAL FIX: Trial has 0 days remaining, enforcing payment requirement');
          }

          console.log('Final subscription state:', {
            hasActiveSubscription,
            isTrialExpired,
            requiresPayment
          });
        } else {
          // If no admin data, it means the user is not fully set up (e.g., new user before handle_new_user trigger completes, or RLS issue)
          // In this case, they should be redirected to start-trial or login.
          // For now, assume requiresPayment is true to block dashboard access.
          requiresPayment = true;
          console.log('No admin data found, payment required');
        }
      } else {
        // If no admin status, it means the user is not fully set up
        requiresPayment = true;
        console.log('No admin status found, payment required');
      }

      // Final override for dev mode
      if (devModeEnabled()) {
        requiresPayment = false;
        console.log('Dev mode override: payment not required');
      }

      set({
        user: userData,
        company: companyData,
        loading: false,
        isAuthenticated: true,
        isAdmin,
        hasActiveSubscription,
        isTrialExpired,
        requiresPayment
      });
      console.log('Auth store initialized with:', {
        user: userData?.email,
        company: companyData?.name,
        isAuthenticated: true,
        isAdmin,
        hasActiveSubscription,
        isTrialExpired,
        requiresPayment
      });
    } catch (error) {
      console.error('Error initializing auth state:', error);
      await handleAuthError(error);
      set({ 
        loading: false, 
        isAuthenticated: false,
        hasActiveSubscription: false,
        isTrialExpired: false,
        requiresPayment: false
      });
    }
  },
  
  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin'
    });
  },
  
  setCompany: (company) => {
    set({ company });
  },
  
  logout: async () => {
    if (!get().isDevMode) {
      await supabase.auth.signOut();
    }
    
    set({
      user: null,
      company: null,
      isAuthenticated: false,
      isAdmin: false,
      hasActiveSubscription: false,
      isTrialExpired: false,
      requiresPayment: false
    });
  }
}));