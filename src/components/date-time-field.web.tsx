import { colors } from '@/constants/theme';
import type { DateTimeFieldProps } from '@/utils/event-date-time';
import { Pressable, Text, View } from 'react-native';

export default function DateTimeField({
  label,
  mode,
  value,
  onChange,
  disabled = false,
  clearable = false,
}: DateTimeFieldProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: '800',
        }}>
        {label}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <input
          aria-label={label}
          type={mode}
          value={value}
          disabled={disabled}
          step={mode === 'time' ? 60 : undefined}
          onChange={(event) => onChange(event.currentTarget.value)}
          style={{
            flex: 1,
            minWidth: 0,
            height: 50,
            boxSizing: 'border-box',
            padding: '0 14px',
            borderRadius: 12,
            border: `1px solid ${colors.borderStrong}`,
            background: colors.surface,
            color: colors.textPrimary,
            colorScheme: 'dark',
            fontFamily: 'inherit',
            fontSize: 15,
            opacity: disabled ? 0.5 : 1,
          }}
        />

        {clearable && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} törlése`}
            disabled={disabled}
            onPress={() => onChange('')}
            style={{
              width: 32,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: colors.primaryLight, fontSize: 22 }}>
              ×
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}