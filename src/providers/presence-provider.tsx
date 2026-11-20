import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type PresenceContextValue = {
  onlineProfileIds: Set<string>;
  isProfileOnline: (profileId: string | null | undefined) => boolean;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

export function PresenceProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const [onlineProfileIds, setOnlineProfileIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile?.id) {
      setOnlineProfileIds(new Set());
      return;
    }

    let channel: RealtimeChannel | null = supabase.channel('familyhub-presence', {
      config: { presence: { key: profile.id } },
    });

    const syncOnlineProfiles = () => {
      if (!channel) return;
      const state = channel.presenceState<{ profile_id?: string }>();
      const ids = new Set<string>();
      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          if (typeof presence.profile_id === 'string') {
            ids.add(presence.profile_id);
          }
        });
      });
      setOnlineProfileIds(ids);
    };

    channel
      .on('presence', { event: 'sync' }, syncOnlineProfiles)
      .on('presence', { event: 'join' }, syncOnlineProfiles)
      .on('presence', { event: 'leave' }, syncOnlineProfiles)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && channel) {
          await channel.track({
            profile_id: profile.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (channel) void channel.untrack();
      if (channel) void supabase.removeChannel(channel);
      channel = null;
    };
  }, [profile?.id]);

  const value = useMemo<PresenceContextValue>(
    () => ({
      onlineProfileIds,
      isProfileOnline: (profileId) =>
        Boolean(profileId && onlineProfileIds.has(profileId)),
    }),
    [onlineProfileIds],
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) throw new Error('A usePresence csak PresenceProvider belül használható.');
  return context;
}
