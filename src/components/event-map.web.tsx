import type { FamilyEvent } from '@/services/events';
import { StyleSheet, Text, View } from 'react-native';

type EventMapProps = {
  events: FamilyEvent[];
  selectedEventId: string | null;
};

export function EventMap({ events }: EventMapProps) {
  const markerCount = events.filter(
    (event) => event.location_latitude !== null && event.location_longitude !== null,
  ).length;

  return (
    <View style={styles.fallback}>
      <Text style={styles.title}>Google Maps az Android alkalmazásban</Text>
      <Text style={styles.text}>
        {markerCount
          ? `${markerCount} eseményhez tartozik térképi jelölő.`
          : 'Válassz ki egy helyet a helyszínkeresőből, hogy jelölő kerüljön a térképre.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#102B40',
  },
  title: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  text: { marginTop: 8, color: '#9AAAC2', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
