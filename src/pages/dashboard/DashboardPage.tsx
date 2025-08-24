// Inside /dashboard/admin/settings
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { useState } from 'react';

export function DangerZoneCard() {
  const { logout } = useAuthStore();
  const [busy, setBusy] = useState(false);

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900">Danger Zone</h3>
      <p className="text-sm text-gray-500 mt-1">Sign out of this device.</p>
      <Button
        variant="outline"
        className="mt-3"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await logout();
            window.location.href = '/';
          } finally {
            setBusy(false);
          }
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
