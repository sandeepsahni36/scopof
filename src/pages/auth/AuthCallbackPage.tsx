import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [isTimeout, setIsTimeout] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasProcessedRef = useRef(false);
  const retryCountRef = useRef(0);

  const addDebugInfo = (message: string) => {
    console.log(`[AuthCallback] ${message}`);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessedRef.current) {
      addDebugInfo('Callback already processed, skipping');
      return;
    }

    // Check for error in URL first
    const errorMessage = searchParams.get('error_description');
    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
      addDebugInfo(`URL error detected: ${errorMessage}`);
      return;
    }

    // Check for code parameter
    const code = searchParams.get('code');
    addDebugInfo(`Code parameter present: ${!!code}`);
    addDebugInfo(`Full URL: ${window.location.href}`);
    
    // Check localStorage for PKCE state
    const authKeys = Object.keys(localStorage).filter(key => key.startsWith('supabase.auth'));
    addDebugInfo(`Auth keys in localStorage: ${authKeys.join(', ')}`);
    
    // Check for PKCE code verifier specifically
    const pkceCodeVerifier = localStorage.getItem('supabase.auth.code_verifier');
    addDebugInfo(`PKCE code verifier present: ${!!pkceCodeVerifier}`);

    const handleAuthCallback = async () => {
      try {
        addDebugInfo('Starting auth callback process');
        
        // Set up timeout (15 seconds)
        timeoutRef.current = setTimeout(() => {
          if (!hasProcessedRef.current) {
            addDebugInfo('Authentication callback timed out after 20 seconds');
            setIsTimeout(true);
            setError('Authentication is taking longer than expected. This might be due to a slow connection or server issue.');
          }
        }, 20000);

        // Add initial delay to allow Supabase client to fully process the session
        addDebugInfo('Adding 500ms delay for session processing');
        await new Promise(resolve => setTimeout(resolve, 500));
        // Strategy 1: Try to exchange the code if present
        if (code) {
          addDebugInfo('Attempting to exchange authorization code');
          
          try {
            const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              addDebugInfo(`Code exchange failed: ${exchangeError.message}`);
              
              // Check if it's a PKCE-related error
              if (exchangeError.message.includes('flow_state_expired') || 
                  exchangeError.message.includes('code_verifier') ||
                  exchangeError.message.includes('invalid_grant') ||
                  exchangeError.message.includes('Invalid Refresh Token')) {
                setError('The confirmation link has expired or was already used. Please request a new confirmation email.');
                return;
              }
              
              // For other errors, continue to fallback methods
              addDebugInfo('Code exchange failed, will try fallback methods');
            } else if (sessionData.session && !hasProcessedRef.current) {
              addDebugInfo('Code exchange successful, processing session');
              hasProcessedRef.current = true;
              
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }

              // Add delay before initializing to ensure session is fully persisted
              addDebugInfo('Adding 1000ms delay before auth initialization');
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                await initialize();
                toast.success('Email confirmed successfully');
                console.log('Email confirmed, redirecting to start-trial');
                navigate('/start-trial', { replace: true }); // Always go to start-trial after email confirmation
                return;
              } catch (error: any) {
                addDebugInfo(`Auth initialization failed: ${error.message}`);
                setError(error.message || 'Failed to initialize user session');
                return;
              }
            }
          } catch (error: any) {
            addDebugInfo(`Code exchange threw error: ${error.message}`);
            // Continue to fallback methods
          }
        }

        // Strategy 1.5: Try explicit session refresh if we have a code but exchange failed
        if (code && !hasProcessedRef.current) {
          addDebugInfo('Strategy 1.5: Attempting explicit session refresh');
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              addDebugInfo(`Explicit refresh failed: ${refreshError.message}`);
            } else if (refreshData.session && !hasProcessedRef.current) {
              addDebugInfo('Explicit refresh successful, processing session');
              hasProcessedRef.current = true;
              
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }

              // Add delay before initializing
              addDebugInfo('Adding 1000ms delay before auth initialization (refresh path)');
              await new Promise(resolve => setTimeout(resolve, 1000));

              try {
                await initialize();
                toast.success('Email confirmed successfully');
                console.log('Email confirmed via refresh, redirecting to start-trial');
                navigate('/start-trial', { replace: true });
                return;
              } catch (error: any) {
                addDebugInfo(`Auth initialization failed after refresh: ${error.message}`);
                setError(error.message || 'Failed to initialize user session');
                return;
              }
            }
          } catch (error: any) {
            addDebugInfo(`Explicit refresh threw error: ${error.message}`);
            // Continue to fallback methods
          }
        }
        // Strategy 2: Try to get existing session
        addDebugInfo('Strategy 2: Trying to get existing session');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          addDebugInfo(`getSession error: ${sessionError.message}`);
        } else if (session && !hasProcessedRef.current) {
          addDebugInfo('Found existing session, processing');
          hasProcessedRef.current = true;
          
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          // Add delay before initializing
          addDebugInfo('Adding 1000ms delay before auth initialization (existing session path)');
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            await initialize();
            toast.success('Email confirmed successfully');
            console.log('Email confirmed via existing session, redirecting to start-trial');
            navigate('/start-trial', { replace: true }); // Always go to start-trial after email confirmation
            return;
          } catch (error: any) {
            addDebugInfo(`Auth initialization failed: ${error.message}`);
            setError(error.message || 'Failed to initialize user session');
            return;
          }
        }

        // Strategy 3: Set up auth state change listener
        addDebugInfo('Strategy 3: Setting up auth state change listener');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          addDebugInfo(`Auth state change: ${event}, user: ${session?.user?.email || 'none'}`);

          if (event === 'SIGNED_IN' && session && !hasProcessedRef.current) {
            addDebugInfo('Auth state change detected sign in, processing');
            hasProcessedRef.current = true;
            
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }

            // Add delay before initializing
            addDebugInfo('Adding 1000ms delay before auth initialization (state change path)');
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
              await initialize();
              toast.success('Email confirmed successfully');
              console.log('Email confirmed via auth state change, redirecting to start-trial');
              navigate('/start-trial', { replace: true });
            } catch (error: any) {
              addDebugInfo(`Auth initialization failed: ${error.message}`);
              setError(error.message || 'Failed to initialize user session');
            }
          }
        });

        // Strategy 4: If we have a code but no session after 3 seconds, try manual refresh
        if (code && !hasProcessedRef.current) {
          addDebugInfo('Strategy 4: Setting up delayed manual refresh attempt');
          setTimeout(async () => {
            if (!hasProcessedRef.current) {
              addDebugInfo('Attempting manual session refresh');
              try {
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) {
                  addDebugInfo(`Manual refresh failed: ${refreshError.message}`);
                } else if (refreshData.session && !hasProcessedRef.current) {
                  addDebugInfo('Manual refresh successful, processing session');
                  hasProcessedRef.current = true;
                  
                  if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                  }

                  // Add delay before initializing
                  addDebugInfo('Adding 1000ms delay before auth initialization (manual refresh path)');
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  try {
                    await initialize();
                    toast.success('Email confirmed successfully');
                    console.log('Email confirmed via manual refresh, redirecting to dashboard');
                    navigate('/dashboard', { replace: true });
                  } catch (error: any) {
                    addDebugInfo(`Auth initialization failed after manual refresh: ${error.message}`);
                    setError(error.message || 'Failed to initialize user session');
                  }
                }
              } catch (error: any) {
                addDebugInfo(`Manual refresh threw error: ${error.message}`);
              }
            }
          }, 3000);
        }

        // Cleanup function
        return () => {
          subscription.unsubscribe();
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      } catch (error: any) {
        addDebugInfo(`Auth callback outer error: ${error.message}`);
        if (!hasProcessedRef.current) {
          setError(error.message || 'Authentication failed');
        }
      }
    };

    handleAuthCallback();
  }, [navigate, initialize, searchParams]);

  const handleRetryAuth = () => {
    addDebugInfo('User initiated retry');
    setError(null);
    setIsTimeout(false);
    hasProcessedRef.current = false;
    retryCountRef.current += 1;
    
    if (retryCountRef.current > 2) {
      addDebugInfo('Max retries reached, redirecting to login');
      navigate('/login?message=Please try signing in again');
      return;
    }
    
    // Reload the page to restart the callback process
    addDebugInfo('Reloading page to restart callback process');
    window.location.reload();
  };

  const handleGoToLogin = () => {
    addDebugInfo('User chose to return to login');
    navigate('/login');
  };

  const handleRequestNewConfirmation = () => {
    addDebugInfo('User requested new confirmation email');
    navigate('/register?message=Please sign up again to receive a new confirmation email');
  };

  if (error) {
    const isPkceError = error.includes('flow_state_expired') || 
                       error.includes('code_verifier') || 
                       error.includes('invalid_grant') ||
                       error.includes('Invalid Refresh Token') ||
                       error.includes('confirmation link has expired');

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-lg w-full">
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
            
            {/* Debug info (only show in development) */}
            {import.meta.env.DEV && debugInfo.length > 0 && (
              <details className="w-full mb-6">
                <summary className="text-sm text-gray-500 cursor-pointer">Debug Information</summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono max-h-40 overflow-y-auto">
                  {debugInfo.map((info, index) => (
                    <div key={index}>{info}</div>
                  ))}
                </div>
              </details>
            )}
            
            <div className="flex flex-col gap-3 w-full">
              {isPkceError ? (
                <button
                  onClick={handleRequestNewConfirmation}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Request New Confirmation Email
                </button>
              ) : (
                isTimeout && retryCountRef.current < 2 && (
                  <button
                    onClick={handleRetryAuth}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({3 - retryCountRef.current} attempts left)
                  </button>
                )
              )}
              <button
                onClick={handleGoToLogin}
                className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors"
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
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          
          {/* Debug info (only show in development) */}
          {import.meta.env.DEV && debugInfo.length > 0 && (
            <details className="w-full">
              <summary className="text-xs text-gray-500 cursor-pointer">Debug Information</summary>
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono max-h-32 overflow-y-auto">
                {debugInfo.map((info, index) => (
                  <div key={index}>{info}</div>
                ))}
              </div>
            </details>
          )}
          
          <p className="text-xs text-gray-500 mt-4 text-center">
            This usually takes just a few seconds...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;