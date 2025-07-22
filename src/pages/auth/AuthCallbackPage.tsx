import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [isTimeout, setIsTimeout] = React.useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasProcessedRef = useRef(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    // Check for error in URL first
    const errorMessage = searchParams.get('error_description');
    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
      return;
    }

    const handleAuthCallback = async () => {
      try {
        // Set up timeout (10 seconds, reduced from 15)
        timeoutRef.current = setTimeout(() => {
          if (!hasProcessedRef.current) {
            console.warn('Authentication callback timed out after 10 seconds');
            setIsTimeout(true);
            setError('Authentication is taking longer than expected. This might be due to a slow connection or server issue.');
          }
        }, 10000);

        // Try to get session immediately first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Supabase getSession error during callback:', sessionError);
          // Do NOT call handleAuthError from lib/supabase directly here,
          // as it performs a signOut which might clear necessary PKCE state.
          // Instead, set the error state for the current page.
          setError(sessionError.message || 'Failed to retrieve session during callback.');
          // The retry logic will handle further attempts or redirection.
          return; // Exit to prevent further processing in this attempt
        }

        if (session && !hasProcessedRef.current) {
          hasProcessedRef.current = true;
          
          // Clear timeout since we got the session
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          try {
            // Initialize auth store to get latest user data
            await initialize();

            // Redirect to the start-trial page after email confirmation
            toast.success('Email confirmed successfully');
            navigate('/start-trial');
          } catch (error: any) {
            console.error('Error during auth initialization:', error);
            setError(error.message || 'Failed to initialize user session');
          }
          return;
        }

        // If no immediate session, set up auth state change listener as fallback
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event, session?.user?.email);

          if (event === 'SIGNED_IN' && session && !hasProcessedRef.current) {
            hasProcessedRef.current = true;
            
            // Clear timeout since we successfully received the auth event
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }

            try {
              // Initialize auth store to get latest user data
              await initialize();

              // Redirect to the start-trial page after email confirmation
              toast.success('Email confirmed successfully');
              navigate('/start-trial');
            } catch (error: any) {
              console.error('Error during auth initialization:', error);
              setError(error.message || 'Failed to initialize user session');
            }
          }
        });

        // Cleanup function
        return () => {
          subscription.unsubscribe();
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      } catch (error: any) {
        console.error('Auth callback outer error:', error);
        setError(error.message || 'Authentication failed');
      }
    };

    handleAuthCallback();
  }, [navigate, initialize, searchParams]);

  const handleRetryAuth = () => {
    // Clear error state and try again
    setError(null);
    setIsTimeout(false);
    hasProcessedRef.current = false;
    retryCountRef.current += 1;
    
    // If we've retried too many times, redirect to login
    if (retryCountRef.current > 2) {
      navigate('/login?message=Please try signing in again');
      return;
    }
    
    // Try to get session again
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      
      if (session) {
        hasProcessedRef.current = true;
        initialize().then(() => {
          toast.success('Email confirmed successfully');
          navigate('/start-trial');
        }).catch((error) => {
          setError(error.message || 'Failed to initialize user session');
        });
      } else {
        // Still no session, redirect to login
        navigate('/login?message=Please try signing in again');
      }
    });
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 bg-error-100 rounded-full flex items-center justify-center mb-4">
              {isTimeout ? (
                <Clock className="h-6 w-6 text-error-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-error-600" />
              )}
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {isTimeout ? 'Authentication Timeout' : 'Authentication Error'}
            </h2>
            <p className="text-gray-600 text-center mb-6">
              {error}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {isTimeout && retryCountRef.current < 2 && (
                <button
                  onClick={handleRetryAuth}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Try Again ({3 - retryCountRef.current} attempts left)
                </button>
              )}
              <button
                onClick={handleGoToLogin}
                className={`px-4 py-2 rounded-md transition-colors ${
                  isTimeout && retryCountRef.current < 2
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-success-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Processing...</h2>
          <p className="text-gray-600 text-center mb-6">
            Please wait while we verify your credentials.
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            This usually takes just a few seconds...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;