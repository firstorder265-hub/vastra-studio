import React, { useEffect } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Layers,
  MessageCircle,
  Tag,
  X,
} from 'lucide-react';
import { formatCount } from '../data/initialData';

export default function PhotoLightbox({
  items,
  selectedId,
  channel,
  collections,
  onClose,
  onSelectId,
  onToggleLike,
}) {
  const index = items.findIndex((it) => it.id === selectedId);
  const item = index >= 0 ? items[index] : null;

  useEffect(() => {
    if (!item) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && items.length > 1) {
        onSelectId(items[(index + 1) % items.length].id);
      }
      if (e.key === 'ArrowLeft' && items.length > 1) {
        onSelectId(items[(index - 1 + items.length) % items.length].id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [item, index, items, onClose, onSelectId]);

  if (!item) return null;

  const collection = collections.find((c) => c.id === item.collectionId);
  const cleanWhatsapp = (channel.whatsapp || '').replace(/\D/g, '');
  const categoryLabel = item.category === 'ladies' ? 'Ladies Wear' : 'Boys Wear';

  const handlePrev = (e) => {
    e.stopPropagation();
    onSelectId(items[(index - 1 + items.length) % items.length].id);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    onSelectId(items[(index + 1) % items.length].id);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close photo viewer"
        >
          <X size={20} />
        </button>

        <div
          className="lightbox-media"
          onDoubleClick={() => {
            if (!item.liked) onToggleLike(item.id);
          }}
        >
          <img src={item.image} alt={`${categoryLabel} look`} />

          {items.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav prev"
                onClick={handlePrev}
                aria-label="Previous photo"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="lightbox-nav next"
                onClick={handleNext}
                aria-label="Next photo"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>

        <div className="lightbox-info">
          <div className="lightbox-channel-row">
            <img src={channel.avatar} alt={channel.name} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <strong style={{ fontSize: '0.96rem' }}>{channel.name}</strong>
                {channel.verified && (
                  <span className="verified-badge">
                    <BadgeCheck size={16} fill="currentColor" stroke="#ffffff" />
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                {channel.handle}
              </span>
            </div>
          </div>

          <div className="lightbox-badges">
            <span className="meta-badge">
              <Tag size={13} />
              {categoryLabel}
            </span>
            {collection && (
              <span className="meta-badge gold">
                <Layers size={13} />
                {collection.name}
              </span>
            )}
          </div>

          <div className="lightbox-sizes-block">
            <h4>Available Sizes</h4>
            {item.allSizes && (
              <div className="all-sizes-banner">
                <CheckCircle2 size={15} />
                <span>All Sizes Available</span>
              </div>
            )}
            <div className="size-pill-list">
              {(item.sizes && item.sizes.length > 0
                ? item.sizes
                : ['All Sizes']
              ).map((size) => (
                <span key={size} className="size-pill-tag">
                  {size}
                </span>
              ))}
            </div>
          </div>

          <div className="lightbox-actions">
            <button
              type="button"
              className={`lightbox-like-btn ${item.liked ? 'liked' : ''}`}
              onClick={() => onToggleLike(item.id)}
            >
              <Heart
                size={20}
                fill={item.liked ? 'currentColor' : 'none'}
                strokeWidth={2.2}
              />
              <span>
                {item.liked ? 'Liked' : 'Like Photo'} •{' '}
                {formatCount(item.likes)}
              </span>
            </button>

            {cleanWhatsapp && (
              <a
                href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                  `Hi ${channel.name}, I liked a ${categoryLabel} outfit from your "${
                    collection ? collection.name : 'Fashion'
                  }" collection (Sizes: ${(item.sizes || []).join(', ')}). Is it available?`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="lightbox-whatsapp-btn"
              >
                <MessageCircle size={18} />
                <span>Enquire on WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
