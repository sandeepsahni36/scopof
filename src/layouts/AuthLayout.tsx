import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 pt-4 sm:pt-6 lg:pt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <a href="https://scopostay.com" className="flex items-center">
            <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600" />
            <span className="ml-2 text-xl sm:text-2xl font-bold text-gray-900">scopoStay</span>
          </a>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-0">
        <div className="w-full max-w-md">
          <div className="bg-white py-6 sm:py-8 px-4 shadow sm:rounded-lg sm:px-10 max-h-full overflow-y-auto">
          <Outlet />
          </div>
        </div>
      </div>
      
      <div className="flex-shrink-0 pb-4 sm:pb-6 text-center">
          <img src="/Scopostay long full logo blue.png" alt="scopoStay Logo" className="h-8 sm:h-10 w-auto" />
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;