// src/App.tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/supabase/supabase_client';
import { AuthPage } from '@/features/auth/pages/auth_page';
import { OnboardingPage } from '@/features/onboarding/page/onboarding_page';
import { DashboardPage } from '@/features/dashboard/page/dashboard_page';



interface UserProfile {
  id: string;
  team_id: string | null;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Fetches public.users record for the authenticated user
  const fetchUserProfile = async (userId: string) => {
    setIsProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, team_id')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    } finally {
      setIsProfileLoading(false);
    }
  };

  useEffect(() => {
    // Check initial session on application mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for auth state mutations (SIGN_IN, SIGN_OUT, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setIsAuthLoading(false);

      if (event === 'SIGNED_IN' && currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading screen while verifying credentials or database status
  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
        <div className="animate-pulse">Loading profile configuration...</div>
      </div>
    );
  }

  // Guard 1: User is not authenticated via Supabase Auth
  if (!session) {
    return <AuthPage />;
  }

  // Guard 2: User is logged in but has no team linked yet (Onboarding Flow)
  if (profile && !profile.team_id) {
    return (
      <OnboardingPage 
       onSuccess={() => {
          if (session?.user) fetchUserProfile(session.user.id);
        }} 
      />
    );
  }

  // Final Target Destination: Authenticated and bounded to a specific team
  return <DashboardPage />;
}