import { supabase } from '@/shared/supabase/supabase_client';
import { Button } from '@/shared/components/ui/button';
import { LogOut } from 'lucide-react';

export function DashboardHeader() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
            T
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            TeamSpace
          </span>
        </div>

        {/* Logout */}
        <Button
          id="logout-btn"
          variant="ghost"
          size="sm"
          className="cursor-pointer gap-2 text-zinc-400 hover:text-zinc-100"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
