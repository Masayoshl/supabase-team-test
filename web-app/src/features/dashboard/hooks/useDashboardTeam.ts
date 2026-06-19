import { useEffect, useState } from 'react';
import { supabase } from '@/shared/supabase/supabase_client';
import { fetchCurrentTeam, fetchTeamMembers } from '../services/dashboard_service';
import type { Team, TeamMember } from '../types/dashboard_types';

export function useDashboardTeam() {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const fetchedTeam = await fetchCurrentTeam();
        if (cancelled) return;
        setTeam(fetchedTeam);

        const fetchedMembers = await fetchTeamMembers(fetchedTeam.id);
        if (!cancelled) setMembers(fetchedMembers);
      } catch (err) {
        if (!cancelled)
          setTeamError(err instanceof Error ? err.message : "Failed to load team");
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return {
    team,
    members,
    teamLoading,
    teamError,
    currentUserId,
  };
}
