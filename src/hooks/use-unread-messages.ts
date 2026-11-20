import { getUnreadMessageCount } from '@/services/dashboard';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

export function useUnreadMessages(
  familyId: string | null | undefined,
  profileId: string | null | undefined,
) {
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!familyId || !profileId) {
      setUnreadCount(0);
      return;
    }

    try {
      setUnreadCount(await getUnreadMessageCount(familyId, profileId));
    } catch (error) {
      console.error('[unread-messages] count query failed', error);
    }
  }, [familyId, profileId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!familyId || !profileId) return;

    const channelName =
      `unread-messages:${familyId}:${profileId}:${Date.now()}:${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        void load();
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_conversation_members' },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId, profileId, load]);

  return unreadCount;
}
