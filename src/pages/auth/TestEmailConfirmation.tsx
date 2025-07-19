import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const TestEmailConfirmation = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testEmailConfirmation = async () => {
    setLoading(true);
    setLogs([]);
    
    try {
      addLog('Starting email confirmation test...');
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      addLog(`Session check: ${session ? 'Found session' : 'No session'}`);
      
      if (sessionError) {
        addLog(`Session error: ${sessionError.message}`);
      }
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      addLog(`User check: ${user ? `Found user ${user.email}` : 'No user'}`);
      
      if (userError) {
        addLog(`User error: ${userError.message}`);
      }
      
      if (user) {
        addLog(`User email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        addLog(`User metadata: ${JSON.stringify(user.user_metadata)}`);
        
        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        addLog(`Profile check: ${profile ? 'Found' : 'Not found'}`);
        if (profileError) {
          addLog(`Profile error: ${profileError.message}`);
        }
        
        // Check if admin exists
        const { data: admin, error: adminError } = await supabase
          .from('admin')
          .select('*')
          .eq('owner_id', user.id)
          .single();
          
        addLog(`Admin check: ${admin ? 'Found' : 'Not found'}`);
        if (adminError) {
          addLog(`Admin error: ${adminError.message}`);
        }
        
        // Check if stripe customer exists
        const { data: stripeCustomer, error: stripeError } = await supabase
          .from('stripe_customers')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        addLog(`Stripe customer check: ${stripeCustomer ? 'Found' : 'Not found'}`);
        if (stripeError) {
          addLog(`Stripe customer error: ${stripeError.message}`);
        }
      }
      
    } catch (error: any) {
      addLog(`Test error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testEmailConfirmation();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Email Confirmation Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Debug Logs</h2>
            <button
              onClick={testEmailConfirmation}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Run Test'}
            </button>
          </div>
          
          <div className="bg-gray-100 rounded p-4 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestEmailConfirmation;