import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Helper function to get the current site URL for redirects
// This function is used for both client-side redirects and server-side email links.
// For email links, it should always return the production domain.
export const getSiteUrl = (forEmail: boolean = false) => {
  if (forEmail) {
    return 'https://app.scopostay.com';
  }
  // In development, use the current window's origin.
  // This ensures that PKCE flow works correctly during local development.
  if (import.meta.env.DEV) {
    return window.location.origin;
  }
  // For production builds, use the hardcoded production URL.
  return 'https://app.scopostay.com';
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Helper function to check if user session is valid
export async function validateUserSession() {
  try {
    // Check if dev mode is enabled
    if (devModeEnabled()) {
      console.log('Dev mode enabled - returning mock user');
      return {
        id: 'dev-user-id',
        email: 'dev@example.com',
        created_at: new Date().toISOString(),
      };
    }

    console.log('=== VALIDATE USER SESSION START ===');
    const sessionResult = await supabase.auth.getSession();
    console.log('Session response:', { data: sessionResult.data, error: sessionResult.error });
    
    if (sessionResult.error) {
      console.log('Session error:', sessionResult.error.message);
      return null;
    }
    
    const session = sessionResult.data?.session;
    if (!session) {
      console.log('No session data');
      return null;
    }
    
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('validateUserSession result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: error?.message
    });
    
    if (error || !user) {
      console.warn('Invalid user session:', error?.message);
      console.log('=== VALIDATE USER SESSION FAILED ===');
      await handleAuthError(error || new Error('User session is invalid. Please sign in again.'));
      return null;
    }
    console.log('=== VALIDATE USER SESSION SUCCESS ===');
    return user;
  } catch (error) {
    console.error('Error validating user session:', error);
    console.log('=== VALIDATE USER SESSION ERROR ===');
    await handleAuthError(error);
    return null;
  }
}

// Helper function to handle authentication errors and redirect
export async function handleAuthError(error: any) {
  console.error('Authentication error:', error);
  
  // In dev mode, don't redirect or sign out
  if (devModeEnabled()) {
    console.warn('Dev mode: Skipping auth error handling');
    return;
  }
  
  // Clear any invalid session
  await supabase.auth.signOut();
  
  // Redirect to login with error message
  const errorMessage = encodeURIComponent(
    error?.message || 'Authentication session expired. Please sign in again.'
  );
  window.location.href = `/login?error=${errorMessage}`;
}

export async function signUp(email: string, password: string, metadata?: { full_name?: string; company_name?: string }) {
  try {
    // Use getSiteUrl(true) to ensure consistent production URL for email redirects
    const redirectUrl = `${getSiteUrl(true)}/auth/callback`;
    console.log('SignUp: Using redirect URL:', redirectUrl);
    
    // Enhanced logging for invitation signup
    console.log('SignUp: Metadata received:', metadata);
    console.log('SignUp: Has invitation token:', !!(metadata as any)?.invitation_token);
    console.log('SignUp: Registration type:', metadata?.registration_type);
    
    // Create the auth user with metadata included
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: metadata?.full_name,
          company_name: metadata?.company_name,
          invitation_token: metadata?.invitation_token,
          registration_type: metadata?.registration_type,
        },
      },
    });

    if (signUpError) {
      console.error('Signup error:', signUpError);
      throw signUpError;
    }

    if (!signUpData.user) {
      throw new Error('No user data returned from signup');
    }

    console.log('SignUp: User created successfully:', {
      userId: signUpData.user.id,
      email: signUpData.user.email,
      hasInvitationToken: !!(signUpData.user.user_metadata?.invitation_token),
      registrationTypeInMetadata: signUpData.user.user_metadata?.registration_type
    });
    return { data: signUpData, error: null };
  } catch (error) {
    console.error('Signup process error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('An unexpected error occurred') 
    };
  }
}

export async function signIn(email: string, password: string) {
  console.log('=== SUPABASE SIGNIN START ===');
  console.log('Signing in with email:', email);
  
  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  console.log('SignIn result from Supabase:', {
    hasError: !!result.error,
    errorMessage: result.error?.message,
    errorCode: result.error?.code,
    hasData: !!result.data,
    hasUser: !!result.data?.user,
    hasSession: !!result.data?.session,
    userEmail: result.data?.user?.email,
    userId: result.data?.user?.id,
    sessionExpiresAt: result.data?.session?.expires_at,
    sessionAccessToken: result.data?.session?.access_token ? 'Present' : 'Missing',
    sessionRefreshToken: result.data?.session?.refresh_token ? 'Present' : 'Missing'
  });
  
  // Check if session was persisted
  if (result.data?.session) {
    console.log('Session returned from signIn, checking persistence...');
    setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check after signIn:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        expiresAt: session?.expires_at
      });
    }, 100);
  }
  
  console.log('=== SUPABASE SIGNIN END ===');
  return result;
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl(true)}/reset-password`,
  });
}

export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({
    password: newPassword,
  });
}

export async function updateEmail(newEmail: string) {
  return supabase.auth.updateUser({
    email: newEmail,
  }, {
    emailRedirectTo: `${getSiteUrl(true)}/auth/callback?type=emailChange`,
  });
}

export async function getCurrentUser() {
  return supabase.auth.getUser();
}

export async function resendConfirmationEmail(email: string) {
  // Use getSiteUrl(true) to ensure consistent production URL for email redirects
  const redirectUrl = `${getSiteUrl(true)}/auth/callback`;
  console.log('ResendConfirmation: Using redirect URL:', redirectUrl);
  
  return supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });
}

// Development mode function to bypass authentication
export function devModeEnabled() {
  return import.meta.env.VITE_DEV_MODE === 'true';
}

export async function createUserProfileAndAdmin(
  user_id: string,
  email: string,
  full_name: string,
  company_name: string,
  registration_type?: 'trial' | 'no_trial',
  invitation_token?: string,
) {
  try {
    // Start a transaction by disabling realtime
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{ 
        id: user_id, 
        email, 
        full_name 
      }], { 
        onConflict: 'id'
      });

    if (profileError) {
      throw profileError;
    }

    // Determine initial subscription status based on registration type
    const initialSubscriptionStatus = registration_type === 'no_trial' ? 'not_started' : 'trialing';
    const trialStartedAt = registration_type === 'no_trial' ? null : new Date().toISOString();
    const trialEndsAt = registration_type === 'no_trial' ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Create admin record
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .insert([{ 
        owner_id: user_id,
        billing_manager_id: user_id,
        company_name,
        subscription_tier: 'starter',
        subscription_status: initialSubscriptionStatus,
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt
      }])
      .select()
      .single();

    if (adminError) {
      throw adminError;
    }

    // Create team member record
    const { error: teamMemberError } = await supabase
      .from('team_members')
      .insert([{ 
        admin_id: adminData.id, 
        profile_id: user_id, 
        role: 'owner' 
      }]);

    if (teamMemberError) {
      throw teamMemberError;
    }

    console.log('Successfully created user profile, admin, and team member records');
  } catch (error: any) {
    console.error('Error creating user records:', error);
    throw new Error(`Failed to create user records: ${error.message}`);
  }
}