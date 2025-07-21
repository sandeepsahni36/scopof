import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut, Mail, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';

const AccessRestrictedPage = () => {
  const navigate = useNavigate();
  const { user, company, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Access Restricted
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your company's subscription is inactive
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            {/* Main Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Subscription Required
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Your company's trial period has ended or the subscription is inactive. 
                      Access to the dashboard has been suspended.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-600 font-medium text-sm">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    {company?.name || 'Company Member'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Admin Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Contact Your Administrator
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p className="mb-2">
                      Please contact your company administrator to:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Upgrade your company's subscription</li>
                      <li>Restore access to the dashboard</li>
                      <li>Continue using scopoStay features</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="text-center">
              <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                <Mail className="h-4 w-4 mr-1" />
                <span>Need help? Contact support@scopostay.com</span>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="pt-4">
              <Button
                fullWidth
                variant="secondary"
                onClick={handleLogout}
                leftIcon={<LogOut size={16} />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} scopoStay. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessRestrictedPage;