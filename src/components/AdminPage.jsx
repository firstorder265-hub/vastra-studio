import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Cloud,
  Download,
  Edit3,
  ExternalLink,
  FolderPlus,
  HardDrive,
  Heart,
  ImagePlus,
  Images,
  Lock,
  LogOut,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { ADULT_SIZES, KIDS_SIZES, formatCount } from '../data/initialData';
import { compressImageFile } from '../db';

export default function AdminPage({
  isUnlocked,
  isCloudActive,
  onUnlock,
  onLock,
  onGoHome,
  channel,
  collections,
  items,
  counts,
  totalLikes,
  onAddItems,
  onUpdateItem,
  onDeleteItem,
  onAddCollection,
  onDeleteCollection,
  onUpdateChannel,
  onExportBackup,
  onImportBackup,
  onResetDemo,
  showToast,
}) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState('upload');

  // Upload Tab State
  const [pendingImages, setPendingImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [category, setCategory] = useState('ladies');
  const [collectionId, setCollectionId] = useState(collections[0]?.id || '');
  const [inlineColName, setInlineColName] = useState('');
  const [showInlineCol, setShowInlineCol] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState([...ADULT_SIZES]);
  const [allSizesFlag, setAllSizesFlag] = useState(true);
  const [customSizeText, setCustomSizeText] = useState('');

  // Collections Tab State
  const [newColName, setNewColName] = useState('');
  const [newColCategory, setNewColCategory] = useState('both');
  const [newColCover, setNewColCover] = useState('');

  // Manage Photos Edit State
  const [editingItem, setEditingItem] = useState(null);
  const [manageFilter, setManageFilter] = useState('all');

  // Settings Tab State
  const [settingsDraft, setSettingsDraft] = useState({ ...channel });
  const [newPinDraft, setNewPinDraft] = useState('');
  const [confirmPinDraft, setConfirmPinDraft] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    setSettingsDraft({ ...channel });
  }, [channel]);

  useEffect(() => {
    if (
      collections.length > 0 &&
      !collections.some((c) => c.id === collectionId)
    ) {
      setCollectionId(collections[0].id);
    }
  }, [collections, collectionId]);

  const currentPin = channel.adminPin || '1234';

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === currentPin) {
      setPinError('');
      setPinInput('');
      setSettingsDraft({ ...channel });
      onUnlock();
    } else {
      setPinError('Galat Password! Dobara koshish karein.');
    }
  };

  const processFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const converted = await Promise.all(
        files.map((f) => compressImageFile(f, 1400, 0.86))
      );
      setPendingImages((prev) => [...prev, ...converted]);
    } catch {
      showToast('Photo process karne me error aaya');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSize = (size) => {
    setSelectedSizes((prev) => {
      const next = prev.includes(size)
        ? prev.filter((s) => s !== size)
        : [...prev, size];
      const hasAllAdult = ADULT_SIZES.every((s) => next.includes(s));
      setAllSizesFlag(hasAllAdult);
      return next;
    });
  };

  const selectAllAdultSizes = () => {
    setSelectedSizes((prev) => Array.from(new Set([...prev, ...ADULT_SIZES])));
    setAllSizesFlag(true);
  };

  const selectAllKidsSizes = () => {
    setSelectedSizes((prev) => Array.from(new Set([...prev, ...KIDS_SIZES])));
  };

  const selectEverySize = () => {
    setSelectedSizes([...ADULT_SIZES, ...KIDS_SIZES]);
    setAllSizesFlag(true);
  };

  const clearSizes = () => {
    setSelectedSizes([]);
    setAllSizesFlag(false);
  };

  const handleAddCustomSize = () => {
    const cleaned = customSizeText.trim();
    if (!cleaned) return;
    if (!selectedSizes.includes(cleaned)) {
      setSelectedSizes((prev) => [...prev, cleaned]);
    }
    setCustomSizeText('');
  };

  const handleQuickCreateCollection = async () => {
    const trimmed = inlineColName.trim();
    if (!trimmed) return;
    try {
      const created = await onAddCollection({
        name: trimmed,
        category,
        cover: pendingImages[0] || '',
      });
      if (created?.id) setCollectionId(created.id);
      setInlineColName('');
      setShowInlineCol(false);
    } catch {
      showToast('Collection add karne me error aaya');
    }
  };

  const handlePublishPhotos = async () => {
    if (pendingImages.length === 0) {
      showToast('Pehle kam se kam ek photo select karein!');
      return;
    }
    const finalSizes =
      selectedSizes.length > 0 ? selectedSizes : [...ADULT_SIZES];
    const finalColId = collectionId || collections[0]?.id || '';

    const newItems = pendingImages.map((imgData, idx) => ({
      id: `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      image: imgData,
      category,
      collectionId: finalColId,
      sizes: finalSizes,
      allSizes: allSizesFlag || ADULT_SIZES.every((s) => finalSizes.includes(s)),
      likes: 0,
      liked: false,
      createdAt: Date.now() + idx,
    }));

    setIsPublishing(true);
    try {
      await onAddItems(newItems);
      setPendingImages([]);
      showToast(
        `${newItems.length} photo${newItems.length > 1 ? 's' : ''} channel par publish ho gayi!`
      );
    } catch {
      showToast('Photo upload karne me error aaya — dobara try karein');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateCollectionTab = async (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    try {
      await onAddCollection({
        name: newColName.trim(),
        category: newColCategory,
        cover: newColCover,
      });
      setNewColName('');
      setNewColCover('');
      setNewColCategory('both');
    } catch {
      showToast('Collection save karne me error aaya');
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImageFile(file, 600, 0.84);
    setNewColCover(dataUrl);
  };

  const handleChannelAssetUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxDim = field === 'banner' ? 1600 : 600;
    const dataUrl = await compressImageFile(file, maxDim, 0.86);
    setSettingsDraft((prev) => ({ ...prev, [field]: dataUrl }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await onUpdateChannel({
        ...channel,
        name: (settingsDraft.name ?? '').trim() || channel.name,
        handle: (settingsDraft.handle ?? '').trim() || channel.handle,
        bio: (settingsDraft.bio ?? '').trim(),
        whatsapp: (settingsDraft.whatsapp ?? '').trim(),
        verified: Boolean(settingsDraft.verified),
        avatar: settingsDraft.avatar,
        banner: settingsDraft.banner,
      });
      showToast('Channel settings save ho gayi!');
    } catch {
      showToast('Settings save karne me error aaya');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleConfirmPinChange = async (e) => {
    e.preventDefault();
    const nextPin = newPinDraft.trim();
    const confirmPin = confirmPinDraft.trim();
    if (!nextPin) {
      setPinChangeMsg({
        type: 'error',
        text: 'Pehle naya Admin PIN / Password daalein.',
      });
      return;
    }
    if (nextPin !== confirmPin) {
      setPinChangeMsg({
        type: 'error',
        text: 'Dono PIN match nahi kar rahe! Dobara check karein.',
      });
      return;
    }
    try {
      await onUpdateChannel({
        ...channel,
        adminPin: nextPin,
      });
      setNewPinDraft('');
      setConfirmPinDraft('');
      setPinChangeMsg({
        type: 'success',
        text: 'Admin PIN / Password successfully change ho gaya!',
      });
      showToast('Naya Admin PIN confirm & save ho gaya!');
    } catch {
      setPinChangeMsg({
        type: 'error',
        text: 'Cloud par PIN update karne me error aaya.',
      });
    }
  };

  const handleSaveEditedItem = () => {
    if (!editingItem) return;
    onUpdateItem(editingItem.id, {
      category: editingItem.category,
      collectionId: editingItem.collectionId,
      sizes: editingItem.sizes.length ? editingItem.sizes : [...ADULT_SIZES],
      allSizes: editingItem.allSizes,
    });
    setEditingItem(null);
    showToast('Photo details update ho gayi!');
  };

  const filteredManageItems = items.filter((it) =>
    manageFilter === 'all' ? true : it.category === manageFilter
  );

  // Dedicated Full-Page Login Gate
  if (!isUnlocked) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-brand">
            <img
              src={channel.avatar}
              alt={channel.name}
              className="admin-login-avatar"
            />
            <span className="admin-login-badge">
              <ShieldCheck size={14} />
              Admin Portal
            </span>
          </div>

          <form className="pin-gate admin-login-form" onSubmit={handlePinSubmit}>
            <div className="admin-lock-circle">
              <Lock size={26} color="var(--gold)" />
            </div>
            <h1 style={{ marginBottom: 18 }}>{channel.name} Admin</h1>
            <input
              type="password"
              className="pin-input"
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              autoFocus
            />
            {pinError && <div className="pin-error">{pinError}</div>}
            <button
              type="submit"
              className="primary-btn"
              style={{ width: '100%' }}
            >
              Unlock Admin Studio
            </button>
          </form>

          <div className="admin-login-footer">
            <a
              href="/"
              className="admin-back-link"
              onClick={(e) => {
                e.preventDefault();
                onGoHome();
              }}
            >
              <ArrowLeft size={15} />
              <span>Public Website par wapas jayein</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-root">
      {/* Sticky Top Admin Bar */}
      <header className="admin-page-topbar">
        <div className="admin-page-topbar-inner">
          <div className="admin-header-title">
            <img
              src={channel.avatar}
              alt={channel.name}
              className="admin-topbar-avatar"
            />
            <div>
              <div className="admin-topbar-heading">
                <ShieldCheck size={17} color="#d8b572" />
                <h1>{channel.name} — Admin Studio</h1>
              </div>
              <span>Separate Admin Dashboard • Live sync with public channel</span>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <span
              className={`storage-status-pill ${isCloudActive ? 'cloud' : 'local'}`}
              title={
                isCloudActive
                  ? 'Connected to Supabase Cloud — Sabhi customers ko live dikhega'
                  : 'Local Browser Mode — Render par live karne ke liye Supabase keys add karein'
              }
            >
              {isCloudActive ? <Cloud size={14} /> : <HardDrive size={14} />}
              <span>{isCloudActive ? 'Cloud Live' : 'Local Mode'}</span>
            </span>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="admin-topbar-btn"
              title="Open Public Website in New Tab"
            >
              <ExternalLink size={15} />
              <span>View Website</span>
            </a>
            <button
              type="button"
              className="admin-topbar-btn danger"
              onClick={onLock}
              title="Lock Admin Panel"
            >
              <LogOut size={15} />
              <span>Lock</span>
            </button>
          </div>
        </div>
      </header>

      <main className="admin-page-shell">
        {/* Live Channel Overview Stats */}
        <section className="admin-stats-grid" aria-label="Channel summary">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <Images size={18} />
            </div>
            <div>
              <div className="admin-stat-value">{counts.all}</div>
              <div className="admin-stat-label">
                Total Photos ({counts.ladies} Ladies • {counts.boys} Boys)
              </div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon gold">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="admin-stat-value">{collections.length}</div>
              <div className="admin-stat-label">Collections</div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <Users size={18} />
            </div>
            <div>
              <div className="admin-stat-value">
                {formatCount(channel.followersCount)}
              </div>
              <div className="admin-stat-label">Followers</div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon heart">
              <Heart size={18} />
            </div>
            <div>
              <div className="admin-stat-value">{formatCount(totalLikes)}</div>
              <div className="admin-stat-label">Total Likes</div>
            </div>
          </div>
        </section>

        {/* Main Workspace Card */}
        <section className="admin-workspace-card">
          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={15} />
              <span>Upload Photos</span>
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === 'collections' ? 'active' : ''}`}
              onClick={() => setActiveTab('collections')}
            >
              <FolderPlus size={15} />
              <span>Collections ({collections.length})</span>
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              <Images size={15} />
              <span>Manage Photos ({items.length})</span>
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => {
                setSettingsDraft({ ...channel });
                setActiveTab('settings');
              }}
            >
              <Settings size={15} />
              <span>Channel Settings</span>
            </button>
          </div>

          <div className="admin-body admin-page-body">
            {/* TAB 1: UPLOAD PHOTOS */}
            {activeTab === 'upload' && (
              <>
                <div className="form-section">
                  <span className="form-label">
                    1. Kapdo ki Photos Select Karein (1 ya Multiple)
                  </span>
                  <div
                    className={`dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      processFiles(e.dataTransfer.files);
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        processFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <ImagePlus
                      size={32}
                      style={{ margin: '0 auto', color: 'var(--gold)' }}
                    />
                    <p>
                      {isProcessing
                        ? 'Photos optimize ho rahi hain...'
                        : 'Click karein ya Photos yahan drag karein'}
                    </p>
                    <span>
                      JPG, PNG, WEBP supported • Gallery me sirf clean photo
                      dikhegi
                    </span>
                  </div>

                  {pendingImages.length > 0 && (
                    <div className="upload-previews">
                      {pendingImages.map((src, idx) => (
                        <div key={idx} className="upload-preview-card">
                          <img src={src} alt={`Upload preview ${idx + 1}`} />
                          <button
                            type="button"
                            className="preview-remove"
                            onClick={() =>
                              setPendingImages((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <span className="form-label">2. Category Chunein</span>
                  <div className="segment-row">
                    <button
                      type="button"
                      className={`segment-btn ${
                        category === 'ladies' ? 'active' : ''
                      }`}
                      onClick={() => setCategory('ladies')}
                    >
                      Ladies Collection
                    </button>
                    <button
                      type="button"
                      className={`segment-btn ${
                        category === 'boys' ? 'active' : ''
                      }`}
                      onClick={() => setCategory('boys')}
                    >
                      Boys Collection
                    </button>
                  </div>
                </div>

                <div className="form-section">
                  <div className="size-toggle-header">
                    <span className="form-label">
                      3. Collection Select ya Add Karein
                    </span>
                    <button
                      type="button"
                      className="mini-pill-btn"
                      onClick={() => setShowInlineCol((v) => !v)}
                    >
                      <Plus size={12} style={{ display: 'inline' }} /> New
                      Collection
                    </button>
                  </div>

                  {showInlineCol && (
                    <div className="input-row">
                      <input
                        type="text"
                        className="text-input"
                        placeholder="Naye collection ka naam (e.g. Wedding Edit)"
                        value={inlineColName}
                        onChange={(e) => setInlineColName(e.target.value)}
                      />
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={handleQuickCreateCollection}
                      >
                        Add
                      </button>
                    </div>
                  )}

                  <select
                    className="select-input"
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                  >
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name} ({col.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <div className="size-toggle-header">
                    <span className="form-label">4. Available Sizes</span>
                    <div className="quick-size-actions">
                      <button
                        type="button"
                        className={`mini-pill-btn ${
                          allSizesFlag ? 'active' : ''
                        }`}
                        onClick={selectAllAdultSizes}
                      >
                        All Adult Sizes
                      </button>
                      <button
                        type="button"
                        className="mini-pill-btn"
                        onClick={selectAllKidsSizes}
                      >
                        + Kids Sizes
                      </button>
                      <button
                        type="button"
                        className="mini-pill-btn"
                        onClick={selectEverySize}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="mini-pill-btn"
                        onClick={clearSizes}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="size-selector-grid">
                    {Array.from(
                      new Set([...ADULT_SIZES, ...KIDS_SIZES, ...selectedSizes])
                    ).map((size) => {
                      const isSelected = selectedSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          className={`size-select-chip ${
                            isSelected ? 'selected' : ''
                          }`}
                          onClick={() => toggleSize(size)}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>

                  <div className="input-row" style={{ marginTop: 6 }}>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Custom size add karein (e.g. 4XL, 28, 30, 32)"
                      value={customSizeText}
                      onChange={(e) => setCustomSizeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSize();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleAddCustomSize}
                    >
                      Add Size
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-btn"
                  disabled={
                    pendingImages.length === 0 || isProcessing || isPublishing
                  }
                  onClick={handlePublishPhotos}
                >
                  <Upload size={17} />
                  <span>
                    {isPublishing
                      ? isCloudActive
                        ? 'Cloud par upload ho raha hai...'
                        : 'Publishing...'
                      : `Publish ${
                          pendingImages.length > 0
                            ? `${pendingImages.length} Photo${
                                pendingImages.length > 1 ? 's' : ''
                              }`
                            : 'to Channel'
                        }`}
                  </span>
                </button>
              </>
            )}

            {/* TAB 2: COLLECTIONS */}
            {activeTab === 'collections' && (
              <>
                <form
                  className="form-section"
                  onSubmit={handleCreateCollectionTab}
                  style={{
                    padding: 16,
                    background: 'var(--bg)',
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                  }}
                >
                  <span className="form-label">Naya Collection Banayein</span>
                  <div className="settings-grid">
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Collection Name (e.g. Winter Jackets, Bridal)"
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      required
                    />
                    <select
                      className="select-input"
                      value={newColCategory}
                      onChange={(e) => setNewColCategory(e.target.value)}
                    >
                      <option value="both">Both (Ladies &amp; Boys)</option>
                      <option value="ladies">Ladies Only</option>
                      <option value="boys">Boys Only</option>
                    </select>
                  </div>

                  <div
                    className="upload-inline-row"
                    style={{ marginTop: 6, justifyContent: 'space-between' }}
                  >
                    <div className="upload-inline-row">
                      {newColCover && (
                        <img
                          src={newColCover}
                          alt="Cover preview"
                          className="upload-inline-preview"
                        />
                      )}
                      <label className="file-btn-label">
                        <ImagePlus size={15} />
                        <span>
                          {newColCover
                            ? 'Change Cover'
                            : 'Cover Photo (Optional)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                        />
                      </label>
                    </div>

                    <button type="submit" className="primary-btn">
                      <Plus size={16} />
                      <span>Add Collection</span>
                    </button>
                  </div>
                </form>

                <div className="form-section">
                  <span className="form-label">Existing Collections</span>
                  <div className="collections-list">
                    {collections.map((col) => {
                      const count = items.filter(
                        (it) => it.collectionId === col.id
                      ).length;
                      return (
                        <div key={col.id} className="collection-admin-card">
                          {col.cover ? (
                            <img src={col.cover} alt={col.name} />
                          ) : (
                            <div
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: '50%',
                                background: 'var(--surface-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                              }}
                            >
                              {col.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="collection-admin-meta">
                            <h4>{col.name}</h4>
                            <p>
                              {col.category.toUpperCase()} • {count} photos
                            </p>
                          </div>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => onDeleteCollection(col.id)}
                            title="Delete Collection"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* TAB 3: MANAGE PHOTOS */}
            {activeTab === 'photos' && (
              <>
                {editingItem ? (
                  <div
                    className="form-section"
                    style={{
                      padding: 16,
                      background: 'var(--bg)',
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="size-toggle-header">
                      <span className="form-label">Edit Photo Details</span>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ height: 32 }}
                        onClick={() => setEditingItem(null)}
                      >
                        Cancel
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                        flexWrap: 'wrap',
                        alignItems: 'flex-start',
                      }}
                    >
                      <img
                        src={editingItem.image}
                        alt="Edit preview"
                        style={{
                          width: 110,
                          aspectRatio: '3/4',
                          objectFit: 'cover',
                          borderRadius: 10,
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          minWidth: 220,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        <div className="segment-row">
                          <button
                            type="button"
                            className={`segment-btn ${
                              editingItem.category === 'ladies' ? 'active' : ''
                            }`}
                            onClick={() =>
                              setEditingItem({
                                ...editingItem,
                                category: 'ladies',
                              })
                            }
                          >
                            Ladies
                          </button>
                          <button
                            type="button"
                            className={`segment-btn ${
                              editingItem.category === 'boys' ? 'active' : ''
                            }`}
                            onClick={() =>
                              setEditingItem({
                                ...editingItem,
                                category: 'boys',
                              })
                            }
                          >
                            Boys
                          </button>
                        </div>

                        <select
                          className="select-input"
                          value={editingItem.collectionId}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              collectionId: e.target.value,
                            })
                          }
                        >
                          {collections.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>

                        <div className="size-selector-grid">
                          {Array.from(
                            new Set([
                              ...ADULT_SIZES,
                              ...KIDS_SIZES,
                              ...(editingItem.sizes || []),
                            ])
                          ).map((size) => {
                            const active = (editingItem.sizes || []).includes(
                              size
                            );
                            return (
                              <button
                                key={size}
                                type="button"
                                className={`size-select-chip ${
                                  active ? 'selected' : ''
                                }`}
                                onClick={() => {
                                  const nextSizes = active
                                    ? editingItem.sizes.filter(
                                        (s) => s !== size
                                      )
                                    : [...editingItem.sizes, size];
                                  setEditingItem({
                                    ...editingItem,
                                    sizes: nextSizes,
                                    allSizes: ADULT_SIZES.every((s) =>
                                      nextSizes.includes(s)
                                    ),
                                  });
                                }}
                              >
                                {size}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          className="primary-btn"
                          onClick={handleSaveEditedItem}
                        >
                          <Check size={16} />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="quick-size-actions">
                      {['all', 'ladies', 'boys'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`mini-pill-btn ${
                            manageFilter === f ? 'active' : ''
                          }`}
                          onClick={() => setManageFilter(f)}
                        >
                          {f === 'all'
                            ? 'All Photos'
                            : f === 'ladies'
                            ? 'Ladies'
                            : 'Boys'}
                        </button>
                      ))}
                    </div>

                    <div className="manage-photos-grid">
                      {filteredManageItems.map((item) => {
                        const col = collections.find(
                          (c) => c.id === item.collectionId
                        );
                        return (
                          <div key={item.id} className="manage-photo-card">
                            <img
                              src={item.image}
                              alt=""
                              className="manage-photo-thumb"
                            />
                            <div className="manage-photo-footer">
                              <div className="manage-photo-tags">
                                <span>
                                  {item.category === 'ladies'
                                    ? 'Ladies'
                                    : 'Boys'}
                                </span>
                                <span>{col ? col.name : 'General'}</span>
                              </div>
                              <div className="manage-photo-actions">
                                <button
                                  type="button"
                                  className="edit-mini-btn"
                                  onClick={() => setEditingItem({ ...item })}
                                >
                                  <Edit3 size={12} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="delete-mini-btn"
                                  onClick={() => onDeleteItem(item.id)}
                                >
                                  <Trash2 size={12} />
                                  Del
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* TAB 4: CHANNEL SETTINGS */}
            {activeTab === 'settings' && (
              <>
                <form className="form-section" onSubmit={handleSaveSettings}>
                  <div className="settings-grid">
                    <div className="form-section">
                      <span className="form-label">Channel Name</span>
                      <input
                        type="text"
                        className="text-input"
                        value={settingsDraft.name}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="form-section">
                      <span className="form-label">Channel Handle</span>
                      <input
                        type="text"
                        className="text-input"
                        value={settingsDraft.handle}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            handle: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <span className="form-label">Channel Bio</span>
                    <textarea
                      className="textarea-input"
                      value={settingsDraft.bio}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          bio: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-section">
                    <span className="form-label">
                      WhatsApp Number (Optional)
                    </span>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="e.g. 919876543210"
                      value={settingsDraft.whatsapp || ''}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          whatsapp: e.target.value,
                        })
                      }
                    />
                  </div>

                  <label className="verified-checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(settingsDraft.verified)}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          verified: e.target.checked,
                        })
                      }
                    />
                    <span>Show Verified Blue Tick on Channel</span>
                  </label>

                  <div className="settings-grid" style={{ marginTop: 6 }}>
                    <div className="form-section">
                      <span className="form-label">Channel DP (Avatar)</span>
                      <div className="upload-inline-row">
                        <img
                          src={settingsDraft.avatar}
                          alt="Avatar preview"
                          className="upload-inline-preview"
                          style={{ borderRadius: '50%' }}
                        />
                        <label className="file-btn-label">
                          <ImagePlus size={15} />
                          <span>Change DP</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleChannelAssetUpload('avatar', e)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="form-section">
                      <span className="form-label">Cover Banner</span>
                      <div className="upload-inline-row">
                        <img
                          src={settingsDraft.banner}
                          alt="Banner preview"
                          className="upload-inline-preview"
                          style={{ width: 92 }}
                        />
                        <label className="file-btn-label">
                          <ImagePlus size={15} />
                          <span>Change Banner</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleChannelAssetUpload('banner', e)
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="primary-btn"
                    style={{ marginTop: 10 }}
                    disabled={isSavingSettings}
                  >
                    <Check size={17} />
                    <span>
                      {isSavingSettings ? 'Saving...' : 'Save Channel Settings'}
                    </span>
                  </button>
                </form>

                {/* Dedicated Admin PIN / Password Change Card with Confirm Button */}
                <form
                  className="form-section pin-change-card"
                  onSubmit={handleConfirmPinChange}
                >
                  <div className="pin-change-header">
                    <Lock size={16} color="var(--gold)" />
                    <span className="form-label">
                      Change Admin PIN / Password
                    </span>
                  </div>

                  <div className="settings-grid">
                    <div className="form-section">
                      <span className="form-label">New PIN / Password</span>
                      <input
                        type="password"
                        className="text-input"
                        placeholder="Naya PIN ya Password daalein"
                        value={newPinDraft}
                        onChange={(e) => {
                          setNewPinDraft(e.target.value);
                          setPinChangeMsg({ type: '', text: '' });
                        }}
                      />
                    </div>

                    <div className="form-section">
                      <span className="form-label">Confirm New PIN</span>
                      <input
                        type="password"
                        className="text-input"
                        placeholder="Wahi naya PIN dobara daalein"
                        value={confirmPinDraft}
                        onChange={(e) => {
                          setConfirmPinDraft(e.target.value);
                          setPinChangeMsg({ type: '', text: '' });
                        }}
                      />
                    </div>
                  </div>

                  {pinChangeMsg.text && (
                    <div
                      className={`pin-change-status ${pinChangeMsg.type}`}
                    >
                      {pinChangeMsg.text}
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={!newPinDraft.trim() || !confirmPinDraft.trim()}
                    >
                      <Check size={17} />
                      <span>Confirm PIN</span>
                    </button>
                  </div>
                </form>

                <div
                  className="form-section"
                  style={{
                    paddingTop: 16,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <span className="form-label">Backup &amp; Restore</span>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={onExportBackup}
                    >
                      <Download size={15} />
                      <span>Export Backup (.json)</span>
                    </button>

                    <label className="secondary-btn" style={{ cursor: 'pointer' }}>
                      <Upload size={15} />
                      <span>Import Backup</span>
                      <input
                        type="file"
                        accept="application/json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onImportBackup(f);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      className="danger-btn"
                      style={{ height: 42, padding: '0 16px' }}
                      onClick={onResetDemo}
                    >
                      <RotateCcw size={15} />
                      <span>Reset Demo Data</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
