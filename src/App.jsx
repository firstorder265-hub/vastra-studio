import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ADMINS,
  DEFAULT_CHANNEL,
  DEFAULT_COLLECTIONS,
  DEFAULT_ITEMS,
} from './data/initialData';
import { dbClear, dbGet, dbSet } from './db';
import {
  clearCloudLogs,
  deleteCloudAdmin,
  deleteCloudCollection,
  deleteCloudItem,
  fetchCloudState,
  getVisitorLikedIds,
  insertCloudCollection,
  insertCloudItems,
  insertCloudLog,
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
  upsertCloudAdmin,
} from './cloud';
import ChannelHeader from './components/ChannelHeader';
import FilterBar from './components/FilterBar';
import PhotoGrid from './components/PhotoGrid';
import PhotoLightbox from './components/PhotoLightbox';
import AdminPage from './components/AdminPage';
import SuperAdminPage from './components/SuperAdminPage';

const SYNC_CHANNEL_NAME = 'vastra_fashion_channel_sync';
const ADMIN_SESSION_ID_KEY = 'vastra_admin_session_id';
const SUPERADMIN_SESSION_KEY = 'vastra_superadmin_unlocked';

function getActiveRoute() {
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (
    path === '/superadmin' ||
    path.startsWith('/superadmin/') ||
    path === '/super-admin' ||
    hash === 'superadmin' ||
    hash.startsWith('superadmin/') ||
    hash === 'super-admin'
  ) {
    return 'superadmin';
  }
  if (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    hash === 'admin' ||
    hash.startsWith('admin/')
  ) {
    return 'admin';
  }
  return 'public';
}

