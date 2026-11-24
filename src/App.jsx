import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CHANNEL,
  DEFAULT_COLLECTIONS,
  DEFAULT_ITEMS,
} from './data/initialData';
import { dbClear, dbGet, dbSet } from './db';
import {
  deleteCloudCollection,
  deleteCloudItem,
  fetchCloudState,
  getVisitorLikedIds,
  insertCloudCollection,
  insertCloudItems,
  isCloudEnabled,
  replaceAllCloudData,
  saveCloudChannel,
  saveVisitorFollowing,
  saveVisitorLikedIds,
  seedCloudDefaults,
  toggleCloudChannelFollow,
  toggleCloudItemLike,
  updateCloudCollection,
  updateCloudItem,
  uploadImageToCloud,
} from './cloud';
import ChannelHeader from './components/ChannelHeader';
import FilterBar from './components/FilterBar';
import PhotoGrid from './components/PhotoGrid';
import PhotoLightbox from './components/PhotoLightbox';
import AdminPage from './components/AdminPage';

const SYNC_CHANNEL_NAME = 'vastra_fashion_channel_sync';
const ADMIN_SESSION_KEY = 'vastra_admin_unlocked';

function isAdminLocation() {
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  return (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    hash === 'admin' ||
    hash.startsWith('admin/')
  );
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(isAdminLocation);
  const [ready, setReady] = useState(false);
  const [cloudActive, setCloudActive] = useState(isCloudEnabled);
  const [channel, setChannel] = useState(DEFAULT_CHANNEL);
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [items, setItems] = useState(DEFAULT_ITEMS);

  const [activeCategory, setActiveCategory] = useState('all');
  const [activeCollection, setActiveCollection] = useState('all');
  const [activeSize, setActiveSize] = useState('all');

  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [toast, setToast] = useState('');

  const tabIdRef = useRef(`tab-${Math.random().toString(36).slice(2, 10)}`);
  const broadcastRef = useRef(null);
  const skipPersistRef = useRef({
    channel: false,
    collections: false,
    items: false,
  });

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? '' : curr));
    }, 2800);
  }, []);

  // Listen to browser navigation (back/forward or hash changes)
  useEffect(() => {
    const syncRoute = () => setIsAdminRoute(isAdminLocation());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  // Update browser tab title according to active page
  useEffect(() => {
    document.title = isAdminRoute
      ? `Admin Studio — ${channel.name}`
      : `${channel.name} — Ladies & Boys Fashion Channel`;
  }, [isAdminRoute, channel.name]);

  const hydrateFromLocal = useCallback(async (fromSync = false) => {
    const [savedChannel, savedCols, savedItems] = await Promise.all([
      dbGet('channel'),
      dbGet('collections'),
      dbGet('items'),
    ]);

    if (fromSync) {
      skipPersistRef.current = {
        channel: true,
        collections: true,
        items: true,
      };
    }

    setChannel(savedChannel ?? DEFAULT_CHANNEL);
    setCollections(Array.isArray(savedCols) ? savedCols : DEFAULT_COLLECTIONS);
    setItems(Array.isArray(savedItems) ? savedItems : DEFAULT_ITEMS);
  }, []);

  const hydrateFromCloud = useCallback(async () => {
    const cloud = await fetchCloudState();
    if (!cloud.initialized) {
      await seedCloudDefaults({
        channel: DEFAULT_CHANNEL,
        collections: DEFAULT_COLLECTIONS,
        items: DEFAULT_ITEMS,
      });
      setChannel(DEFAULT_CHANNEL);
      setCollections(DEFAULT_COLLECTIONS);
      setItems(DEFAULT_ITEMS);
      return;
    }
    setChannel(cloud.channel);
    setCollections(cloud.collections);
    setItems(cloud.items);
  }, []);

  const hydrate = useCallback(
    async (fromSync = false) => {
      if (isCloudEnabled) {
        try {
          await hydrateFromCloud();
          setCloudActive(true);
          return;
        } catch (err) {
          console.error('Cloud hydrate failed, falling back to local DB:', err);
          setCloudActive(false);
          if (!fromSync) {
            showToast('Cloud connect nahi hua — Local Mode active hai');
          }
        }
      }
      await hydrateFromLocal(fromSync);
    },
    [hydrateFromCloud, hydrateFromLocal, showToast]
  );

  // Initial load
  useEffect(() => {
    let mounted = true;
    hydrate(false).then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [hydrate]);

  // Cross-tab live synchronization between /admin and /
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
    broadcastRef.current = bc;
    bc.onmessage = (event) => {
      if (event.data?.senderId === tabIdRef.current) return;
      if (event.data?.type === 'state-updated') {
        hydrate(true);
      }
    };
    return () => {
      bc.close();
      broadcastRef.current = null;
    };
  }, [hydrate]);

  const notifyOtherTabs = useCallback(() => {
    try {
      broadcastRef.current?.postMessage({
        type: 'state-updated',
        senderId: tabIdRef.current,
      });
    } catch {
      // Ignore broadcast errors
    }
  }, []);

  // Local IndexedDB persistence (when not in Cloud Mode)
  useEffect(() => {
    if (!ready || cloudActive) return;
    if (skipPersistRef.current.channel) {
      skipPersistRef.current.channel = false;
      return;
    }
    dbSet('channel', channel).then(notifyOtherTabs);
  }, [channel, ready, cloudActive, notifyOtherTabs]);

  useEffect(() => {
    if (!ready || cloudActive) return;
    if (skipPersistRef.current.collections) {
      skipPersistRef.current.collections = false;
      return;
    }
    dbSet('collections', collections).then(notifyOtherTabs);
  }, [collections, ready, cloudActive, notifyOtherTabs]);

  useEffect(() => {
    if (!ready || cloudActive) return;
    if (skipPersistRef.current.items) {
      skipPersistRef.current.items = false;
      return;
    }
    dbSet('items', items).then(notifyOtherTabs);
  }, [items, ready, cloudActive, notifyOtherTabs]);

  // Counts
  const counts = useMemo(
    () => ({
      all: items.length,
      ladies: items.filter((it) => it.category === 'ladies').length,
      boys: items.filter((it) => it.category === 'boys').length,
    }),
    [items]
  );

  const totalLikes = useMemo(
    () => items.reduce((sum, it) => sum + (it.likes || 0), 0),
    [items]
  );

  const customSizes = useMemo(() => {
    const set = new Set();
    items.forEach((it) => (it.sizes || []).forEach((s) => set.add(s)));
    return Array.from(set);
  }, [items]);

  // Filtered photo gallery
  const filteredItems = useMemo(() => {
    return items
      .filter((it) => {
        if (activeCategory !== 'all' && it.category !== activeCategory) {
          return false;
        }
        if (
          activeCollection !== 'all' &&
          it.collectionId !== activeCollection
        ) {
          return false;
        }
        if (activeSize !== 'all') {
          const itemSizes = it.sizes || [];
          if (!itemSizes.includes(activeSize) && !it.allSizes) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [items, activeCategory, activeCollection, activeSize]);

  // Public channel actions
  const handleToggleFollow = () => {
    const nextFollowing = !channel.isFollowing;
    saveVisitorFollowing(nextFollowing);

    setChannel((prev) => ({
      ...prev,
      isFollowing: nextFollowing,
      followersCount: nextFollowing
        ? prev.followersCount + 1
        : Math.max(0, prev.followersCount - 1),
    }));

    showToast(
      nextFollowing
        ? `You are now following ${channel.name}!`
        : `Unfollowed ${channel.name}`
    );

    if (cloudActive) {
      toggleCloudChannelFollow(nextFollowing ? 1 : -1)
        .then((serverCount) => {
          if (typeof serverCount === 'number') {
            setChannel((prev) => ({ ...prev, followersCount: serverCount }));
          }
          notifyOtherTabs();
        })
        .catch(() => {});
    }
  };

  const handleToggleLike = (itemId) => {
    const target = items.find((it) => it.id === itemId);
    if (!target) return;
    const nextLiked = !target.liked;

    const likedSet = getVisitorLikedIds();
    if (nextLiked) likedSet.add(itemId);
    else likedSet.delete(itemId);
    saveVisitorLikedIds(likedSet);

    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              liked: nextLiked,
              likes: nextLiked ? it.likes + 1 : Math.max(0, it.likes - 1),
            }
          : it
      )
    );

    if (cloudActive) {
      toggleCloudItemLike(itemId, nextLiked ? 1 : -1)
        .then((serverLikes) => {
          if (typeof serverLikes === 'number') {
            setItems((prev) =>
              prev.map((it) =>
                it.id === itemId ? { ...it, likes: serverLikes } : it
              )
            );
          }
          notifyOtherTabs();
        })
        .catch(() => {});
    }
  };

  const handleShareChannel = async () => {
    const shareUrl = `${window.location.origin}/`;
    const shareData = {
      title: channel.name,
      text: `${channel.name} — Ladies & Boys Fashion Channel`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Channel link copy ho gaya!');
      }
    } catch {
      // User dismissed share sheet
    }
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setActiveCollection('all');
  };

  const handleResetFilters = () => {
    setActiveCategory('all');
    setActiveCollection('all');
    setActiveSize('all');
  };

  // Admin auth & navigation handlers
  const handleUnlockAdmin = () => {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    } catch {
      // ignore
    }
    setAdminUnlocked(true);
  };

  const handleLockAdmin = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
    setAdminUnlocked(false);
    showToast('Admin Panel lock ho gaya');
  };

  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
  };

  // Admin data handlers (Cloud-aware)
  const handleAddItems = async (newItems) => {
    let finalItems = newItems;
    if (cloudActive) {
      finalItems = await Promise.all(
        newItems.map(async (it) => ({
          ...it,
          image: await uploadImageToCloud(it.image, 'items'),
        }))
      );
      await insertCloudItems(finalItems);
    }

    setItems((prev) => [...finalItems, ...prev]);

    const firstItem = finalItems[0];
    if (firstItem?.collectionId) {
      const targetCol = collections.find((c) => c.id === firstItem.collectionId);
      if (targetCol && !targetCol.cover) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === firstItem.collectionId
              ? { ...c, cover: firstItem.image }
              : c
          )
        );
        if (cloudActive) {
          await updateCloudCollection(firstItem.collectionId, {
            cover: firstItem.image,
          });
        }
      }
    }

    if (cloudActive) notifyOtherTabs();
  };

  const handleUpdateItem = async (id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
    if (cloudActive) {
      try {
        await updateCloudItem(id, patch);
        notifyOtherTabs();
      } catch {
        showToast('Cloud update karne me error aaya');
      }
    }
  };

  const handleDeleteItem = async (id) => {
    const existing = items.find((it) => it.id === id);
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedPhotoId === id) setSelectedPhotoId(null);

    if (cloudActive) {
      try {
        await deleteCloudItem(id, existing?.image);
        notifyOtherTabs();
      } catch {
        showToast('Cloud se delete karne me error aaya');
        return;
      }
    }
    showToast('Photo delete ho gayi');
  };

  const handleAddCollection = async ({ name, category, cover }) => {
    let finalCover = cover || '';
    if (cloudActive && finalCover.startsWith('data:')) {
      finalCover = await uploadImageToCloud(finalCover, 'covers');
    }

    const created = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name,
      category: category || 'both',
      cover: finalCover,
    };

    if (cloudActive) {
      await insertCloudCollection(created, Date.now());
      notifyOtherTabs();
    }

    setCollections((prev) => [...prev, created]);
    showToast(`"${name}" collection add ho gaya!`);
    return created;
  };

  const handleDeleteCollection = async (id) => {
    const existing = collections.find((c) => c.id === id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (activeCollection === id) setActiveCollection('all');

    if (cloudActive) {
      try {
        await deleteCloudCollection(id, existing?.cover);
        notifyOtherTabs();
      } catch {
        showToast('Collection delete karne me cloud error aaya');
        return;
      }
    }
    showToast('Collection delete ho gaya');
  };

  const handleUpdateChannel = async (nextChannel) => {
    let finalChannel = { ...nextChannel };
    if (cloudActive) {
      if (finalChannel.avatar?.startsWith('data:')) {
        finalChannel.avatar = await uploadImageToCloud(
          finalChannel.avatar,
          'channel'
        );
      }
      if (finalChannel.banner?.startsWith('data:')) {
        finalChannel.banner = await uploadImageToCloud(
          finalChannel.banner,
          'channel'
        );
      }
      await saveCloudChannel(finalChannel);
      notifyOtherTabs();
    }
    setChannel(finalChannel);
  };

  const handleExportBackup = () => {
    const payload = JSON.stringify(
      { channel, collections, items, exportedAt: new Date().toISOString() },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fashion-channel-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup file download ho gayi!');
  };

  const handleImportBackup = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const nextChannel = parsed.channel || channel;
        const nextCollections = Array.isArray(parsed.collections)
          ? parsed.collections
          : collections;
        const nextItems = Array.isArray(parsed.items) ? parsed.items : items;

        if (cloudActive) {
          showToast('Backup cloud par restore ho raha hai...');
          await replaceAllCloudData({
            channel: nextChannel,
            collections: nextCollections,
            items: nextItems,
          });
          notifyOtherTabs();
        }

        setChannel(nextChannel);
        setCollections(nextCollections);
        setItems(nextItems);
        showToast('Backup restore ho gaya!');
      } catch {
        showToast('Invalid backup JSON file ya restore error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = async () => {
    if (cloudActive) {
      try {
        await replaceAllCloudData({
          channel: DEFAULT_CHANNEL,
          collections: DEFAULT_COLLECTIONS,
          items: DEFAULT_ITEMS,
        });
      } catch {
        showToast('Cloud reset karne me error aaya');
        return;
      }
    } else {
      await dbClear();
    }
    setChannel(DEFAULT_CHANNEL);
    setCollections(DEFAULT_COLLECTIONS);
    setItems(DEFAULT_ITEMS);
    handleResetFilters();
    notifyOtherTabs();
    showToast('Demo data reset ho gaya!');
  };

  // Dedicated Admin Portal Route (/admin)
  if (isAdminRoute) {
    return (
      <>
        <AdminPage
          isUnlocked={adminUnlocked}
          isCloudActive={cloudActive}
          onUnlock={handleUnlockAdmin}
          onLock={handleLockAdmin}
          onGoHome={handleGoHome}
          channel={channel}
          collections={collections}
          items={items}
          counts={counts}
          totalLikes={totalLikes}
          onAddItems={handleAddItems}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onAddCollection={handleAddCollection}
          onDeleteCollection={handleDeleteCollection}
          onUpdateChannel={handleUpdateChannel}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onResetDemo={handleResetDemo}
          showToast={showToast}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  // Clean Public Customer Website Route (/)
  return (
    <>
      <div className="channel-shell">
        <ChannelHeader
          channel={channel}
          totalLikes={totalLikes}
          totalPosts={items.length}
          totalCollections={collections.length}
          onToggleFollow={handleToggleFollow}
          onShareChannel={handleShareChannel}
        />

        <FilterBar
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          activeCollection={activeCollection}
          onCollectionChange={setActiveCollection}
          activeSize={activeSize}
          onSizeChange={setActiveSize}
          collections={collections}
          counts={counts}
          customSizes={customSizes}
        />

        <PhotoGrid
          items={filteredItems}
          onSelectPhoto={setSelectedPhotoId}
          onToggleLike={handleToggleLike}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Photo Lightbox Viewer */}
      <PhotoLightbox
        items={filteredItems}
        selectedId={selectedPhotoId}
        channel={channel}
        collections={collections}
        onClose={() => setSelectedPhotoId(null)}
        onSelectId={setSelectedPhotoId}
        onToggleLike={handleToggleLike}
      />

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
