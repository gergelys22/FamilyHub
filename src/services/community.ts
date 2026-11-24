import { supabase } from '@/lib/supabase';

export const COMMUNITY_BUCKET = 'community-media';

export type CommunityPost = {
  id: string;
  family_id: string;
  author_profile_id: string;
  body: string;
  media_path: string | null;
  created_at: string;
  author_name: string;
  media_url: string | null;
  reaction_count: number;
  liked_by_me: boolean;
  comment_count: number;
};

export type CommunityComment = {
  id: string;
  post_id: string;
  author_profile_id: string;
  body: string;
  created_at: string;
  author_name: string;
};

type PostRow = {
  id: string;
  family_id: string;
  author_profile_id: string;
  body: string;
  media_path: string | null;
  created_at: string;
  author: { display_name: string } | { display_name: string }[] | null;
};

function authorName(author: PostRow['author']) {
  const value = Array.isArray(author) ? author[0] : author;
  return value?.display_name ?? 'Családtag';
}

export async function signMediaPaths(paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;
  const { data, error } = await supabase.storage.from(COMMUNITY_BUCKET).createSignedUrls(unique, 60 * 60);
  if (error) throw error;
  data?.forEach((entry) => {
    if (entry.path && entry.signedUrl) result.set(entry.path, entry.signedUrl);
  });
  return result;
}

export async function uploadCommunityImage(familyId: string, uri: string, mimeType?: string | null) {
  const extension = (mimeType?.split('/')[1] ?? uri.split('.').pop() ?? 'jpg').replace('jpeg', 'jpg');
  const path = `${familyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  const { error } = await supabase.storage.from(COMMUNITY_BUCKET).upload(path, buffer, {
    contentType: mimeType ?? 'image/jpeg',
  });
  if (error) throw error;
  return path;
}

export async function getCommunityPosts(familyId: string, myProfileId: string | null) {
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, family_id, author_profile_id, body, media_path, created_at, author:profiles!author_profile_id(display_name)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  const rows = (data ?? []) as unknown as PostRow[];
  if (rows.length === 0) return [] as CommunityPost[];

  const ids = rows.map((row) => row.id);
  const [reactions, comments, urls] = await Promise.all([
    supabase.from('community_reactions').select('post_id, profile_id').in('post_id', ids),
    supabase.from('community_comments').select('post_id').in('post_id', ids),
    signMediaPaths(rows.map((row) => row.media_path ?? '')),
  ]);
  if (reactions.error) throw reactions.error;
  if (comments.error) throw comments.error;

  const reactionCount = new Map<string, number>();
  const liked = new Set<string>();
  (reactions.data ?? []).forEach((item) => {
    reactionCount.set(item.post_id, (reactionCount.get(item.post_id) ?? 0) + 1);
    if (item.profile_id === myProfileId) liked.add(item.post_id);
  });
  const commentCount = new Map<string, number>();
  (comments.data ?? []).forEach((item) => {
    commentCount.set(item.post_id, (commentCount.get(item.post_id) ?? 0) + 1);
  });

  return rows.map<CommunityPost>((row) => ({
    id: row.id,
    family_id: row.family_id,
    author_profile_id: row.author_profile_id,
    body: row.body,
    media_path: row.media_path,
    created_at: row.created_at,
    author_name: authorName(row.author),
    media_url: row.media_path ? (urls.get(row.media_path) ?? null) : null,
    reaction_count: reactionCount.get(row.id) ?? 0,
    liked_by_me: liked.has(row.id),
    comment_count: commentCount.get(row.id) ?? 0,
  }));
}

export async function getCommunityPostsByIds(ids: string[], myProfileId: string | null) {
  if (ids.length === 0) return [] as CommunityPost[];
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, family_id, author_profile_id, body, media_path, created_at, author:profiles!author_profile_id(display_name)')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as PostRow[];
  const urls = await signMediaPaths(rows.map((row) => row.media_path ?? ''));
  const { data: reactions } = await supabase
    .from('community_reactions')
    .select('post_id, profile_id')
    .in('post_id', ids);
  const { data: comments } = await supabase.from('community_comments').select('post_id').in('post_id', ids);
  return rows.map<CommunityPost>((row) => ({
    id: row.id,
    family_id: row.family_id,
    author_profile_id: row.author_profile_id,
    body: row.body,
    media_path: row.media_path,
    created_at: row.created_at,
    author_name: authorName(row.author),
    media_url: row.media_path ? (urls.get(row.media_path) ?? null) : null,
    reaction_count: (reactions ?? []).filter((item) => item.post_id === row.id).length,
    liked_by_me: (reactions ?? []).some((item) => item.post_id === row.id && item.profile_id === myProfileId),
    comment_count: (comments ?? []).filter((item) => item.post_id === row.id).length,
  }));
}

export async function createCommunityPost(input: {
  familyId: string;
  profileId: string;
  body: string;
  image?: { uri: string; mimeType?: string | null } | null;
}) {
  const mediaPath = input.image
    ? await uploadCommunityImage(input.familyId, input.image.uri, input.image.mimeType)
    : null;
  const { error } = await supabase.from('community_posts').insert({
    family_id: input.familyId,
    author_profile_id: input.profileId,
    body: input.body.trim(),
    media_path: mediaPath,
  });
  if (error) throw error;
}

export async function deleteCommunityPost(postId: string) {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function setPostReaction(postId: string, profileId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from('community_reactions')
      .upsert({ post_id: postId, profile_id: profileId }, { onConflict: 'post_id,profile_id' });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('community_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function getPostComments(postId: string) {
  const { data, error } = await supabase
    .from('community_comments')
    .select('id, post_id, author_profile_id, body, created_at, author:profiles!author_profile_id(display_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as (Omit<CommunityComment, 'author_name'> & { author: PostRow['author'] })[]).map(
    (row) => ({
      id: row.id,
      post_id: row.post_id,
      author_profile_id: row.author_profile_id,
      body: row.body,
      created_at: row.created_at,
      author_name: authorName(row.author),
    }),
  );
}

export async function addPostComment(postId: string, profileId: string, body: string) {
  const { error } = await supabase
    .from('community_comments')
    .insert({ post_id: postId, author_profile_id: profileId, body: body.trim() });
  if (error) throw error;
}

export async function deletePostComment(commentId: string) {
  const { error } = await supabase.from('community_comments').delete().eq('id', commentId);
  if (error) throw error;
}
