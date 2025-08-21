import { create } from 'zustand';
import { User, Company } from '../types';
import { supabase, getCurrentUser } from '../lib/supabase';
import { devModeEnabled } from '../lib/supabase';
import { getStorageUsage, getStorageStatus } from '../lib/storage';
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
  storageStatus: {
    status: 'normal' | 'warning' | 'critical';
    percentage: number;
    canUpload: boolean;
    message: string;
  };
  canStartInspections: boolean;
  initialize: () => Promise<void>;
  checkStorageStatus: () => Promise<void>;
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
  storageStatus: {
    status: 'normal',
    percentage: 0,
    canUpload: true,
    message: 'Storage usage is within normal limits.',
  },
  canStartInspections: true,

  initialize: async () => {
    try {
      console.log("Initializing auth store...");
      console.log("=== AUTH STORE INITIALIZATION DEBUG START ===");
      console.log("Current URL:", window.location.href);
      console.log("Dev mode enabled:", devModeEnabled());
      
      // Check if dev mode is enabled
      if (devModeEnabled()) {
        console.log('Dev mode enabled - setting mock user and company');
        console.log('=== DEV MODE INITIALIZATION START ===');
        
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

        const devModeState = {
          user: mockUser,
          company: mockCompany,
          loading: false,
          isAuthenticated: true,
          isAdmin: true,
          hasActiveSubscription: true,
          isTrialExpired: false,
          requiresPayment: false,
          needsPaymentSetup: false,
          canStartInspections: true,
          storageStatus: {
            status: 'normal' as const,
            percentage: 50,
            canUpload: true,
            message: 'Dev mode - storage checks bypassed',
          },
        };
        
        console.log('Setting dev mode state:', devModeState);
        set(devModeState);
        console.log('=== DEV MODE INITIALIZATION COMPLETE ===');
        return;
      }

      console.log("=== CHECKING CURRENT SESSION ===");
      // First, let's check what's in localStorage
      const authKeys = Object.keys(localStorage).filter(key => key.startsWith('supabase.auth'));
      console.log("Auth keys in localStorage:", authKeys);
      
      // Check if there's a session in localStorage
      authKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            console.log(`LocalStorage ${key}:`, {
              hasAccessToken: !!parsed.access_token,
              hasRefreshToken: !!parsed.refresh_token,
              hasUser: !!parsed.user,
              userEmail: parsed.user?.email,
              expiresAt: parsed.expires_at
            });
          }
        } catch (e) {
          console.log(`LocalStorage ${key}: Could not parse`);
        }
      });

      console.log("Getting current user from Supabase...");
      
      // Add explicit session refresh attempt before getting user
      try {
        console.log("Attempting session refresh before user fetch...");
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.log("Session refresh failed (this may be normal):", refreshError.message);
          console.log("Session refresh error details:", {
            message: refreshError.message,
            status: refreshError.status,
            code: refreshError.code
          });
        } else if (refreshData?.session) {
          console.log("Session refreshed successfully");
          console.log("Refreshed session details:", {
            hasAccessToken: !!refreshData.session?.access_token,
            hasRefreshToken: !!refreshData.session?.refresh_token,
            hasUser: !!refreshData.session?.user,
            userEmail: refreshData.session?.user?.email,
            expiresAt: refreshData.session?.expires_at
          });
        }
      } catch (refreshErr) {
        console.log("Session refresh threw error (this may be normal):", refreshErr);
      }
      
      // Check session directly
      console.log("=== CHECKING SESSION DIRECTLY ===");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log("Direct session check:", {
        hasSession: !!sessionData?.session,
        hasUser: !!sessionData?.session?.user,
        userEmail: sessionData?.session?.user?.email,
        sessionError: sessionError?.message,
        expiresAt: sessionData?.session?.expires_at
      });
      
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
        console.log("=== AUTH STORE INITIALIZATION DEBUG END (NO USER) ===");
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

      console.log("AuthStore Init: User found:", { id: user.id, email: user.email });

      // Fetch user profile
      console.log("Fetching user profile...");
      const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .maybeSingle();  // Changed to maybeSingle

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

      console.log("AuthStore Init: Profile fetched:", profile);

      // Check if user has registration type in metadata (for new users)
      const registrationType = user.user_metadata?.registration_type;
      console.log("User registration type from metadata:", registrationType);

      // Store registration type in localStorage for StartTrialPage to use
      if (registrationType === 'no_trial') {
        localStorage.setItem('registration_type', 'no_trial');
      } else {
        localStorage.removeItem('registration_type'); // Clear if not 'no_trial'
      }

      // Transform data to match our types first (before any conditional logic)
      const userData: User = {
        id: user.id,
        email: user.email!,
        firstName: profile?.full_name?.split(' ')[0],
        lastName: profile?.full_name?.split(' ')[1],
        role: 'user', // Will be updated below based on admin status
        createdAt: profile?.created_at || user.created_at,
      };

      // --- REVISED LOGIC FOR ADMIN STATUS AND COMPANY SELECTION ---
      console.log("Fetching team memberships for user:", user.id);
      const { data: teamMemberships, error: teamMembershipsError } = await supabase
        .from('team_members')
        .select('admin_id, role')
        .eq('profile_id', user.id); // Fetch all memberships for this user

      if (teamMembershipsError) {
        console.error("Error fetching team memberships:", teamMembershipsError);
        throw teamMembershipsError; // Re-throw to be caught by outer try-catch
      }

      console.log("Team memberships fetched:", teamMemberships);

      let primaryAdminId: string | null = null;
      let primaryRole: string | null = null;

      // Prioritize 'owner' role
      const ownerMembership = teamMemberships.find(tm => tm.role === 'owner');
      if (ownerMembership) {
        primaryAdminId = ownerMembership.admin_id;
        primaryRole = ownerMembership.role;
        console.log("Found owner membership:", primaryAdminId);
      } else if (teamMemberships.length > 0) {
        // If no owner, pick the first admin_id (could be 'admin' or 'member')
        primaryAdminId = teamMemberships[0].admin_id;
        primaryRole = teamMemberships[0].role;
        console.log("No owner membership, picking first available:", primaryAdminId, "Role:", primaryRole);
      }

      let companyData: Company | null = null;
      let hasActiveSubscription = false;
      let isTrialExpired = false;
      let requiresPayment = false;
      let needsPaymentSetup = false;
      let isAdminRole = false; // Initialize isAdminRole here

      if (primaryAdminId) {
        console.log("Fetching admin data for primary admin ID:", primaryAdminId);
        const { data: admin, error: adminError } = await supabase
          .from('admin')
          .select('*')
          .eq('id', primaryAdminId)
          .single(); // Should be single now as we picked one adminId

        if (adminError) {
          console.error("Error fetching admin data:", adminError);
          throw adminError;
        }

        console.log("Admin data fetched:", { 
          id: admin.id,
          companyName: admin.company_name,
          subscriptionStatus: admin.subscription_status,
          customerId: admin.customer_id
        });

        // Determine isAdminRole based on the selected primary role
        isAdminRole = (primaryRole === 'owner' || primaryRole === 'admin');
        console.log("User is admin (based on primary role):", isAdminRole, "Role:", primaryRole);

        // Determine the actual subscription tier based on Stripe data
        let actualTier = admin.subscription_tier || 'starter';
        
        // Fetch subscription data if customer_id exists
        let subscription = null;
        if (admin.customer_id) {
          console.log("Fetching subscription data for customer:", admin.customer_id);
          const result = await supabase
            .from('stripe_subscriptions')
            .select('*')
            .eq('customer_id', admin.customer_id)
            .maybeSingle();
          
          subscription = result.data;
          
          if (result.error) {
            console.error("Subscription data error details:", {
              message: result.error.message,
              code: result.error.code,
              details: result.error.details,
              hint: result.error.hint
            });
          }

          console.log("AuthStore Init: Stripe subscription fetched:", subscription);
        }
        
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
          subscription_status: admin.subscription_status, // Use admin's status as primary
          createdAt: admin.created_at,
          updatedAt: admin.updated_at,
        };

        // --- START REVISED LOGIC FOR SUBSCRIPTION STATUS ---
        const admin_subscription_status = admin.subscription_status;
        const trialEnd = admin.trial_ends_at ? new Date(admin.trial_ends_at) : null;
        const now = new Date();

        console.log('Subscription status check (REVISED):', {
          admin_status: admin_subscription_status,
          trial_ends_at: admin.trial_ends_at,
          now: now.toISOString(),
          trialEnd: trialEnd?.toISOString(),
          customer_id: admin.customer_id
        });

        if (admin_subscription_status === 'trialing') {
          if (trialEnd && now < trialEnd) {
            // User is in trial and trial has not expired
            hasActiveSubscription = true; // Consider trialing as active for dashboard access
            needsPaymentSetup = false; // Payment setup is part of the trial flow, not a block
            requiresPayment = false;
            console.log('DEBUG: User is in active trial period.');
          } else {
            // Trial has expired
            isTrialExpired = true;
            requiresPayment = true;
            needsPaymentSetup = true; // Needs to complete payment setup to reactivate
            hasActiveSubscription = false;
            console.log('DEBUG: Trial expired, payment required.');
          }
        } else if (admin_subscription_status === 'active') {
          // User has an active paid subscription
          hasActiveSubscription = true;
          needsPaymentSetup = false;
          requiresPayment = false;
          console.log('DEBUG: User has an active paid subscription.');
        } else if (admin_subscription_status === 'not_started') {
          // User chose "no trial" and hasn't completed payment yet
          needsPaymentSetup = true;
          requiresPayment = false; // Not requiring payment yet, but needs setup
          hasActiveSubscription = false;
          console.log('DEBUG: User chose no trial, needs payment setup.');
        } else if (admin_subscription_status === 'past_due' || admin_subscription_status === 'canceled' || admin_subscription_status === 'unpaid') {
          // Subscription is in a state requiring payment
          requiresPayment = true;
          needsPaymentSetup = true;
          hasActiveSubscription = false;
          console.log('DEBUG: Subscription past due/canceled/unpaid, requires payment.');
        } else {
          // Fallback for any other unexpected status
          console.warn('DEBUG: Unexpected admin subscription status:', admin_subscription_status);
          needsPaymentSetup = true;
          requiresPayment = true; // Assume payment is required for unknown states
          hasActiveSubscription = false;
        }
        // --- END REVISED LOGIC FOR SUBSCRIPTION STATUS ---
      } else {
        // If no primaryAdminId found (user is not part of any company yet)
        console.log('AuthStore Init: User not associated with any company yet - setting needsPaymentSetup to true');
        needsPaymentSetup = true;
        requiresPayment = false;
        hasActiveSubscription = false;
        isAdminRole = false; // Ensure isAdmin is false if no adminId
      }

      // Final override for dev mode (should be false now)
      if (devModeEnabled()) {
        requiresPayment = false;
        needsPaymentSetup = false; // Ensure dev mode bypasses payment setup
        hasActiveSubscription = true; // Ensure dev mode has active subscription
        console.log('DEBUG: Dev mode override: payment not required, active subscription forced.');
      }

      console.log('AuthStore Init: Final state before setting:');
      console.log('  isAuthenticated:', true); // Should be true if user object exists
      console.log('  isAdmin:', isAdminRole); // Use the newly determined isAdminRole
      console.log('  hasActiveSubscription:', hasActiveSubscription);
      console.log('  isTrialExpired:', isTrialExpired);
      console.log('  requiresPayment:', requiresPayment);
      console.log('  needsPaymentSetup:', needsPaymentSetup);
      console.log('  companyData:', companyData);

      set({
        user: { ...userData, role: isAdminRole ? 'admin' : 'user' }, // Update user role based on isAdminRole
        company: companyData,
        loading: false,
        isAuthenticated: true, // Always true if user object is present
        isAdmin: isAdminRole, // Use the newly determined isAdminRole
        hasActiveSubscription,
        isTrialExpired,
        requiresPayment,
        needsPaymentSetup
      });
      
      console.log('AuthStore Init: State set successfully.');
      console.log('=== FINAL AUTH STATE ===', {
        user: userData?.email,
        company: companyData?.name,
        isAuthenticated: true,
        isAdmin: isAdminRole,
        hasActiveSubscription,
        isTrialExpired,
        requiresPayment,
        needsPaymentSetup
      });
      
      // Check storage status after authentication
      await get().checkStorageStatus();
      
      console.log("=== AUTH STORE INITIALIZATION DEBUG END (SUCCESS) ===");
    } catch (error) {
      console.error('Error initializing auth state:', error);
      console.error('Auth initialization error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      console.log("=== AUTH STORE INITIALIZATION DEBUG END (ERROR) ===");
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
  
  checkStorageStatus: async () => {
    try {
      const { isAuthenticated, isDevMode } = get();
      
      if (!isAuthenticated && !isDevMode) {
        return;
      }
      
      const storageUsage = await getStorageUsage();
      
      if (storageUsage) {
        const status = getStorageStatus(storageUsage.currentUsage, storageUsage.quota);
        const canStartInspections = status.canUpload && get().hasActiveSubscription && !get().requiresPayment;
        
        set({
          storageStatus: status,
          canStartInspections,
        });
        
        console.log('Storage status updated:', {
          status: status.status,
          percentage: status.percentage,
          canUpload: status.canUpload,
          canStartInspections,
        });
      }
    } catch (error) {
      console.error('Error checking storage status:', error);
      // Set safe defaults on error
      set({
        storageStatus: {
          status: 'normal',
          percentage: 0,
          canUpload: true,
          message: 'Unable to check storage status.',
        },
        canStartInspections: get().hasActiveSubscription && !get().requiresPayment,
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