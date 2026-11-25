import { supabase } from '@/lib/supabase';
import { Alert, Platform } from 'react-native';

/** Megerősítés, ami weben is működik (az Alert.alert weben nem jelenít meg semmit). */
export function confirmAction(options: {
  title: string;
  message: string;
  confirmLabel?: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const confirmFn = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    return Promise.resolve(confirmFn ? confirmFn(`${options.title}\n\n${options.message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: 'Mégse', style: 'cancel', onPress: () => resolve(false) },
        { text: options.confirmLabel ?? 'Törlés', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Egyszerű értesítés, weben is működik. */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    const alertFn = (globalThis as { alert?: (text: string) => void }).alert;
    alertFn?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/**
 * Eltávolít egy tagot a családi körből. A jogosultságot a family_members_delete_managed policy dönti el
 * (can_manage_member), ha nincs jogod, 0 sort érint, és hibát dobunk.
 */
export async function removeFamilyMember(familyId: string, profileId: string) {
  const { data, error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('profile_id', profileId)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Nincs jogosultságod ennek a családtagnak az eltávolításához.');
  }
}