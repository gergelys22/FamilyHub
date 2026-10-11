// hooks/use-memories.ts
import { supabase } from '@/lib/supabase'; // igazítsd a projektedhez
import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 10;
const MONTHS = [
  'JAN',
  'FEB',
  'MÁR',
  'ÁPR',
  'MÁJ',
  'JÚN',
  'JÚL',
  'AUG',
  'SZE',
  'OKT',
  'NOV',
  'DEC',
];
const MONTH_NAMES = [
  'Január',
  'Február',
  'Március',
  'Április',
  'Május',
  'Június',
  'Július',
  'Augusztus',
  'Szeptember',
  'Október',
  'November',
  'December',
];

type MemoryRow = {
  id: string;
  title: string;
  description: string | null;
  memory_date: string; // 'YYYY-MM-DD'
  location_name: string | null;
  memory_media?: MemoryMediaRow[];
  memory_participants: { profile_id: string; profile: { display_name: string } | null }[];
};

type MemoryMediaRow = {
  memory_id: string;
  storage_bucket: string | null;
  storage_path: string;
  sort_order: number;
};

export type Memory = {
  id: string;
  month: string;
  day: number;
  title: string;
  description: string | null;
  location: string | null;
  when: string;
  photo: string | null;
  photos: string[];
  extraPhotos: number;
  avatars: string[];
  tags: string[];
  participantProfileIds: string[];
  participantNames: string[];
};

// A 'YYYY-MM-DD' stringet kézzel bontjuk, mert a new Date('2025-05-25') UTC-ként
// értelmeződik, és időzónától függően egy napot csúszhat.
function parseDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return { y, m: m - 1, d };
}

function formatWhen(value: string) {
  const { y, m, d } = parseDate(value);
  const now = new Date();
  if (now.getFullYear() === y && now.getMonth() === m && now.getDate() === d) return 'Ma';
  return `${MONTH_NAMES[m]} ${d}.`;
}

function photoUrl(bucket: string | null, path: string) {
  const storage = supabase.storage.from(bucket || 'memories');
  const signed = storage.getPublicUrl(path).data.publicUrl;
  return signed;
}

function toMemory(row: MemoryRow): Memory {
  const { m, d } = parseDate(row.memory_date);
  const media = [...(row.memory_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const participants = row.memory_participants ?? [];
  const photos = media.map((item) => photoUrl(item.storage_bucket, item.storage_path));

  return {
    id: row.id,
    month: MONTHS[m],
    day: d,
    title: row.title,
    description: row.description,
    location: row.location_name,
    when: formatWhen(row.memory_date),
    photo: photos[0] ?? null,
    photos,
    extraPhotos: Math.max(media.length - 1, 0),
    avatars: [],
    tags: [],
    participantProfileIds: participants.map((item) => item.profile_id),
    participantNames: participants
      .map((item) => item.profile?.display_name)
      .filter((name): name is string => Boolean(name)),
  };
}

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref-ek, hogy a gyors egymás utáni hívások ne indítsanak párhuzamos lekérést
  const loadingRef = useRef(false);
  const offsetRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const from = offsetRef.current;
    const { data, error } = await supabase
      .from('memories')
      .select(
        `
        id, title, description, memory_date, location_name,
        memory_participants ( profile_id, profile:profiles ( display_name ) )
      `,
      )
      .order('memory_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
      .returns<MemoryRow[]>();

    if (error) {
      setError(error.message);
    } else {
      const memoryIds = data.map((memory) => memory.id);
      let media: MemoryMediaRow[] = [];

      if (memoryIds.length > 0) {
        const { data: mediaData, error: mediaError } = await supabase
          .from('memory_media')
          .select('memory_id, storage_bucket, storage_path, sort_order')
          .in('memory_id', memoryIds)
          .order('sort_order', { ascending: true })
          .returns<MemoryMediaRow[]>();

        if (mediaError) {
          console.error('[memories] media query failed', mediaError);
          setError(mediaError.message);
          loadingRef.current = false;
          setLoading(false);
          return;
        }

        media = mediaData ?? [];
        console.info('[memories] media rows loaded', {
          memoryIds,
          mediaCount: media.length,
        });
      }

      const mediaByMemoryId = new Map<string, MemoryMediaRow[]>();
      for (const item of media) {
        const current = mediaByMemoryId.get(item.memory_id) ?? [];
        current.push(item);
        mediaByMemoryId.set(item.memory_id, current);
      }

      const rows = data.map((memory) => ({
        ...memory,
        memory_media: mediaByMemoryId.get(memory.id) ?? [],
      }));

      try {
        const mappedRows = rows.map(toMemory);
        console.info('[memories] mapped photos', mappedRows.map((item) => ({
          id: item.id,
          photoCount: item.photos.length,
        })));
        offsetRef.current += data.length;
        setMemories((prev) => [...prev, ...mappedRows]);
      } catch (photoError) {
        setError(photoError instanceof Error ? photoError.message : 'A képek betöltése sikertelen.');
        loadingRef.current = false;
        setLoading(false);
        return;
      }
      setHasMore(data.length === PAGE_SIZE);
    }
    loadingRef.current = false;
    setLoading(false);
  }, [hasMore]);

  useEffect(() => {
    loadMore();
    // only initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { memories, loading, hasMore, error, loadMore };
}
