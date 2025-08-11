import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft,
  LogOut,
  AlertTriangle,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import BottomNavigation from '../components/layout/BottomNavigation';

// Import navigation items for desktop sidebar
import {
  Home,
  Building2,
  LayoutTemplate,
  FileText,
  Settings,
} from 'lucide-react';
import { NavItem } from '../types';

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'Home' },
  { title: 'Properties', href: '/dashboard/properties', icon: 'Building2' },
  { title: 'Templates', href: '/dashboard/templates', icon: 'LayoutTemplate' },
  { title: 'Reports', href: '/dashboard/reports', icon: 'FileText' },
];

const adminNavItems: NavItem[] = [
  { title: 'Company Settings', href: '/dashboard/admin/settings', icon: 'Settings' },
];

const IconMap: Record<string, React.ReactNode> = {
  Home: <Home size={20} />,
  Building2: <Building2 size={20} />,
  LayoutTemplate: <LayoutTemplate size={20} />,
  FileText: <FileText size={20} />,
  Settings: <Settings size={20} />,
};

const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, company, logout, isAdmin, isTrialExpired, hasActiveSubscription, requiresPayment } = useAuthStore();
  const navigate = useNavigate();
  
  // Calculate trial days remaining
  const trialDaysRemaining = company?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(company.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const showTrialWarning = !hasActiveSubscription && trialDaysRemaining <= 3 && trialDaysRemaining > 0;
  
  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleUpgradeClick = () => {
    if (requiresPayment) {
      navigate('/subscription-required');
    } else {
      navigate('/dashboard/admin/subscription');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex min-h-screen">
        {/* Sidebar - Push Layout for Desktop */}
        <motion.aside
          initial={false}
          animate={{ 
            width: isCollapsed ? '5rem' : '16rem',
          }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          className="bg-white border-r border-gray-200 hidden md:flex md:flex-col flex-shrink-0 z-40"
        >
  - Visual indicators for upgrade requirements on restricted features
  - Disabled controls for starter tier users with helpful upgrade messaging
  - Proper validation and error handling for logo uploads

### Technical Improvements
- Enhanced PDF generation with proper image loading and embedding
- Improved error handling for logo and branding asset loading
- Added comprehensive tier-based feature gating throughout the application
- Optimized PDF file structure with consistent page layouts

                      alt="scopoStay Logo" 
                      className="h-8 w-8 flex-shrink-0" 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                    />
                  ) : (
                    <motion.img 
                      key="expanded-logo" 
                      src="/Scopostay long full logo blue.png" 
                      alt="scopoStay Logo" 
                      className="h-8 w-auto flex-shrink-0" 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                    />
                  )}
                </AnimatePresence>
              </Link>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="ml-auto p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ChevronLeft
                  size={20}
                  className={`transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                  end={item.href === '/dashboard'}
                >
                  <span className="flex-shrink-0">
                    {IconMap[item.icon]}
                  </span>
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-3 overflow-hidden whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              ))}

              {/* Admin Section */}
              {isAdmin && (
                <>
                  <div className="pt-4 pb-2">
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.h3
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          Admin
                        </motion.h3>
                      )}
                    </AnimatePresence>
                  </div>
                  {adminNavItems.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={({ isActive }) =>
                        `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-primary-100 text-primary-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <span className="flex-shrink-0">
                        {IconMap[item.icon]}
                      </span>
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-3 overflow-hidden whitespace-nowrap"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  ))}
                </>
              )}
            </nav>

            {/* Trial Warning in Sidebar */}
            {showTrialWarning && (
              <div className="p-2">
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                    >
                      <div className="flex items-start">
                        <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="ml-2 min-w-0">
                          <p className="text-xs font-medium text-amber-800">
                            Trial ends in {trialDaysRemaining} days
                          </p>
                          <Button
                            size="sm"
                            onClick={handleUpgradeClick}
                            className="mt-2 text-xs h-6 bg-amber-600 hover:bg-amber-700"
                          >
                            Upgrade
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* User info */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 min-w-0 overflow-hidden"
                    >
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {company?.name || 'Company'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.button
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={handleLogout}
                      className="ml-auto p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <LogOut size={16} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main content */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}>
          {/* Top bar */}
          <div className="bg-white shadow-sm border-b border-gray-200 md:hidden">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <img 
                    src="/Scopostay long full logo blue.png" 
                    alt="scopoStay Logo" 
                    className="h-8 w-auto" 
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <a
                    href="https://scopostay.com/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-primary-300 text-sm font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <HelpCircle size={16} className="mr-1" />
                    <span className="hidden sm:inline">Support</span>
                    <span className="sm:hidden">Help</span>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Trial warning banner */}
          {isTrialExpired && (
            <div className="bg-red-50 border-b border-red-200">
              <div className="px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-sm font-medium text-red-800">
                      Your trial has expired. Upgrade to continue using all features.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleUpgradeClick}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto">
            <div className="py-6 px-4 sm:px-6 lg:px-8 pb-20 md:pb-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  );
};

export default DashboardLayout;