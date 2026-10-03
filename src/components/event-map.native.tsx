import type { FamilyEvent } from '@/services/events';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

type EventMapProps = {
  events: FamilyEvent[];
  selectedEventId: string | null;
};

const budapest = {
  latitude: 47.4979,
  longitude: 19.0402,
};

function hasCoordinates(event: FamilyEvent) {
  return event.location_latitude !== null && event.location_longitude !== null;
}

export function EventMap({ events, selectedEventId }: EventMapProps) {
  const markerEvents = events.filter(hasCoordinates);
  const selectedEvent =
    markerEvents.find((event) => event.id === selectedEventId) ?? markerEvents[0];
  const cameraCoordinates = selectedEvent
    ? {
        latitude: selectedEvent.location_latitude as number,
        longitude: selectedEvent.location_longitude as number,
      }
    : budapest;

  return (
    <MapView
      key={selectedEvent?.id ?? 'fallback'}
      style={styles.map}
      initialRegion={{
        ...cameraCoordinates,
        latitudeDelta: selectedEvent ? 0.025 : 0.18,
        longitudeDelta: selectedEvent ? 0.025 : 0.18,
      }}
      showsCompass
      showsUserLocation={false}
    >
      {markerEvents.map((event) => (
        <Marker
          key={event.id}
          coordinate={{
            latitude: event.location_latitude as number,
            longitude: event.location_longitude as number,
          }}
          title={event.title}
          description={event.location_name ?? undefined}
          pinColor={event.id === selectedEventId ? '#2563EB' : '#DC2626'}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
