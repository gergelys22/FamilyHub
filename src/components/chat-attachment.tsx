import { colors, darkColors, radius, spacing } from '@/constants/theme';
import { getChatAttachmentUrl, type ChatAttachment } from '@/services/chat';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

type Palette = typeof colors | typeof darkColors;

type Props = {
  attachment: ChatAttachment;
  mine: boolean;
  palette: Palette;
};

function formatDuration(totalSeconds: number) {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('Megnyitás sikertelen', 'A fájl nem nyitható meg.');
  });
}

function useAttachmentUrl(path: string) {
  const [state, setState] = useState<{ path: string; url: string | null; failed: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    getChatAttachmentUrl(path)
      .then((url) => {
        if (active) setState({ path, url, failed: false });
      })
      .catch(() => {
        if (active) setState({ path, url: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [path]);

  const current = state?.path === path ? state : null;
  return { url: current?.url ?? null, failed: current?.failed ?? false };
}

function AudioAttachment({
  url,
  durationMs,
  mine,
  palette,
}: {
  url: string;
  durationMs: number | null;
  mine: boolean;
  palette: Palette;
}) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const total = status.duration > 0 ? status.duration : (durationMs ?? 0) / 1000;
  const textColor = mine ? palette.white : palette.textPrimary;

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (total > 0 && status.currentTime >= total - 0.1) {
      void player.seekTo(0).then(() => player.play());
      return;
    }
    player.play();
  }

  const progress = total > 0 ? Math.min(1, status.currentTime / total) : 0;

  return (
    <View style={[styles.row, { backgroundColor: mine ? palette.primary : palette.surface }]}>
      <Pressable accessibilityLabel={status.playing ? 'Szünet' : 'Lejátszás'} onPress={toggle} hitSlop={8}>
        <Ionicons name={status.playing ? 'pause-circle' : 'play-circle'} size={36} color={textColor} />
      </Pressable>
      <View style={styles.audioBody}>
        <View style={[styles.track, { backgroundColor: mine ? 'rgba(255,255,255,0.35)' : palette.border }]}>
          <View style={[styles.trackFill, { width: `${progress * 100}%`, backgroundColor: textColor }]} />
        </View>
        <Text style={[styles.meta, { color: textColor }]}>
          {formatDuration(status.playing || status.currentTime > 0 ? status.currentTime : total)} / {formatDuration(total)}
        </Text>
      </View>
    </View>
  );
}

export function ChatAttachmentView({ attachment, mine, palette }: Props) {
  const { url, failed } = useAttachmentUrl(attachment.storage_path);
  const textColor = mine ? palette.white : palette.textPrimary;

  if (attachment.kind === 'image') {
    return (
      <Pressable
        accessibilityLabel={`Kép megnyitása: ${attachment.file_name}`}
        disabled={!url}
        onPress={() => url && openUrl(url)}
        style={styles.imageWrap}
      >
        {url ? (
          <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.center, { backgroundColor: palette.surfaceElevated }]}>
            {failed ? (
              <Ionicons name="alert-circle-outline" size={28} color={palette.textMuted} />
            ) : (
              <ActivityIndicator color={palette.primary} />
            )}
          </View>
        )}
      </Pressable>
    );
  }

  if (attachment.kind === 'audio') {
    if (url) {
      return <AudioAttachment url={url} durationMs={attachment.duration_ms} mine={mine} palette={palette} />;
    }
    return (
      <View style={[styles.row, styles.center, { backgroundColor: mine ? palette.primary : palette.surface }]}>
        {failed ? (
          <Ionicons name="alert-circle-outline" size={24} color={textColor} />
        ) : (
          <ActivityIndicator color={textColor} />
        )}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`Fájl megnyitása: ${attachment.file_name}`}
      disabled={!url}
      onPress={() => url && openUrl(url)}
      style={[styles.row, { backgroundColor: mine ? palette.primary : palette.surface, opacity: url || failed ? 1 : 0.7 }]}
    >
      <Ionicons
        name={attachment.kind === 'video' ? 'videocam' : 'document-text'}
        size={30}
        color={textColor}
      />
      <View style={styles.fileBody}>
        <Text numberOfLines={1} style={[styles.fileName, { color: textColor }]}>
          {attachment.file_name}
        </Text>
        <Text style={[styles.meta, { color: textColor }]}>
          {failed ? 'Nem érhető el' : formatSize(attachment.size_bytes)}
        </Text>
      </View>
      <Ionicons name="open-outline" size={18} color={textColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  imageWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  image: { width: 220, height: 220, borderRadius: radius.lg },
  row: {
    minWidth: 220,
    maxWidth: 280,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  audioBody: { flex: 1, gap: 6 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: 4, borderRadius: 2 },
  fileBody: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '800' },
  meta: { marginTop: 2, fontSize: 11, fontWeight: '700' },
});