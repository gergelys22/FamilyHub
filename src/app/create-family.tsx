import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { createFamily } from '@/services/families';

export default function CreateFamilyScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function submit() {
        if (submitting) return;

        setSubmitting(true);
        setErrorMessage(null);

        try {
            await createFamily(name);
            router.replace('/');
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'A család létrehozása sikertelen.'
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.title}>Család létrehozása</Text>
                <Text style={styles.description}>
                    Adj nevet a családi körnek. Te leszel a család tulajdonosa.
                </Text>
            </View>

            <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                editable={!submitting}
                maxLength={80}
                onChangeText={setName}
                onSubmitEditing={() => void submit()}
                placeholder="Például: Sümegi család"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                style={styles.input}
                value={name}
            />

            {errorMessage ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                    {errorMessage}
                </Text>
            ) : null}

            <Pressable
                accessibilityRole="button"
                disabled={submitting || name.trim().length < 2}
                onPress={() => void submit()}
                style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                    (submitting || name.trim().length < 2) && styles.disabled,
                ]}>
                {submitting ? (
                    <ActivityIndicator color='#FFFFFF' />
                ) : (
                    <Text style={styles.primaryButtonText}>Család létrehozása</Text>
                )}
            </Pressable>


            <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => router.replace('/')}
                style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Mégse</Text>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xl,
        gap: spacing.lg,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 26,
        fontWeight: '800',
    },
    description: {
        color: colors.textMuted,
        fontSize: 14,
        lineHeight: 20,
        marginTop: spacing.sm,
    },
    input: {
        minHeight: 54,
        paddingHorizontal: spacing.lg,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
    },
    error: {
        color: '#FDA4AF',
        fontSize: 12,
    },
    primaryButton: {
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: radius.md,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    secondaryButton: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: colors.primaryLight,
        fontSize: 14,
        fontWeight: '700',
    },
    pressed: {
        opacity: 0.75,
    },
    disabled: {
        opacity: 0.5,
    },
});
