import type { FamilyEvent } from '@/services/events';
import { StyleSheet } from 'react-native';

type ExpoMapsModule = typeof import('expo-maps');

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
  // Expo Router evaluates every route module at launch. Deferring the native
  // lookup keeps the rest of the app available if this module is not in an
  // outdated development/preview build yet.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleMaps } = require('expo-maps') as ExpoMapsModule;
  const markerEvents = events.filter(hasCoordinates);
  const selectedEvent = markerEvents.find((event) => event.id === selectedEventId) ?? markerEvents[0];
  const cameraCoordinates = selectedEvent
    ? {
        latitude: selectedEvent.location_latitude as number,
        longitude: selectedEvent.location_longitude as number,
      }
    : budapest;

  return (
    <GoogleMaps.View
      key={selectedEvent?.id ?? 'fallback'}
      style={styles.map}
      cameraPosition={{
        coordinates: cameraCoordinates,
        zoom: selectedEvent ? 14 : 10,
      }}
      markers={markerEvents.map((event) => ({
        id: event.id,
        coordinates: {
          latitude: event.location_latitude as number,
          longitude: event.location_longitude as number,
        },
        title: event.title,
        snippet: event.location_name ?? undefined,
        showCallout: event.id === selectedEventId,
      }))}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
