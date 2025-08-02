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
  needsPaymentSetup: boolean;
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
  needsPaymentSetup: false,

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
          needsPaymentSetup: false,
        });
        return;
      }

      console.log("Getting current user from Supabase...");
      
      // Add explicit session refresh attempt before getting user
      try {
        console.log("Attempting session refresh before user fetch...");
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.log("Session refresh failed (this may be normal):", refreshError.message);
        } else if (refreshData.session) {
          console.log("Session refreshed successfully");
        }
      } catch (refreshErr) {
        console.log("Session refresh threw error (this may be normal):", refreshErr);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Raw user data from Supabase:", {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        emailConfirmed: user?.email_confirmed_at,
        createdAt: user?.created_at,
        lastSignInAt: user?.last_sign_in_at
      });
      
      if (!user) {
        console.log("No user found, setting unauthenticated state");
        set({ 
          loading: false, 
          isAuthenticated: false,
          hasActiveSubscription: false,
          isTrialExpired: false,
          requiresPayment: false,
          needsPaymentSetup: false
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
        console.error("Profile error details:", {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        });
      } else {
        console.log("Profile fetched successfully:", { 
          id: profile.id, 
          email: profile.email,
          fullName: profile.full_name
        });
      }

      // Check if user has registration type in metadata (for new users)
      const registrationType = user.user_metadata?.registration_type;
      console.log("User registration type from metadata:", registrationType);

      // Store registration type in localStorage for StartTrialPage to use
      if (registrationType === 'no_trial') {
        localStorage.setItem('registration_type', 'no_trial');
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
        console.error("Admin status error details:", {
          message: adminStatusError.message,
          code: adminStatusError.code,
          details: adminStatusError.details,
          hint: adminStatusError.hint
        });
      } else {
        console.log("Admin status fetched:", adminStatus);
      }

      const isAdmin = adminStatus?.is_admin || false;
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
      let needsPaymentSetup = false;

      if (isAdmin) {
        // Fetch admin data
        console.log("Fetching admin data for user:", user.id);
        const { data: admin, error: adminError } = await supabase
          .from('admin')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (adminError) {
          console.error("Error fetching admin data:", adminError);
          console.error("Admin data error details:", {
            message: adminError.message,
            code: adminError.code,
            details: adminError.details,
            hint: adminError.hint
          });
        } else if (admin) {
          console.log("Admin data fetched:", { 
            id: admin.id,
            companyName: admin.company_name,
            subscriptionStatus: admin.subscription_status,
            customerId: admin.customer_id
          });

          // Fetch subscription data if customer_id exists
          let subscription = null;
          let subscriptionError = null;
          
          if (admin.customer_id) {
            console.log("Fetching subscription data for customer:", admin.customer_id);
            const result = await supabase
              .from('stripe_subscriptions')
              .select('*')
              .eq('customer_id', admin.customer_id)
              .maybeSingle();
            
            subscription = result.data;
            subscriptionError = result.error;

            if (subscriptionError) {
              console.error("Subscription data error details:", {
                message: subscriptionError.message,
                code: subscriptionError.code,
                details: subscriptionError.details,
                hint: subscriptionError.hint
              });
            }

            // --- START REVISED LOGIC FOR SUBSCRIPTION STATUS ---
            const admin_subscription_status = admin.subscription_status;
            const stripe_subscription_status = subscription?.status;

            console.log("Subscription status analysis:", {
              admin_status: admin_subscription_status,
              stripe_status: stripe_subscription_status,
              customer_id: admin.customer_id,
              trial_ends_at: admin.trial_ends_at
            });
            if (admin_subscription_status === 'trialing') {
              const trialEnd = admin.trial_ends_at ? new Date(admin.trial_ends_at) : null;
              const now = new Date();
              
              console.log("Trial status check:", {
                trialEnd: trialEnd?.toISOString(),
                now: now.toISOString(),
                isTrialActive: trialEnd && now < trialEnd,
                hasCustomerId: !!admin.customer_id
              });
              
              if (trialEnd && now < trialEnd) { // Trial is active
                if (!admin.customer_id || admin.customer_id === '') { // No customer_id means payment setup needed
                  hasActiveSubscription = false; // Not truly active until payment setup
                  needsPaymentSetup = true;
                  requiresPayment = false; // Not requiring payment yet, but needs setup
                  console.log('DEBUG: Trial user without customer_id, needs payment setup.');
                } else { // Trial is active AND customer_id exists
                  hasActiveSubscription = true;
                  needsPaymentSetup = false;
                  requiresPayment = false;
                  console.log('DEBUG: Active trial with payment setup complete.');
                }
              } else { // Trial expired
                isTrialExpired = true;
                requiresPayment = true;
                needsPaymentSetup = true;
                hasActiveSubscription = false;
                console.log('DEBUG: Trial expired, payment required.');
              }
            } else if (admin_subscription_status === 'active' || stripe_subscription_status === 'active') {
              hasActiveSubscription = true;
              needsPaymentSetup = false;
              requiresPayment = false;
              console.log('DEBUG: Active paid subscription.');
            } else if (admin_subscription_status === 'past_due' || admin_subscription_status === 'canceled' || admin_subscription_status === 'unpaid') {
              requiresPayment = true;
              needsPaymentSetup = true;
              hasActiveSubscription = false;
              console.log('DEBUG: Subscription past due/canceled/unpaid, requires payment.');
            } else {
              // Default case for new users or unknown states (e.g., 'not_started')
              hasActiveSubscription = false;
              needsPaymentSetup = true;
              requiresPayment = false; // Not requiring payment yet, but needs setup
              console.log('DEBUG: Default case - needs payment setup (e.g., not_started).');
            }
            // --- END REVISED LOGIC FOR SUBSCRIPTION STATUS ---
          }
          
          if (subscription) {
            console.log("Subscription data fetched:", {
              subscriptionId: subscription.subscription_id,
              status: subscription.status,
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
              console.log('Found matching plan for price_id ' + subscription.price_id + ': ' + actualTier);
            } else {
              console.warn('No matching plan found for price_id: ' + subscription.price_id);
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
          const trialEnd = admin.trial_ends_at ? new Date(admin.trial_ends_at) : null;
          const now = new Date(); // This is the correct declaration

          console.log('Subscription status check:', {
            subscription_status: admin.subscription_status,
            stripe_status: subscription?.status,
            trial_ends_at: admin.trial_ends_at,
            now: now.toISOString(),
            trialEnd: trialEnd?.toISOString(),
            customer_id: admin.customer_id
          });

          // --- START REVISED LOGIC FOR SUBSCRIPTION STATUS ---
          const admin_subscription_status = admin.subscription_status;
          const stripe_subscription_status = subscription?.status;

          if (admin_subscription_status === 'trialing') {
            if (trialEnd && now < trialEnd) {
              if (!admin.customer_id || admin.customer_id === '') { // No customer_id means payment setup needed
                hasActiveSubscription = false;
                needsPaymentSetup = true;
                console.log('DEBUG: Trial user without customer_id, needs payment setup.');
              } else {
                hasActiveSubscription = true;
                needsPaymentSetup = false;
                console.log('DEBUG: Active trial with payment setup complete.');
              }
            } else {
              isTrialExpired = true;
              requiresPayment = true;
              needsPaymentSetup = true;
              console.log('DEBUG: Trial expired, payment required.');
            }
          } else if (admin_subscription_status === 'active' || stripe_subscription_status === 'active') {
            hasActiveSubscription = true;
            needsPaymentSetup = false;
            requiresPayment = false;
            console.log('DEBUG: Active paid subscription.');
          } else if (admin_subscription_status === 'past_due' || admin_subscription_status === 'canceled' || admin_subscription_status === 'unpaid') {
            requiresPayment = true;
            needsPaymentSetup = true;
            hasActiveSubscription = false;
            console.log('DEBUG: Subscription past due/canceled/unpaid, requires payment.');
          } else {
            // Default case for new users or unknown states (e.g., 'not_started')
            hasActiveSubscription = false;
            needsPaymentSetup = true;
            requiresPayment = false; // Not requiring payment yet, but needs setup
            console.log('DEBUG: Default case - needs payment setup (e.g., not_started).');
          }
          // --- END REVISED LOGIC FOR SUBSCRIPTION STATUS ---

          console.log('DEBUG: Final subscription state for user (before set):', {
            hasActiveSubscription,
            isTrialExpired,
            requiresPayment,
            needsPaymentSetup,
            customer_id: admin.customer_id,
            subscription_status: admin.subscription_status
          });
        } else {
          // If no admin data, this is likely a new user whose admin record hasn't been created yet
          hasActiveSubscription = false;
          isTrialExpired = false;
          requiresPayment = false;
          needsPaymentSetup = true;
          console.log('DEBUG: No admin data found - new user needs to go to start-trial.');
        }
      } else {
        // If no admin status, this is likely a new user
        hasActiveSubscription = false;
        isTrialExpired = false;
        requiresPayment = false;
        needsPaymentSetup = true;
        console.log('DEBUG: No admin status found - new user needs to go to start-trial.');
      }

      // Final override for dev mode (should be false now)
      if (devModeEnabled()) {
        requiresPayment = false;
        needsPaymentSetup = false; // Ensure dev mode bypasses payment setup
        hasActiveSubscription = true; // Ensure dev mode has active subscription
        console.log('DEBUG: Dev mode override: payment not required, active subscription forced.');
      }

      set({
        user: userData,
        company: companyData,
        loading: false,
        isAuthenticated: true,
        isAdmin,
        hasActiveSubscription,
        isTrialExpired,
        requiresPayment,
        needsPaymentSetup
      });
      console.log('=== FINAL AUTH STATE ===', {
        user: userData?.email,
        company: companyData?.name,
        isAuthenticated: true,
        isAdmin,
        hasActiveSubscription,
        isTrialExpired,
        requiresPayment,
        needsPaymentSetup
      });
    } catch (error) {
      console.error('Error initializing auth state:', error);
      console.error('Auth initialization error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      set({ 
        loading: false, 
        isAuthenticated: false,
        hasActiveSubscription: false,
        isTrialExpired: false,
        requiresPayment: false,
        needsPaymentSetup: false
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
      requiresPayment: false,
      needsPaymentSetup: false,
    });
  }
}));