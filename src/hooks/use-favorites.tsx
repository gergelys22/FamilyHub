import { useAuth } from '@/providers/auth-provider';
import { favoriteKey, getFavorites, setFavorite, type Favorite, type FavoriteType } from '@/services/favorites';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

/** A bejelentkezett profil kedvencei. Fókuszra frissül, a váltás azonnal látszik, hiba esetén visszagörd. */
export function useFavorites() {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!profileId) {
        setLoading(false);
        return;
      }
      void getFavorites(profileId)
        .then((items) => {
          if (active) setFavorites(items);
        })
        .catch(() => {
          // A kedvencek nélkül is használható a képernyő.
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [profileId]),
  );

  const isFavorite = useCallback(
    (type: FavoriteType, id: string) =>
      favorites.some((item) => favoriteKey(item.item_type, item.item_id) === favoriteKey(type, id)),
    [favorites],
  );

  const toggleFavorite = useCallback(
    async (type: FavoriteType, id: string) => {
      if (!profileId) return;
      const next = !favorites.some((item) => item.item_type === type && item.item_id === id);
      setFavorites((current) =>
        next
          ? [{ item_type: type, item_id: id, created_at: new Date().toISOString() }, ...current]
          : current.filter((item) => !(item.item_type === type && item.item_id === id)),
      );
      try {
        await setFavorite(profileId, type, id, next);
      } catch (caught) {
        setFavorites((current) =>
          next
            ? current.filter((item) => !(item.item_type === type && item.item_id === id))
            : [{ item_type: type, item_id: id, created_at: new Date().toISOString() }, ...current],
        );
        Alert.alert('A kedvenc nem menthető', caught instanceof Error ? caught.message : 'Próbáld újra.');
      }
    },
    [profileId, favorites],
  );

  return { favorites, loading, isFavorite, toggleFavorite };
}
