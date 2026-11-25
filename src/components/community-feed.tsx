import {
  Avatar,
  EmptyBlock,
  FormInput,
  PrimaryButton,
  Sheet,
  sharedStyles,
  timeAgo,
  useFamilyId,
  usePalette,
} from '@/components/community-shared';
import { radius, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import {
  addPostComment,
  createCommunityPost,
  deleteCommunityPost,
  deletePostComment,
  getCommunityPosts,
  getPostComments,
  setPostReaction,
  updateCommunityPost,
  updatePostComment,
  type CommunityComment,
  type CommunityPost,
} from '@/services/community';
import type { FavoriteType } from '@/services/favorites';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type FavoriteApi = {
  isFavorite: (type: FavoriteType, id: string) => boolean;
  toggleFavorite: (type: FavoriteType, id: string) => Promise<void>;
};

/* ------------------------------------------------------------------ */
/* Hozzászólások                                                       */
/* ------------------------------------------------------------------ */

function CommentsSheet({
  post,
  onClose,
  onChanged,
}: {
  post: CommunityPost | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { palette } = usePalette();
  const { profile } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const postId = post?.id ?? null;

  useEffect(() => {
    if (!postId) return;
    let active = true;
    void getPostComments(postId)
      .then((items) => {
        if (active) setComments(items);
      })
      .catch(() => {
        // A lista üresen marad, a következő megnyitáskor újra próbálkozik.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId, version]);

  async function send() {
    if (!postId || !profile?.id || !text.trim()) return;
    setBusy(true);
    try {
      await addPostComment(postId, profile.id, text);
      setText('');
      setVersion((current) => current + 1);
      onChanged();
    } catch (caught) {
      Alert.alert('A hozzászólás nem küldhető el', caught instanceof Error ? caught.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(comment: CommunityComment) {
    if (!editText.trim()) return;
    try {
      if (editText.trim() !== comment.body) await updatePostComment(comment.id, editText);
      setEditingId(null);
      setVersion((current) => current + 1);
      onChanged();
    } catch (caught) {
      Alert.alert('A módosítás sikertelen', caught instanceof Error ? caught.message : 'Próbáld újra.');
    }
  }

  function remove(comment: CommunityComment) {
    Alert.alert('Hozzászólás törlése', 'Biztosan törlöd?', [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          void deletePostComment(comment.id)
            .then(() => {
              setVersion((current) => current + 1);
              onChanged();
            })
            .catch((caught) =>
              Alert.alert('Hiba', caught instanceof Error ? caught.message : 'A törlés sikertelen.'),
            ),
      },
    ]);
  }

  return (
    <Sheet visible={post !== null} onClose={onClose} title="Hozzászólások" icon="chatbubbles" maxHeight="85%">
      {loading && comments.length === 0 ? <ActivityIndicator color={palette.primary} /> : null}
      {!loading && comments.length === 0 ? (
        <Text style={[feedStyles.noComments, { color: palette.textMuted }]}>
          Még nincs hozzászólás. Légy te az első!
        </Text>
      ) : null}
      {comments.map((comment) => (
        <View key={comment.id} style={feedStyles.commentRow}>
          <Avatar name={comment.author_name} size={34} />
          <View style={[feedStyles.commentBubble, { backgroundColor: palette.surfaceElevated }]}>
            <View style={feedStyles.commentHeader}>
              <Text style={[feedStyles.commentName, { color: palette.textPrimary }]}>{comment.author_name}</Text>
              <Text style={[feedStyles.commentTime, { color: palette.textMuted }]}>
                {timeAgo(comment.created_at)}
                {comment.edited_at ? ' · szerkesztve' : ''}
              </Text>
            </View>
            {editingId === comment.id ? (
              <View style={feedStyles.commentEdit}>
                <FormInput value={editText} onChangeText={setEditText} multiline maxLength={1000} />
                <View style={feedStyles.commentEditActions}>
                  <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                    <Text style={[feedStyles.commentText, { color: palette.textMuted }]}>Mégse</Text>
                  </Pressable>
                  <Pressable onPress={() => void saveEdit(comment)} hitSlop={8}>
                    <Text style={[feedStyles.commentText, { color: palette.primary, fontWeight: '900' }]}>Mentés</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={[feedStyles.commentText, { color: palette.textPrimary }]}>{comment.body}</Text>
            )}
          </View>
          {comment.author_profile_id === profile?.id && editingId !== comment.id ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hozzászólás szerkesztése"
              hitSlop={8}
              onPress={() => {
                setEditingId(comment.id);
                setEditText(comment.body);
              }}
            >
              <Ionicons name="pencil-outline" size={16} color={palette.textMuted} />
            </Pressable>
          ) : null}
          {comment.author_profile_id === profile?.id ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hozzászólás törlése"
              hitSlop={8}
              onPress={() => remove(comment)}
            >
              <Ionicons name="trash-outline" size={16} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ))}
      <View style={feedStyles.commentComposer}>
        <FormInput
          value={text}
          onChangeText={setText}
          placeholder="Írj hozzászólást…"
          style={feedStyles.flex}
          maxLength={1000}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hozzászólás küldése"
          disabled={busy || !text.trim()}
          onPress={() => void send()}
          style={({ pressed }) => [
            feedStyles.sendButton,
            { backgroundColor: palette.primary },
            (busy || !text.trim()) && sharedStyles.disabled,
            pressed && sharedStyles.pressed,
          ]}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Új bejegyzés                                                        */
/* ------------------------------------------------------------------ */

export function NewPostModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { palette } = usePalette();
  const { profile } = useAuth();
  const { familyId } = useFamilyId();
  const [body, setBody] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Engedély szükséges', 'A fotó kiválasztásához engedélyezd a fotókönyvtár hozzáférést.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setImage(result.assets[0] ?? null);
  }

  async function publish() {
    if (!familyId || !profile?.id) return;
    if (!body.trim() && !image) {
      Alert.alert('Üres bejegyzés', 'Írj valamit, vagy válassz egy fotót.');
      return;
    }
    setBusy(true);
    try {
      await createCommunityPost({
        familyId,
        profileId: profile.id,
        body,
        image: image ? { uri: image.uri, mimeType: image.mimeType } : null,
      });
      setBody('');
      setImage(null);
      onSaved();
      onClose();
    } catch (caught) {
      Alert.alert('A bejegyzés nem tehető közzé', caught instanceof Error ? caught.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Új bejegyzés" icon="create">
      <FormInput
        value={body}
        onChangeText={setBody}
        placeholder="Mi történt ma a családban?"
        multiline
        maxLength={2000}
      />
      {image ? (
        <View style={feedStyles.previewWrap}>
          <Image source={{ uri: image.uri }} style={feedStyles.preview} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fotó eltávolítása"
            onPress={() => setImage(null)}
            style={feedStyles.previewRemove}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => void pickImage()}
          style={({ pressed }) => [
            feedStyles.photoButton,
            { backgroundColor: palette.primarySoft },
            pressed && sharedStyles.pressed,
          ]}
        >
          <Ionicons name="image-outline" size={20} color={palette.primary} />
          <Text style={[feedStyles.photoButtonText, { color: palette.primary }]}>Fotó hozzáadása (opcionális)</Text>
        </Pressable>
      )}
      <PrimaryButton label="Közzététel" icon="paper-plane" busy={busy} onPress={() => void publish()} />
    </Sheet>
  );
}

export function EditPostModal({
  post,
  onClose,
  onSaved,
}: {
  post: CommunityPost;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { palette } = usePalette();
  const [body, setBody] = useState(post.body);
  const [newImage, setNewImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewUri = newImage?.uri ?? (removeImage ? null : post.media_url);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Engedély szükséges', 'A fotó kiválasztásához engedélyezd a fotókönyvtár hozzáférést.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) {
      setNewImage(result.assets[0] ?? null);
      setRemoveImage(false);
    }
  }

  async function save() {
    if (!body.trim() && !previewUri) {
      Alert.alert('Üres bejegyzés', 'Írj valamit, vagy tarts meg egy fotót.');
      return;
    }
    setBusy(true);
    try {
      await updateCommunityPost({
        postId: post.id,
        familyId: post.family_id,
        body,
        currentMediaPath: post.media_path,
        removeImage,
        newImage: newImage ? { uri: newImage.uri, mimeType: newImage.mimeType } : null,
      });
      onSaved();
      onClose();
    } catch (caught) {
      Alert.alert('A módosítás sikertelen', caught instanceof Error ? caught.message : 'Próbáld újra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible onClose={onClose} title="Bejegyzés szerkesztése" icon="create">
      <FormInput value={body} onChangeText={setBody} placeholder="Szöveg" multiline maxLength={2000} />
      {previewUri ? (
        <View style={feedStyles.previewWrap}>
          <Image source={{ uri: previewUri }} style={feedStyles.preview} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fotó eltávolítása"
            onPress={() => {
              setNewImage(null);
              setRemoveImage(true);
            }}
            style={feedStyles.previewRemove}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => void pickImage()}
        style={({ pressed }) => [feedStyles.photoButton, { backgroundColor: palette.primarySoft }, pressed && sharedStyles.pressed]}
      >
        <Ionicons name="image-outline" size={20} color={palette.primary} />
        <Text style={[feedStyles.photoButtonText, { color: palette.primary }]}>
          {previewUri ? 'Fotó cseréje' : 'Fotó hozzáadása'}
        </Text>
      </Pressable>
      <PrimaryButton label="Mentés" icon="checkmark" busy={busy} onPress={() => void save()} />
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Hírfolyam                                                           */
/* ------------------------------------------------------------------ */

export function FeedTab({
  refreshToken,
  onCompose,
  favorites,
}: {
  refreshToken: number;
  onCompose: () => void;
  favorites: FavoriteApi;
}) {
  const { palette } = usePalette();
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const { familyId, loading: familyLoading } = useFamilyId();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [commentPost, setCommentPost] = useState<CommunityPost | null>(null);
  const [editPost, setEditPost] = useState<CommunityPost | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!familyId) return;
    let active = true;
    void getCommunityPosts(familyId, profileId)
      .then((items) => {
        if (!active) return;
        setPosts(items);
        setError(null);
        setCommentPost((current) => (current ? (items.find((item) => item.id === current.id) ?? current) : current));
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'A hírfolyam betöltése sikertelen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [familyId, profileId, refreshToken, version]);

  // Valós idejű frissítés: új bejegyzés, reakció vagy hozzászólás érkezésekor újratöltünk.
  useEffect(() => {
    if (!familyId) return;
    function bump() {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => setVersion((current) => current + 1), 400);
    }
    const channel = supabase
      .channel(`community-feed:${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_reactions' }, bump)
      .subscribe();
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      void supabase.removeChannel(channel);
    };
  }, [familyId]);

  function toggleLike(post: CommunityPost) {
    if (!profileId) return;
    const next = !post.liked_by_me;
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? { ...item, liked_by_me: next, reaction_count: item.reaction_count + (next ? 1 : -1) }
          : item,
      ),
    );
    void setPostReaction(post.id, profileId, next).catch(() => setVersion((current) => current + 1));
  }

  function removePost(post: CommunityPost) {
    Alert.alert('Bejegyzés törlése', 'Biztosan törlöd ezt a bejegyzést?', [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: () =>
          void deleteCommunityPost(post.id, post.media_path)
            .then(() => setVersion((current) => current + 1))
            .catch((caught) =>
              Alert.alert('Hiba', caught instanceof Error ? caught.message : 'A törlés sikertelen.'),
            ),
      },
    ]);
  }

  function openPostActions(post: CommunityPost) {
    Alert.alert('Bejegyzés', undefined, [
      { text: 'Szerkesztés', onPress: () => setEditPost(post) },
      { text: 'Törlés', style: 'destructive', onPress: () => removePost(post) },
      { text: 'Mégse', style: 'cancel' },
    ]);
  }

  const myName = profile?.display_name ?? 'Én';

  return (
    <View style={feedStyles.list}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Új bejegyzés írása"
        onPress={onCompose}
        style={({ pressed }) => [
          feedStyles.composer,
          { backgroundColor: palette.surface, borderColor: palette.border },
          pressed && sharedStyles.pressed,
        ]}
      >
        <Avatar name={myName} size={42} />
        <Text style={[feedStyles.composerText, { color: palette.textMuted }]}>Mi történt ma a családban?</Text>
        <Ionicons name="image-outline" size={22} color={palette.primary} />
      </Pressable>

      {(loading || familyLoading) && posts.length === 0 ? (
        <ActivityIndicator color={palette.primary} size="large" style={feedStyles.loader} />
      ) : null}

      {error ? <EmptyBlock icon="alert-circle-outline" title="Hiba történt" text={error} /> : null}

      {!loading && !error && posts.length === 0 ? (
        <EmptyBlock
          icon="chatbubbles-outline"
          title="Még nincs bejegyzés"
          text="Oszd meg az első pillanatot a családdal."
          action={{ label: 'Bejegyzés írása', onPress: onCompose }}
        />
      ) : null}

      {posts.map((post) => {
        const mine = post.author_profile_id === profileId;
        const favorite = favorites.isFavorite('post', post.id);
        return (
          <View
            key={post.id}
            style={[feedStyles.post, { backgroundColor: palette.surface, borderColor: palette.border }, shadows.card]}
          >
            <View style={feedStyles.postHeader}>
              <Avatar name={post.author_name} size={40} />
              <View style={feedStyles.flex}>
                <Text style={[feedStyles.author, { color: palette.textPrimary }]}>{post.author_name}</Text>
                <Text style={[feedStyles.time, { color: palette.textMuted }]}>
                  {timeAgo(post.created_at)}
                  {post.edited_at ? ' · szerkesztve' : ''}
                </Text>
              </View>
              {mine ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Bejegyzés műveletei"
                  hitSlop={10}
                  onPress={() => openPostActions(post)}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={palette.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {post.body ? <Text style={[feedStyles.body, { color: palette.textPrimary }]}>{post.body}</Text> : null}

            {post.media_url ? (
              <Image source={{ uri: post.media_url }} style={[feedStyles.media, { backgroundColor: palette.surfaceMuted }]} />
            ) : null}

            <View style={feedStyles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={post.liked_by_me ? 'Kedvelés visszavonása' : 'Kedvelés'}
                accessibilityState={{ selected: post.liked_by_me }}
                onPress={() => toggleLike(post)}
                style={feedStyles.action}
              >
                <Ionicons
                  name={post.liked_by_me ? 'heart' : 'heart-outline'}
                  size={22}
                  color={post.liked_by_me ? palette.danger : palette.textSecondary}
                />
                <Text style={[feedStyles.actionText, { color: palette.textSecondary }]}>{post.reaction_count}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hozzászólások megnyitása"
                onPress={() => setCommentPost(post)}
                style={feedStyles.action}
              >
                <Ionicons name="chatbubble-outline" size={20} color={palette.textSecondary} />
                <Text style={[feedStyles.actionText, { color: palette.textSecondary }]}>{post.comment_count}</Text>
              </Pressable>
              <View style={feedStyles.flex} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? 'Eltávolítás a kedvencekből' : 'Mentés a kedvencek közé'}
                accessibilityState={{ selected: favorite }}
                onPress={() => void favorites.toggleFavorite('post', post.id)}
                hitSlop={8}
              >
                <Ionicons
                  name={favorite ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={favorite ? palette.primary : palette.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        );
      })}

      {editPost ? (
        <EditPostModal
          key={editPost.id}
          post={editPost}
          onClose={() => setEditPost(null)}
          onSaved={() => setVersion((current) => current + 1)}
        />
      ) : null}

      <CommentsSheet
        post={commentPost}
        onClose={() => setCommentPost(null)}
        onChanged={() => setVersion((current) => current + 1)}
      />
    </View>
  );
}

const feedStyles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md },
  loader: { paddingVertical: 48 },
  composer: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  composerText: { flex: 1, fontSize: 14, fontWeight: '700' },
  post: { padding: spacing.md, gap: spacing.md, borderWidth: 1, borderRadius: radius.xl },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { fontSize: 14, fontWeight: '900' },
  time: { marginTop: 1, fontSize: 11, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  media: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  actionText: { fontSize: 13, fontWeight: '800' },
  noComments: { paddingVertical: spacing.lg, fontSize: 13, textAlign: 'center' },
  commentEdit: { gap: spacing.xs },
  commentEditActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  commentBubble: { flex: 1, padding: spacing.md, gap: 3, borderRadius: radius.lg },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commentName: { fontSize: 12, fontWeight: '900' },
  commentTime: { fontSize: 10, fontWeight: '700' },
  commentText: { fontSize: 14, lineHeight: 20 },
  commentComposer: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sendButton: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25 },
  previewWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  preview: { width: '100%', aspectRatio: 4 / 3 },
  previewRemove: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(23, 43, 77, 0.78)',
  },
  photoButton: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  photoButtonText: { flex: 1, fontWeight: '800' },
});
