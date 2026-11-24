import { supabase } from '@/lib/supabase';

/** A Supabase Edge Function neve, ami az élő adás LiveKit tokenjét adja. */
export const LIVE_TOKEN_FUNCTION = 'livekit-live-token';

export type LiveStream = {
  id: string;
  family_id: string;
  host_profile_id: string;
  title: string;
  status: 'live' | 'ended';
  room_name: string;
  started_at: string;
  ended_at: string | null;
  host_name: string;
};

export type LiveToken = {
  token: string;
  server_url: string;
};

type LiveRow = Omit<LiveStream, 'host_name'> & {
  host: { display_name: string } | { display_name: string }[] | null;
};

const LIVE_COLUMNS =
  'id, family_id, host_profile_id, title, status, room_name, started_at, ended_at, host:profiles!host_profile_id(display_name)';

function mapRow(row: LiveRow): LiveStream {
  const host = Array.isArray(row.host) ? row.host[0] : row.host;
  const { host: _host, ...rest } = row;
  void _host;
  return { ...rest, host_name: host?.display_name ?? 'Családtag' };
}

export async function getLiveStreams(familyId: string) {
  const { data, error } = await supabase
    .from('live_streams')
    .select(LIVE_COLUMNS)
    .eq('family_id', familyId)
    .order('started_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as unknown as LiveRow[]).map(mapRow);
}

export async function getLiveStream(id: string) {
  const { data, error } = await supabase.from('live_streams').select(LIVE_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as unknown as LiveRow) : null;
}

export async function startLiveStream(familyId: string, profileId: string, title: string) {
  const roomName = `live-${familyId}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from('live_streams')
    .insert({ family_id: familyId, host_profile_id: profileId, title: title.trim(), room_name: roomName })
    .select(LIVE_COLUMNS)
    .single();
  if (error) throw error;
  return mapRow(data as unknown as LiveRow);
}

export async function endLiveStream(id: string) {
  const { error } = await supabase
    .from('live_streams')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'live');
  if (error) throw error;
}

export async function fetchLiveToken(streamId: string) {
  const { data, error } = await supabase.functions.invoke<LiveToken>(LIVE_TOKEN_FUNCTION, {
    body: { stream_id: streamId },
  });
  if (error || !data?.token) {
    throw new Error('Nem sikerült csatlakozni az élő adáshoz.');
  }
  return data;
}
