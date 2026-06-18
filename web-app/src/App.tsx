// src/App.tsx
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '@/shared/supabase/supabase_client';
import { AuthPage } from '@/features/auth/pages/auth_page';
import { Button } from '@/shared/components/ui/button';


export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
 
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

  
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
        Loading...
      </div>
    );
  }

 
  if (!session) {
    return <AuthPage />;
  }

 
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white gap-4">
      <p>Welcome, {session.user.email}</p>
      <Button 
        className=" cursor-pointer" 
        onClick={() => supabase.auth.signOut()}
      >
        Sign Out
      </Button>
    </div>
  );
}