import { 
  ChevronLeft,
  LogOut,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import BottomNavigation from '../components/layout/BottomNavigation';

// Import navigation items for desktop sidebar
import {
  Home,
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
          <div className="flex flex-col h-full">
            {/* Sidebar header */}
            <div className="h-16 flex items-center px-4 border-b border-gray-200">
              <Link to="/dashboard" className="flex items-center">
                <AnimatePresence mode="wait">
                  {isCollapsed ? (
                    <motion.img key="collapsed-logo" src="/Scopostay Fevicon.png" alt="scopoStay Logo" className="h-8 w-8 flex-shrink-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                  ) : (
                    <motion.img key="expanded-logo" src="/Scopostay long full logo blue.png" alt="scopoStay Logo" className="h-8 w-auto flex-shrink-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
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