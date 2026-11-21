import { supabase } from '@/lib/supabase';
import { PermissionsAndroid, Platform } from 'react-native';

/** A Supabase Edge Function neve, ami a LiveKit tokent adja. Írd át, ha másképp hívják. */
export const CALL_TOKEN_FUNCTION = 'livekit-token';
export const CALL_RING_TIMEOUT_MS = 45_000;

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed' | 'cancelled';

export type ChatCall = {
  id: string;
  conversation_id: string;
  started_by_profile_id: string;
  call_type: CallType;
  status: CallStatus;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
};

export type CallToken = {
  token: string;
  server_url: string;
  room_name: string;
  identity: string;
};

const CALL_FIELDS =
  'id, conversation_id, started_by_profile_id, call_type, status, created_at, answered_at, ended_at';

export async function createCall(conversationId: string, profileId: string, type: CallType) {
  const { data, error } = await supabase
    .from('chat_calls')
    .insert({
      conversation_id: conversationId,
      started_by_profile_id: profileId,
      call_type: type,
    })
    .select(CALL_FIELDS)
    .single<ChatCall>();
  if (error) throw error;
  return data;
}

/**
 * Fogadja a hívást. Igaz, ha a hívás csörgött vagy már aktív (csoportban később is
 * be lehet lépni); hamis, ha közben véget ért, elutasították vagy lemondták.
 */
export async function answerCall(callId: string) {
  const { data, error } = await supabase
    .from('chat_calls')
    .update({ status: 'active', answered_at: new Date().toISOString() })
    .eq('id', callId)
    .eq('status', 'ringing')
    .select('id');
  if (error) throw error;
  if (data.length > 0) return true;

  const { data: current, error: currentError } = await supabase
    .from('chat_calls')
    .select('status')
    .eq('id', callId)
    .maybeSingle<{ status: CallStatus }>();
  if (currentError) throw currentError;
  return current?.status === 'active';
}

/** Lezárja a hívást, de csak ha még csörög vagy aktív (más állapotot nem ír felül). */
export async function finishCall(
  callId: string,
  status: 'ended' | 'declined' | 'missed' | 'cancelled',
) {
  const { error } = await supabase
    .from('chat_calls')
    .update({ status, ended_at: new Date().toISOString() })
    .eq('id', callId)
    .in('status', ['ringing', 'active']);
  if (error) throw error;
}

export async function fetchCallToken(conversationId: string) {
  const { data, error } = await supabase.functions.invoke<CallToken>(CALL_TOKEN_FUNCTION, {
    body: { conversation_id: conversationId },
  });
  if (error || !data?.token) {
    throw new Error('A hívás nem indítható: nem sikerült csatlakozni a hívásszerverhez.');
  }
  return data;
}

/** Androidon futásidőben kell engedélyt kérni, iOS a Info.plist szövegek alapján kérdez. */
export async function ensureCallPermissions(type: CallType) {
  if (Platform.OS !== 'android') return true;
  const wanted =
    type === 'video'
      ? [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
      : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  const result = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
}