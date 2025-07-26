import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Get the current site URL for redirects
const getSiteUrl = () => {
  // Always use the production URL for email redirects to ensure consistency
  const productionUrl = 'https://app.scopostay.com';
  
  // In development, we still want emails to redirect to production
  // but we can use local URL for other purposes
  if (import.meta.env.DEV && !window.location.href.includes('scopostay.com')) {
    // For email redirects, always use production URL
    return productionUrl;
  }
  
  return productionUrl;
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

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.warn('Invalid user session:', error?.message);
      await handleAuthError(error || new Error('User session is invalid. Please sign in again.'));
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error validating user session:', error);
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
    // Always use production URL for email confirmation redirects
    const redirectUrl = 'https://app.scopostay.com/auth/callback';
    console.log('SignUp: Using redirect URL:', redirectUrl);
    
    // Create the auth user with metadata included
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: metadata?.full_name,
          company_name: metadata?.company_name,
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
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/reset-password`,
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
    emailRedirectTo: `${getSiteUrl()}/auth/callback?type=emailChange`,
  });
}

export async function getCurrentUser() {
  return supabase.auth.getUser();
}

export async function resendConfirmationEmail(email: string) {
  // Always use production URL for email confirmation redirects
  const redirectUrl = 'https://app.scopostay.com/auth/callback';
  console.log('ResendConfirmation: Using redirect URL:', redirectUrl);
  
  return supabase.auth.resend({
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
  company_name: string
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

    // Create admin record
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .insert([{ 
        owner_id: user_id,
        billing_manager_id: user_id,
        company_name,
        subscription_tier: 'starter',
        subscription_status: 'trialing',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
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