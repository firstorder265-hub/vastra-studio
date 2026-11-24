const RAW_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_URL = RAW_URL.replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const MEDIA_BUCKET = 'fashion-media';

export const isCloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const VISITOR_LIKES_KEY = 'vastra_visitor_liked_ids';
const VISITOR_FOLLOW_KEY = 'vastra_visitor_following';

export function getVisitorLikedIds() {
  try {
    const raw = localStorage.getItem(VISITOR_LIKES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function saveVisitorLikedIds(idSet) {
  try {
    localStorage.setItem(VISITOR_LIKES_KEY, JSON.stringify(Array.from(idSet)));
  } catch {
    // ignore
  }
}

export function getVisitorFollowing() {
  try {
    return localStorage.getItem(VISITOR_FOLLOW_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveVisitorFollowing(isFollowing) {
  try {
    localStorage.setItem(VISITOR_FOLLOW_KEY, isFollowing ? '1' : '0');
  } catch {
    // ignore
  }
}

function authHeaders(extra = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    ...extra,
  };
  // Legacy anon keys are JWTs (eyJ...); new sb_publishable_ keys only use apikey header
  if (SUPABASE_ANON_KEY.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return headers;
}

async function restFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: authHeaders({
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Supabase error ${res.status}: ${errText}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function mapChannelFromDb(row) {
  return {
    name: row.name,
    handle: row.handle,
    bio: row.bio || '',
    verified: Boolean(row.verified),
    followersCount: Number(row.followers_count) || 0,
    isFollowing: getVisitorFollowing(),
    avatar: row.avatar || '/images/avatar.jpg',
    banner: row.banner || '/images/banner.jpg',
    whatsapp: row.whatsapp || '',
    adminPin: row.admin_pin || '1234',
  };
}

function mapChannelToDb(channel) {
  return {
    id: 'main',
    name: channel.name,
    handle: channel.handle,
    bio: channel.bio || '',
    verified: Boolean(channel.verified),
    followers_count: Number(channel.followersCount) || 0,
    avatar: channel.avatar || '/images/avatar.jpg',
    banner: channel.banner || '/images/banner.jpg',
    whatsapp: channel.whatsapp || '',
    admin_pin: channel.adminPin || '1234',
    updated_at: new Date().toISOString(),
  };
}

function mapCollectionFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || 'both',
    cover: row.cover || '',
  };
}

function mapCollectionToDb(col, index = Date.now()) {
  return {
    id: col.id,
    name: col.name,
    category: col.category || 'both',
    cover: col.cover || '',
    sort_order: index,
  };
}

function mapItemFromDb(row, likedSet) {
  return {
    id: row.id,
    image: row.image,
    category: row.category || 'ladies',
    collectionId: row.collection_id || '',
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    allSizes: Boolean(row.all_sizes),
    likes: Number(row.likes) || 0,
    liked: likedSet.has(row.id),
    createdAt: Number(row.created_at) || Date.now(),
  };
}

function mapItemToDb(item) {
  return {
    id: item.id,
    image: item.image,
    category: item.category || 'ladies',
    collection_id: item.collectionId || '',
    sizes: Array.isArray(item.sizes) ? item.sizes : [],
    all_sizes: Boolean(item.allSizes),
    likes: Number(item.likes) || 0,
    created_at: Number(item.createdAt) || Date.now(),
  };
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Uploads a compressed Data URL (or Blob) into Supabase public Storage bucket
 * and returns the public CDN URL.
 */
export async function uploadImageToCloud(dataUrlOrBlob, folder = 'items') {
  if (!isCloudEnabled) return dataUrlOrBlob;
  if (
    typeof dataUrlOrBlob === 'string' &&
    !dataUrlOrBlob.startsWith('data:')
  ) {
    return dataUrlOrBlob;
  }

  const blob =
    typeof dataUrlOrBlob === 'string'
      ? await dataUrlToBlob(dataUrlOrBlob)
      : dataUrlOrBlob;

  const filePath = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${filePath}`,
    {
      method: 'POST',
      headers: authHeaders({
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'true',
      }),
      body: blob,
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Storage upload failed (${res.status}): ${errText}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${filePath}`;
}

export async function deleteImageFromCloud(imageUrl) {
  if (!isCloudEnabled || typeof imageUrl !== 'string') return;
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;
  if (!imageUrl.startsWith(prefix)) return;

  const relPath = imageUrl.slice(prefix.length);
  if (!relPath) return;

  try {
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${relPath}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    );
  } catch {
    // Soft fail if storage object was already removed
  }
}

export async function fetchCloudState() {
  const [profileRows, colRows, itemRows] = await Promise.all([
    restFetch('channel_profile?id=eq.main&select=*'),
    restFetch('collections?select=*&order=sort_order.asc'),
    restFetch('fashion_items?select=*&order=created_at.desc'),
  ]);

  if (!Array.isArray(profileRows) || profileRows.length === 0) {
    return { initialized: false, channel: null, collections: [], items: [] };
  }

  const likedSet = getVisitorLikedIds();
  return {
    initialized: true,
    channel: mapChannelFromDb(profileRows[0]),
    collections: (colRows || []).map(mapCollectionFromDb),
    items: (itemRows || []).map((r) => mapItemFromDb(r, likedSet)),
  };
}

export async function saveCloudChannel(channel) {
  await restFetch('channel_profile?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(mapChannelToDb(channel)),
  });
}

export async function insertCloudItems(items) {
  if (!items || items.length === 0) return;
  await restFetch('fashion_items?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(items.map(mapItemToDb)),
  });
}

export async function updateCloudItem(id, patch) {
  const body = {};
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.collectionId !== undefined) body.collection_id = patch.collectionId;
  if (patch.sizes !== undefined) body.sizes = patch.sizes;
  if (patch.allSizes !== undefined) body.all_sizes = Boolean(patch.allSizes);
  if (patch.image !== undefined) body.image = patch.image;

  await restFetch(`fashion_items?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
}

export async function deleteCloudItem(id, imageUrl) {
  await restFetch(`fashion_items?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  await deleteImageFromCloud(imageUrl);
}

export async function insertCloudCollection(col, sortOrder = Date.now()) {
  await restFetch('collections?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(mapCollectionToDb(col, sortOrder)),
  });
}

export async function updateCloudCollection(id, patch) {
  const body = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.cover !== undefined) body.cover = patch.cover;

  await restFetch(`collections?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
}

export async function deleteCloudCollection(id, coverUrl) {
  await restFetch(`collections?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  await deleteImageFromCloud(coverUrl);
}

export async function toggleCloudItemLike(id, delta) {
  return restFetch('rpc/toggle_item_like', {
    method: 'POST',
    body: JSON.stringify({ p_item_id: id, p_delta: delta }),
  });
}

export async function toggleCloudChannelFollow(delta) {
  return restFetch('rpc/toggle_channel_follow', {
    method: 'POST',
    body: JSON.stringify({ p_delta: delta }),
  });
}

export async function seedCloudDefaults({ channel, collections, items }) {
  await saveCloudChannel(channel);
  if (collections.length > 0) {
    await restFetch('collections?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(
        collections.map((c, idx) => mapCollectionToDb(c, idx + 1))
      ),
    });
  }
  if (items.length > 0) {
    await insertCloudItems(items);
  }
}

export async function replaceAllCloudData({ channel, collections, items }) {
  await Promise.all([
    restFetch('fashion_items?id=not.is.null', {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    }),
    restFetch('collections?id=not.is.null', {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    }),
  ]);
  await seedCloudDefaults({ channel, collections, items });
}
