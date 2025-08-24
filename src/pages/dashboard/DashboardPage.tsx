// inside the md:hidden top bar actions (DashboardLayout.tsx)
<div className="flex items-center space-x-4">
  {(requiresPayment || needsPaymentSetup) && (
    <Button
      size="sm"
      onClick={() => navigate('/subscription-required')}
      className="bg-primary-600 hover:bg-primary-700 text-xs"
    >
      Upgrade
    </Button>
  )}

  {/* Settings icon button */}
  <button
    onClick={() => navigate('/dashboard/admin/settings')}
    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
    aria-label="Settings"
  >
    {/* You already import lucide-react; use Settings icon */}
    {/* <Settings size={20} /> */}
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7..." fill="currentColor"></path>
    </svg>
  </button>
</div>
