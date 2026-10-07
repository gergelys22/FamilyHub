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
  memory_date: string; // 'YYYY-MM-DD'
  location_name: string | null;
  memory_media: { storage_path: string; sort_order: number }[];
};

export type Memory = {
  id: string;
  month: string;
  day: number;
  title: string;
  location: string | null;
  when: string;
  photo: string | null;
  extraPhotos: number;
  avatars: string[];
  tags: string[];
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

function photoUrl(path: string) {
  return supabase.storage.from('memories').getPublicUrl(path).data.publicUrl;
}

function toMemory(row: MemoryRow): Memory {
  const { m, d } = parseDate(row.memory_date);
  const media = [...row.memory_media].sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: row.id,
    month: MONTHS[m],
    day: d,
    title: row.title,
    location: row.location_name,
    when: formatWhen(row.memory_date),
    photo: media[0] ? photoUrl(media[0].storage_path) : null,
    extraPhotos: Math.max(media.length - 1, 0),
    avatars: [],
    tags: [],
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
        id, title, memory_date, location_name,
        memory_media ( storage_path, sort_order )
      `,
      )
      .order('memory_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
      .returns<MemoryRow[]>();

    if (error) {
      setError(error.message);
    } else {
      offsetRef.current += data.length;
      setMemories((prev) => [...prev, ...data.map(toMemory)]);
      setHasMore(data.length === PAGE_SIZE);
    }
    loadingRef.current = false;
    setLoading(false);
  }, [hasMore]);

  useEffect(() => {
    loadMore();
    // csak az első betöltéshez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { memories, loading, hasMore, error, loadMore };
}
