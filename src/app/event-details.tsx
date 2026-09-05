import { colors, radius, spacing } from '@/constants/theme';
import {
  deleteFamilyEvent,
  getFamilyEvent,
  type FamilyEvent,
} from '@/services/events';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const categoryData: Record<
    string,
    {
        label: string,
        color: string,
        icon: SymbolViewProps['name'],
    }
> = {
        family: {
            label: 'Családi',
            color: '#8B5CF6',
            icon: {
                ios: 'person.2.fill',
                android: 'group',
                web: 'group',
            },
        },
        birthday: {
            label: 'Születésnap',
            color: '#F55B91',
            icon: {
                ios: 'birthday.cake.fill',
                android: 'cake',
                web: 'cake',
            },
        },
        medical: {
            label: 'Orvosi',
            color: '#34D399',
            icon: {
                ios: 'cross.case.fill',
                android: 'medical_services',
                web: 'medical_services'
            },
        },
        school: {
            label: 'Iskola',
            color: '#38BDF8',
            icon: {
                ios: 'graduationcap.fill',
                android: 'school',
                web: 'school',
            },
        },
        sport: {
            label: 'Sport',
            color: '#F59E0B',
            icon: {
                ios: 'figure.run',
                android: 'directions_run',
                web: 'directions_run',
            },
        },
        administration: {
            label: 'Ügyintézés',
            color: '#FB7185',
            icon: {
                ios: 'doc.text.fill',
                android: 'description',
                web: 'description',
            },
        },
        trip: {
            label: 'Kirándulás',
            color: '#22C55E',
            icon: {
                ios: 'mountain.2.fill',
                android: 'landscape',
                web: 'landscape',
            },
        },
    };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function EventDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = firstParam(params.eventId);

  const [event, setEvent] = useState<FamilyEvent | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(
    eventId ? null : 'Hiányzó eseményazonosító.',
  );

  useEffect(() => {
    if (!eventId) return;

    let active = true;

    void getFamilyEvent(eventId)
      .then((result) => {
        if (!active) return;

        setEvent(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;

        setError(
          caught instanceof Error
            ? caught.message
            : 'Az esemény betöltése sikertelen.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  function confirmDelete() {
    if (!event) return;

    Alert.alert(
      'Esemény törlése',
      `Biztosan törlöd ezt az eseményt: ${event.title}?`,
      [
        {
          text: 'Mégse',
          style: 'cancel',
        },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: () => void removeEvent(),
        },
      ],
    );
  }

  async function removeEvent() {
    if (!event) return;

    setDeleting(true);

    try {
      await deleteFamilyEvent(event.id);
      router.replace('/calendar');
    } catch (caught) {
      Alert.alert(
        'Nem sikerült törölni',
        caught instanceof Error
          ? caught.message
          : 'Próbáld újra később.',
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator
            color={colors.primaryLight}
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  const category =
    categoryData[event?.category ?? 'family'] ??
    categoryData.family;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Vissza"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{
              ios: 'chevron.left',
              android: 'arrow_back',
              web: 'arrow_back',
            }}
            size={23}
            tintColor={colors.textPrimary}
            weight={{ ios: 'semibold', android: medium }}
            style={styles.symbol}
          />
        </Pressable>

        <Text style={styles.headerTitle}>Esemény részletei</Text>

        <Pressable
          accessibilityLabel="Esemény törlése"
          accessibilityRole="button"
          disabled={!event || deleting}
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
            deleting && styles.disabled,
          ]}>
          {deleting ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <SymbolView
              name={{
                ios: 'trash.fill',
                android: 'delete',
                web: 'delete',
              }}
              size={22}
              tintColor={colors.danger}
              type="hierarchical"
              weight={{ ios: 'semibold', android: medium }}
              style={styles.symbol}
            />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {event ? (
          <>
            <View style={styles.heroCard}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: `${category.color}25` },
                ]}>
                <SymbolView
                  name={category.icon}
                  size={34}
                  tintColor={category.color}
                  type="hierarchical"
                  weight={{ ios: 'semibold', android: medium }}
                  style={styles.largeSymbol}
                />
              </View>

              <View
                style={[
                  styles.categoryBadge,
                  {
                    borderColor: `${category.color}80`,
                    backgroundColor: `${category.color}1F`,
                  },
                ]}>
                <Text
                  style={[
                    styles.categoryText,
                    { color: category.color },
                  ]}>
                  {category.label}
                </Text>
              </View>

              <Text style={styles.title}>{event.title}</Text>

              {event.description ? (
                <Text style={styles.description}>
                  {event.description}
                </Text>
              ) : null}
            </View>

            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <SymbolView
                    name={{
                      ios: 'calendar',
                      android: 'calendar_month',
                      web: 'calendar_month',
                    }}
                    size={22}
                    tintColor={colors.primaryLight}
                    weight={{ ios: 'semibold', android: medium }}
                    style={styles.symbol}
                  />
                </View>

                <View style={styles.flex}>
                  <Text style={styles.detailLabel}>Dátum</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(event.starts_at)}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <SymbolView
                    name={{
                      ios: 'clock.fill',
                      android: 'schedule',
                      web: 'schedule',
                    }}
                    size={22}
                    tintColor={colors.primaryLight}
                    weight={{ ios: 'semibold', android: medium }}
                    style={styles.symbol}
                  />
                </View>

                <View style={styles.flex}>
                  <Text style={styles.detailLabel}>Időpont</Text>
                  <Text style={styles.detailValue}>
                    {formatTime(event.starts_at)}
                    {event.ends_at
                      ? ` – ${formatTime(event.ends_at)}`
                      : ''}
                  </Text>
                </View>
              </View>

              {event.location_name ? (
                <>
                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <SymbolView
                        name={{
                          ios: 'location.fill',
                          android: 'location_on',
                          web: 'location_on',
                        }}
                        size={22}
                        tintColor={colors.primaryLight}
                        type="hierarchical"
                        weight={{ ios: 'semibold', android: medium }}
                        style={styles.symbol}
                      />
                    </View>

                    <View style={styles.flex}>
                      <Text style={styles.detailLabel}>Helyszín</Text>
                      <Text style={styles.detailValue}>
                        {event.location_name}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '900',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#294469',
    backgroundColor: '#10233E',
  },
  categoryIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  detailsCard: {
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#294469',
    backgroundColor: '#10233E',
  },
  detailRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  detailValue: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  flex: {
    flex: 1,
  },
  symbol: {
    width: 27,
    height: 27,
  },
  largeSymbol: {
    width: 42,
    height: 42,
  },
  errorCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#3B1622',
  },
  errorText: {
    color: '#FDA4AF',
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
