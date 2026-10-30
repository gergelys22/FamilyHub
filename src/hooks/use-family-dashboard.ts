// hooks/use-family-dashboard.ts
import {
  endOfDay,
  getOverdueTasks,
  getTodayMedications,
  getUnreadMessageCount,
  getUpcomingBirthdays,
  startOfDay,
  type DashboardBirthday,
  type DashboardMedication,
  type DashboardTask,
} from '@/services/dashboard';
import { getFamilyActivityLogs, type ActivityLog } from '@/services/activity';
import { getFamilyEvents, type FamilyEvent } from '@/services/events';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export type DashboardData = {
  todayEvents: FamilyEvent[];
  overdueTasks: DashboardTask[];
  overdueTaskTotal: number;
  medications: DashboardMedication[];
  unreadMessages: number;
  birthdays: DashboardBirthday[];
  activityLogs: ActivityLog[];
};

const EMPTY: DashboardData = {
  todayEvents: [],
  overdueTasks: [],
  overdueTaskTotal: 0,
  medications: [],
  unreadMessages: 0,
  birthdays: [],
  activityLogs: [],
};

type Params = { familyId: string | null | undefined; profileId: string | null | undefined };

export function useFamilyDashboard({ familyId, profileId }: Params) {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failedCount, setFailedCount] = useState(0);

  // Családváltásnál vagy gyors újrafókuszálásnál az elavult válasz ne írja felül az újat.
  const requestId = useRef(0);
  const hasLoaded = useRef(false);
  const loadedFamilyId = useRef<string | null>(null);

  const load = useCallback(async () => {
    const nextFamilyId = familyId ?? null;
    if (loadedFamilyId.current !== nextFamilyId) {
      requestId.current += 1;
      hasLoaded.current = false;
      loadedFamilyId.current = nextFamilyId;
      setData(EMPTY);
      setFailedCount(0);
      setLoading(Boolean(nextFamilyId));
    }

    if (!familyId) {
      setData(EMPTY);
      setLoading(false);
      setFailedCount(0);
      return;
    }
    const current = ++requestId.current;
    // Csak az első betöltésnél mutatunk töltésjelzőt, később háttérben frissítünk.
    if (!hasLoaded.current) setLoading(true);

    const now = new Date();
    const [events, overdue, meds, unread, birthdays, activity] = await Promise.allSettled([
      getFamilyEvents(familyId, startOfDay(now), endOfDay(now)),
      getOverdueTasks(familyId),
      getTodayMedications(familyId),
      profileId ? getUnreadMessageCount(familyId, profileId) : Promise.resolve(0),
      getUpcomingBirthdays(familyId),
      getFamilyActivityLogs(familyId),
    ]);

    if (current !== requestId.current) return;

    // Ahol egy forrás hibázott, ott a korábbi értéket megtartjuk, a többi frissül.
    setData((prev) => ({
      todayEvents: events.status === 'fulfilled' ? events.value : prev.todayEvents,
      overdueTasks: overdue.status === 'fulfilled' ? overdue.value.items : prev.overdueTasks,
      overdueTaskTotal: overdue.status === 'fulfilled' ? overdue.value.total : prev.overdueTaskTotal,
      medications: meds.status === 'fulfilled' ? meds.value : prev.medications,
      unreadMessages: unread.status === 'fulfilled' ? unread.value : prev.unreadMessages,
      birthdays: birthdays.status === 'fulfilled' ? birthdays.value : prev.birthdays,
      activityLogs: activity.status === 'fulfilled' ? activity.value : prev.activityLogs,
    }));
    setFailedCount([events, overdue, meds, unread, birthdays, activity].filter((r) => r.status === 'rejected').length);
    hasLoaded.current = true;
    setLoading(false);
  }, [familyId, profileId]);

  // Minden alkalommal frissül, amikor a főoldal fókuszba kerül (pl. a Teendők képernyőről visszatérve).
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  return { data, loading, failedCount, refresh: load };
}
