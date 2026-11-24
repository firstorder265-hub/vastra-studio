import React, { useEffect, useState } from 'react';
import {
  Check,
  Edit3,
  ImagePlus,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { ADULT_SIZES, KIDS_SIZES } from '../data/initialData';
import { compressImageFile } from '../db';

/**
 * Shared Upload, Collections, and Manage Photos tabs used by both
 * Staff Admin (/admin) and Super Admin (/superadmin), honoring granular permissions.
 */
export default function StudioMediaTabs({
  activeTab,
  isCloudActive,
  actor,
  permissions,
  collections,
  items,
  onAddItems,
  onUpdateItem,
  onDeleteItem,
  onAddCollection,
  onDeleteCollection,
  showToast,
}) {
  const canUpload = permissions?.canUpload !== false;
  const canEdit = permissions?.canEdit !== false;
  const canDelete = permissions?.canDelete !== false;
  const canManageCollections = permissions?.canManageCollections !== false;

  // Upload Tab State
  const [pendingImages, setPendingImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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

  useEffect(() => {
    if (
      collections.length > 0 &&
      !collections.some((c) => c.id === collectionId)
    ) {
      setCollectionId(collections[0].id);
    }
  }, [collections, collectionId]);

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
    if (!canManageCollections) return;
    const trimmed = inlineColName.trim();
    if (!trimmed) return;
    try {
      const created = await onAddCollection(
        {
          name: trimmed,
          category,
          cover: pendingImages[0] || '',
        },
        actor
      );
      if (created?.id) setCollectionId(created.id);
      setInlineColName('');
      setShowInlineCol(false);
    } catch {
      showToast('Collection add karne me error aaya');
    }
  };

  const handlePublishPhotos = async () => {
    if (!canUpload) {
      showToast('Aapko photo upload ki permission nahi hai');
      return;
    }
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
      uploadedBy: actor?.name || 'Admin',
      createdAt: Date.now() + idx,
    }));

    setIsPublishing(true);
    try {
      await onAddItems(newItems, actor);
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
    if (!canManageCollections || !newColName.trim()) return;
    try {
      await onAddCollection(
        {
          name: newColName.trim(),
          category: newColCategory,
          cover: newColCover,
        },
        actor
      );
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

  const handleSaveEditedItem = async () => {
    if (!editingItem || !canEdit) return;
    await onUpdateItem(
      editingItem.id,
      {
        category: editingItem.category,
        collectionId: editingItem.collectionId,
        sizes: editingItem.sizes.length ? editingItem.sizes : [...ADULT_SIZES],
        allSizes: editingItem.allSizes,
      },
      actor
    );
    setEditingItem(null);
    showToast('Photo details update ho gayi!');
  };

  const filteredManageItems = items.filter((it) =>
    manageFilter === 'all' ? true : it.category === manageFilter
  );

  if (activeTab === 'upload') {
    if (!canUpload) {
      return (
        <div className="permission-notice">
          Super Admin ne aapke account ke liye Photo Upload permission off ki hui
          hai.
        </div>
      );
    }

    return (
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
              JPG, PNG, WEBP supported • Gallery me sirf clean photo dikhegi
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
              className={`segment-btn ${category === 'ladies' ? 'active' : ''}`}
              onClick={() => setCategory('ladies')}
            >
              Ladies Collection
            </button>
            <button
              type="button"
              className={`segment-btn ${category === 'boys' ? 'active' : ''}`}
              onClick={() => setCategory('boys')}
            >
              Boys Collection
            </button>
          </div>
        </div>

        <div className="form-section">
          <div className="size-toggle-header">
            <span className="form-label">3. Collection Select Karein</span>
            {canManageCollections && (
              <button
                type="button"
                className="mini-pill-btn"
                onClick={() => setShowInlineCol((v) => !v)}
              >
                <Plus size={12} style={{ display: 'inline' }} /> New Collection
              </button>
            )}
          </div>

          {canManageCollections && showInlineCol && (
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
                className={`mini-pill-btn ${allSizesFlag ? 'active' : ''}`}
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
                  className={`size-select-chip ${isSelected ? 'selected' : ''}`}
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
          disabled={pendingImages.length === 0 || isProcessing || isPublishing}
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
    );
  }

  if (activeTab === 'collections') {
    if (!canManageCollections) {
      return (
        <div className="permission-notice">
          Super Admin ne aapke account ke liye Collections manage karne ki
          permission off ki hui hai.
        </div>
      );
    }

    return (
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
                  {newColCover ? 'Change Cover' : 'Cover Photo (Optional)'}
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
                  {canDelete && (
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => onDeleteCollection(col.id, actor)}
                      title="Delete Collection"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  if (activeTab === 'photos') {
    return (
      <>
        {editingItem && canEdit ? (
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
                    const active = (editingItem.sizes || []).includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`size-select-chip ${
                          active ? 'selected' : ''
                        }`}
                        onClick={() => {
                          const nextSizes = active
                            ? editingItem.sizes.filter((s) => s !== size)
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
                const col = collections.find((c) => c.id === item.collectionId);
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
                          {item.category === 'ladies' ? 'Ladies' : 'Boys'}
                        </span>
                        <span>{col ? col.name : 'General'}</span>
                      </div>
                      {item.uploadedBy && (
                        <div className="manage-photo-uploader">
                          <User size={11} />
                          <span>{item.uploadedBy}</span>
                        </div>
                      )}
                      {(canEdit || canDelete) && (
                        <div className="manage-photo-actions">
                          {canEdit && (
                            <button
                              type="button"
                              className="edit-mini-btn"
                              onClick={() => setEditingItem({ ...item })}
                            >
                              <Edit3 size={12} />
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="delete-mini-btn"
                              onClick={() => onDeleteItem(item.id, actor)}
                            >
                              <Trash2 size={12} />
                              Del
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  }

  return null;
}
