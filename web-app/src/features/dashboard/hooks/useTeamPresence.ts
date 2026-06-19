import { useEffect, useState } from 'react';
import { supabase } from '@/shared/supabase/supabase_client';

interface UseTeamPresenceOptions {
  teamId?: string;
  currentUserId?: string | null;
}

export function useTeamPresence({ teamId, currentUserId }: UseTeamPresenceOptions) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!teamId || !currentUserId) return;

    // Subscribe to Presence channel for the team
    const channel = supabase.channel(`team_presence:${teamId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    const handleSync = () => {
      const state = channel.presenceState();
      const onlineIds = new Set<string>();
      Object.keys(state).forEach((userId) => {
        onlineIds.add(userId);
      });
      setOnlineUserIds(onlineIds);
    };

    channel
      .on('presence', { event: 'sync' }, handleSync)
      .on('presence', { event: 'join' }, handleSync)
      .on('presence', { event: 'leave' }, handleSync);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [teamId, currentUserId]);

  return onlineUserIds;
}