export default function App() {
  const [route, setRoute] = useState(getActiveRoute);
  const [ready, setReady] = useState(false);
  const [cloudActive, setCloudActive] = useState(isCloudEnabled);

  const [channel, setChannel] = useState(DEFAULT_CHANNEL);
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [admins, setAdmins] = useState(DEFAULT_ADMINS);
  const [activityLogs, setActivityLogs] = useState([]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [activeCollection, setActiveCollection] = useState('all');
  const [activeSize, setActiveSize] = useState('all');
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);

  const [activeAdminId, setActiveAdminId] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_ID_KEY) || '';
    } catch {
      return '';
    }
  });
  const [superAdminUnlocked, setSuperAdminUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(SUPERADMIN_SESSION_KEY) === '1';
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
    admins: false,
    logs: false,
  });

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? '' : curr));
    }, 2800);
  }, []);

  // Listen to browser navigation (back/forward or hash changes)
  useEffect(() => {
    const syncRoute = () => setRoute(getActiveRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  // Update browser tab title according to active page
  useEffect(() => {
    if (route === 'superadmin') {
      document.title = `Super Admin — ${channel.name}`;
    } else if (route === 'admin') {
      document.title = `Admin Studio — ${channel.name}`;
    } else {
      document.title = `${channel.name} — Ladies & Boys Fashion Channel`;
    }
  }, [route, channel.name]);

  const hydrateFromLocal = useCallback(async (fromSync = false) => {
    const [savedChannel, savedCols, savedItems, savedAdmins, savedLogs] =
      await Promise.all([
        dbGet('channel'),
        dbGet('collections'),
        dbGet('items'),
        dbGet('admins'),
        dbGet('activity_logs'),
      ]);

    if (fromSync) {
      skipPersistRef.current = {
        channel: true,
        collections: true,
        items: true,
        admins: true,
        logs: true,
      };
    }

    const mergedChannel = savedChannel
      ? { ...DEFAULT_CHANNEL, ...savedChannel }
      : DEFAULT_CHANNEL;
    setChannel(mergedChannel);
    setCollections(Array.isArray(savedCols) ? savedCols : DEFAULT_COLLECTIONS);
    setItems(Array.isArray(savedItems) ? savedItems : DEFAULT_ITEMS);
    setAdmins(
      Array.isArray(savedAdmins)
        ? savedAdmins
        : [
            {
              ...DEFAULT_ADMINS[0],
              pin: mergedChannel.adminPin || '1234',
            },
          ]
    );
    setActivityLogs(Array.isArray(savedLogs) ? savedLogs : []);
  }, []);

  const hydrateFromCloud = useCallback(async () => {
    const cloud = await fetchCloudState();
    if (!cloud.initialized) {
      await seedCloudDefaults({
        channel: DEFAULT_CHANNEL,
        collections: DEFAULT_COLLECTIONS,
        items: DEFAULT_ITEMS,
        admins: DEFAULT_ADMINS,
      });
      setChannel(DEFAULT_CHANNEL);
      setCollections(DEFAULT_COLLECTIONS);
      setItems(DEFAULT_ITEMS);
      setAdmins(DEFAULT_ADMINS);
      setActivityLogs([]);
      return;
    }

    setChannel(cloud.channel);
    setCollections(cloud.collections);
    setItems(cloud.items);

    if (Array.isArray(cloud.admins)) {
      if (cloud.admins.length === 0) {
        const seededAdmin = {
          ...DEFAULT_ADMINS[0],
          pin: cloud.channel.adminPin || '1234',
        };
        setAdmins([seededAdmin]);
        upsertCloudAdmin(seededAdmin).catch(() => {});
      } else {
        setAdmins(cloud.admins);
      }
    } else {
      // admin_users table not migrated yet — fallback gracefully using channel.adminPin
      setAdmins([
        {
          ...DEFAULT_ADMINS[0],
          pin: cloud.channel.adminPin || '1234',
        },
      ]);
    }

    if (Array.isArray(cloud.logs)) {
      setActivityLogs(cloud.logs);
    }
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

  // Cross-tab live synchronization
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

  useEffect(() => {
    if (!ready || cloudActive) return;
    if (skipPersistRef.current.admins) {
      skipPersistRef.current.admins = false;
      return;
    }
    dbSet('admins', admins).then(notifyOtherTabs);
  }, [admins, ready, cloudActive, notifyOtherTabs]);

  useEffect(() => {
    if (!ready || cloudActive) return;
    if (skipPersistRef.current.logs) {
      skipPersistRef.current.logs = false;
      return;
    }
    dbSet('activity_logs', activityLogs).then(notifyOtherTabs);
  }, [activityLogs, ready, cloudActive, notifyOtherTabs]);

  // Activity Log Recorder
  const recordActivity = useCallback(
    ({ actor, action, details, thumbnail = '' }) => {
      const entry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        actorName: actor?.name || 'Admin',
        actorRole: actor?.role || 'admin',
        action,
        details,
        thumbnail,
        createdAt: Date.now(),
      };
      setActivityLogs((prev) => [entry, ...prev].slice(0, 300));
      if (cloudActive) {
        insertCloudLog(entry);
      }
    },
    [cloudActive]
  );

  // Resolve active staff admin dynamically (immediately revokes if blocked/deleted)
  const activeAdmin = useMemo(() => {
    if (!activeAdminId) return null;
    const found = admins.find((a) => a.id === activeAdminId);
    if (!found || !found.active) return null;
    return found;
  }, [activeAdminId, admins]);

  // Counts & filters
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

  // Auth & Navigation
  const handleAdminLoginSuccess = (adminObj) => {
    try {
      sessionStorage.setItem(ADMIN_SESSION_ID_KEY, adminObj.id);
    } catch {
      // ignore
    }
    setActiveAdminId(adminObj.id);
    recordActivity({
      actor: { name: adminObj.name, role: 'admin' },
      action: 'login',
      details: `${adminObj.name} (${adminObj.roleLabel || 'Staff Admin'}) ne Admin Studio me login kiya`,
    });
    showToast(`Welcome, ${adminObj.name}!`);
  };

  const handleLockAdmin = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_ID_KEY);
    } catch {
      // ignore
    }
    setActiveAdminId('');
    showToast('Admin logout ho gaya');
  };

  const handleUnlockSuperAdmin = () => {
    try {
      sessionStorage.setItem(SUPERADMIN_SESSION_KEY, '1');
    } catch {
      // ignore
    }
    setSuperAdminUnlocked(true);
    recordActivity({
      actor: { name: 'Super Admin', role: 'superadmin' },
      action: 'login',
      details: 'Super Admin ne Owner Command Center unlock kiya',
    });
  };

  const handleLockSuperAdmin = () => {
    try {
      sessionStorage.removeItem(SUPERADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
    setSuperAdminUnlocked(false);
    showToast('Super Admin lock ho gaya');
  };

  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    setRoute('public');
  };

  // Shared Media Handlers (used by both Admin & Super Admin)
  const handleAddItems = async (newItems, actor) => {
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
    const colObj = collections.find((c) => c.id === firstItem?.collectionId);
    if (firstItem?.collectionId && colObj && !colObj.cover) {
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

    recordActivity({
      actor,
      action: 'upload',
      details: `${finalItems.length} ${
        firstItem?.category === 'boys' ? 'Boys' : 'Ladies'
      } photo${finalItems.length > 1 ? 's' : ''} upload ki (${
        colObj ? colObj.name : 'General'
      })`,
      thumbnail: firstItem?.image || '',
    });

    if (cloudActive) notifyOtherTabs();
  };

  const handleUpdateItem = async (id, patch, actor) => {
    const existing = items.find((it) => it.id === id);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
    if (cloudActive) {
      try {
        await updateCloudItem(id, patch);
        notifyOtherTabs();
      } catch {
        showToast('Cloud update karne me error aaya');
        return;
      }
    }
    const colObj = collections.find(
      (c) => c.id === (patch.collectionId || existing?.collectionId)
    );
    recordActivity({
      actor,
      action: 'edit',
      details: `Photo details edit ki (${
        patch.category === 'boys' ? 'Boys' : 'Ladies'
      } • ${colObj ? colObj.name : 'General'})`,
      thumbnail: existing?.image || '',
    });
  };

  const handleDeleteItem = async (id, actor) => {
    const existing = items.find((it) => it.id === id);
    const colObj = collections.find((c) => c.id === existing?.collectionId);
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

    recordActivity({
      actor,
      action: 'delete',
      details: `${existing?.category === 'boys' ? 'Boys' : 'Ladies'} photo delete ki (${
        colObj ? colObj.name : 'General'
      })`,
      thumbnail: existing?.image?.startsWith('http') ? '' : '',
    });
    showToast('Photo delete ho gayi');
  };

  const handleAddCollection = async ({ name, category, cover }, actor) => {
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
    recordActivity({
      actor,
      action: 'collection_add',
      details: `Naya collection "${name}" (${(category || 'both').toUpperCase()}) banaya`,
      thumbnail: finalCover,
    });
    showToast(`"${name}" collection add ho gaya!`);
    return created;
  };

  const handleDeleteCollection = async (id, actor) => {
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
    recordActivity({
      actor,
      action: 'collection_delete',
      details: `Collection "${existing?.name || id}" delete kiya`,
    });
    showToast('Collection delete ho gaya');
  };

  // Super Admin Exclusive Handlers
  const handleAddAdmin = async ({ name, roleLabel, pin, permissions }) => {
    const created = {
      id: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name,
      roleLabel: roleLabel || 'Staff Admin',
      pin,
      active: true,
      permissions,
      createdAt: Date.now(),
    };
    if (cloudActive) {
      await upsertCloudAdmin(created);
      notifyOtherTabs();
    }
    setAdmins((prev) => [...prev, created]);
    recordActivity({
      actor: { name: 'Super Admin', role: 'superadmin' },
      action: 'admin_change',
      details: `Naya Staff Admin "${name}" (${created.roleLabel}) add kiya`,
    });
    showToast(`Staff Admin "${name}" add ho gaya!`);
  };

  const handleUpdateAdmin = async (id, patch) => {
    const existing = admins.find((a) => a.id === id);
    if (!existing) return;
    const updated = { ...existing, ...patch };
    if (cloudActive) {
      await upsertCloudAdmin(updated);
      notifyOtherTabs();
    }
    setAdmins((prev) => prev.map((a) => (a.id === id ? updated : a)));

    let detailText = `Staff Admin "${updated.name}" ki details/permissions update ki`;
    if (patch.active === false) {
      detailText = `Staff Admin "${updated.name}" ko BLOCK kiya`;
    } else if (patch.active === true && existing.active === false) {
      detailText = `Staff Admin "${updated.name}" ko UNBLOCK kiya`;
    }

    recordActivity({
      actor: { name: 'Super Admin', role: 'superadmin' },
      action: 'admin_change',
      details: detailText,
    });
    showToast(
      patch.active === false
        ? `${updated.name} block ho gaya`
        : patch.active === true && existing.active === false
        ? `${updated.name} unblock ho gaya`
        : `${updated.name} update ho gaya!`
    );
  };

  const handleDeleteAdmin = async (id) => {
    const existing = admins.find((a) => a.id === id);
    if (!existing) return;
    if (cloudActive) {
      await deleteCloudAdmin(id);
      notifyOtherTabs();
    }
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    recordActivity({
      actor: { name: 'Super Admin', role: 'superadmin' },
      action: 'admin_change',
      details: `Staff Admin "${existing.name}" ko delete kiya`,
    });
    showToast(`"${existing.name}" delete ho gaya`);
  };

  const handleClearLogs = async () => {
    if (cloudActive) {
      try {
        await clearCloudLogs();
        notifyOtherTabs();
      } catch {
        showToast('Cloud logs clear karne me error aaya');
        return;
      }
    }
    setActivityLogs([]);
    showToast('Activity logs clear ho gaye');
  };

  const handleUpdateChannel = async (
    nextChannel,
    actor = { name: 'Super Admin', role: 'superadmin' },
    logDetails = 'Channel settings update ki'
  ) => {
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
    recordActivity({
      actor,
      action: 'settings',
      details: logDetails,
    });
  };

  const handleExportBackup = () => {
    const payload = JSON.stringify(
      {
        channel,
        collections,
        items,
        admins,
        activityLogs,
        exportedAt: new Date().toISOString(),
      },
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
        const nextChannel = parsed.channel
          ? { ...DEFAULT_CHANNEL, ...parsed.channel }
          : channel;
        const nextCollections = Array.isArray(parsed.collections)
          ? parsed.collections
          : collections;
        const nextItems = Array.isArray(parsed.items) ? parsed.items : items;
        const nextAdmins = Array.isArray(parsed.admins) ? parsed.admins : admins;

        if (cloudActive) {
          showToast('Backup cloud par restore ho raha hai...');
          await replaceAllCloudData({
            channel: nextChannel,
            collections: nextCollections,
            items: nextItems,
            admins: nextAdmins,
          });
          notifyOtherTabs();
        }

        setChannel(nextChannel);
        setCollections(nextCollections);
        setItems(nextItems);
        setAdmins(nextAdmins);
        recordActivity({
          actor: { name: 'Super Admin', role: 'superadmin' },
          action: 'settings',
          details: 'Backup JSON restore kiya',
        });
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
          admins: DEFAULT_ADMINS,
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
    setAdmins(DEFAULT_ADMINS);
    handleResetFilters();
    recordActivity({
      actor: { name: 'Super Admin', role: 'superadmin' },
      action: 'settings',
      details: 'Demo data reset kiya',
    });
    notifyOtherTabs();
    showToast('Demo data reset ho gaya!');
  };

  // ROUTE 1: Dedicated Super Admin Command Center (/superadmin or /#/superadmin)
  if (route === 'superadmin') {
    return (
      <>
        <SuperAdminPage
          isUnlocked={superAdminUnlocked}
          isCloudActive={cloudActive}
          onUnlock={handleUnlockSuperAdmin}
          onLock={handleLockSuperAdmin}
          onGoHome={handleGoHome}
          channel={channel}
          collections={collections}
          items={items}
          admins={admins}
          activityLogs={activityLogs}
          counts={counts}
          totalLikes={totalLikes}
          onAddItems={handleAddItems}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onAddCollection={handleAddCollection}
          onDeleteCollection={handleDeleteCollection}
          onUpdateChannel={handleUpdateChannel}
          onAddAdmin={handleAddAdmin}
          onUpdateAdmin={handleUpdateAdmin}
          onDeleteAdmin={handleDeleteAdmin}
          onClearLogs={handleClearLogs}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onResetDemo={handleResetDemo}
          showToast={showToast}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  // ROUTE 2: Dedicated Staff Admin Portal (/admin or /#/admin)
  if (route === 'admin') {
    return (
      <>
        <AdminPage
          activeAdmin={activeAdmin}
          isCloudActive={cloudActive}
          admins={admins}
          channel={channel}
          collections={collections}
          items={items}
          counts={counts}
          totalLikes={totalLikes}
          onLoginSuccess={handleAdminLoginSuccess}
          onLock={handleLockAdmin}
          onGoHome={handleGoHome}
          onAddItems={handleAddItems}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onAddCollection={handleAddCollection}
          onDeleteCollection={handleDeleteCollection}
          showToast={showToast}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  // ROUTE 3: Clean Public Customer Website (/)
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
