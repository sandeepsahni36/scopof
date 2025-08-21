import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-2 sm:py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex-shrink-0 pb-1 sm:pb-4 text-center">
          <a href="https://scopostay.com" target="_blank" rel="noopener noreferrer">
            <img src="/Scopostay long full logo blue.png" alt="scopoStay Logo" className="h-5 sm:h-10 w-auto mx-auto" />
          </a>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-4 px-4 shadow sm:rounded-lg sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;