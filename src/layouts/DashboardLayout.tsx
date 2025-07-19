import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Building2,
  LayoutTemplate,
  FileText,
  Settings,
  Users,
  CreditCard,
  ChevronLeft,
  LogOut,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { NavItem } from '../types';
import { Button } from '../components/ui/Button';

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'Home' },
  { title: 'Properties', href: '/dashboard/properties', icon: 'Building2' },
  { title: 'Templates', href: '/dashboard/templates', icon: 'LayoutTemplate' },
  { title: 'Reports', href: '/dashboard/reports', icon: 'FileText' },
];

const adminNavItems: NavItem[] = [
  { title: 'Company Settings', href: '/dashboard/admin/settings', icon: 'Settings' },
  { title: 'User Management', href: '/dashboard/admin/users', icon: 'Users' },
  { title: 'Subscription', href: '/dashboard/admin/subscription', icon: 'CreditCard' },
];

const IconMap: Record<string, React.ReactNode> = {
  Home: <Home size={20} />,
  Building2: <Building2 size={20} />,
  LayoutTemplate: <LayoutTemplate size={20} />,
  FileText: <FileText size={20} />,
  Settings: <Settings size={20} />,
  Users: <Users size={20} />,
  CreditCard: <CreditCard size={20} />,
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isCollapsed ? '5rem' : '16rem',
        }}
        className="fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out"
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="h-16 flex items-center px-4 border-b border-gray-200">
            <Link to="/dashboard" className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600 flex-shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="ml-2 text-xl font-bold text-gray-900 whitespace-nowrap overflow-hidden"
                  >
                    scopoStay
                  </motion.span>
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

          {/* Trial/Subscription Status Banner */}
          {(showTrialWarning || isTrialExpired) && !isCollapsed && (
            <div className={`mx-2 mt-2 p-3 rounded-lg border ${
              isTrialExpired 
                ? 'bg-red-50 border-red-200' 
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {isTrialExpired ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500 mt-0.5" />
                  )}
                </div>
                <div className="ml-2 flex-1">
                  <p className={`text-xs font-medium ${
                    isTrialExpired ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {isTrialExpired 
                      ? 'Trial Expired' 
                      : `${trialDaysRemaining} days left`
                    }
                  </p>
                  <p className={`text-xs mt-1 ${
                    isTrialExpired ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {isTrialExpired 
                      ? 'Upgrade to restore access'
                      : 'Upgrade to continue'
                    }
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 w-full text-xs h-6"
                    onClick={handleUpgradeClick}
                  >
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto py-6">
            <nav className="px-2 space-y-1">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) => `
                    flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  end={item.href === '/dashboard'}
                >
                  <span className="flex-shrink-0">{IconMap[item.icon]}</span>
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="ml-3 whitespace-nowrap overflow-hidden"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              ))}
            </nav>

            {/* Admin section */}
            {isAdmin && (
              <div className="mt-8">
                <div className="px-4 mb-2">
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.h3
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Admin
                      </motion.h3>
                    )}
                  </AnimatePresence>
                </div>
                <nav className="px-2 space-y-1">
                  {adminNavItems.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={({ isActive }) => `
                        flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                        ${
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <span className="flex-shrink-0">{IconMap[item.icon]}</span>
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="ml-3 whitespace-nowrap overflow-hidden"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="ml-3 overflow-hidden"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {company?.name}
                    </p>
                    {hasActiveSubscription && (
                      <p className="text-xs text-green-600 font-medium">
                        {company?.tier === 'trialing' ? 'Trial Active' : 'Premium'}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`mt-4 w-full justify-center text-sm ${!isCollapsed && 'justify-start'}`}
              onClick={handleLogout}
              leftIcon={<LogOut size={16} />}
            >
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="ml-2"
                  >
                    Logout
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main 
        className="flex-1 min-h-screen transition-all duration-300 ease-in-out"
        style={{
          marginLeft: isCollapsed ? '5rem' : '16rem'
        }}
      >
        <div className="py-6 px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;