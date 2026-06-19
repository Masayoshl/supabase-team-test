import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/supabase/supabase_client';

export interface UserProfile {
  id: string;
  team_id: string | null;
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

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

  const refreshProfile = () => {
    if (session?.user) {
      fetchUserProfile(session.user.id);
    }
  };

  return {
    session,
    profile,
    isLoading: isAuthLoading || isProfileLoading,
    refreshProfile,
  };
}
