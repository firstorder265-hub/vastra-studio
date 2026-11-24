import React, { useRef, useState } from 'react';
import { Heart, RotateCcw } from 'lucide-react';

export default function PhotoGrid({
  items,
  onSelectPhoto,
  onToggleLike,
  onResetFilters,
}) {
  const [burstId, setBurstId] = useState(null);
  const lastTapRef = useRef({ id: null, time: 0 });

  const handleTileClick = (item) => {
    const now = Date.now();
    if (
      lastTapRef.current.id === item.id &&
      now - lastTapRef.current.time < 280
    ) {
      // Double-tap / double-click: trigger Like heart burst
      lastTapRef.current = { id: null, time: 0 };
      if (!item.liked) {
        onToggleLike(item.id);
      }
      setBurstId(item.id);
      setTimeout(() => {
        setBurstId((current) => (current === item.id ? null : current));
      }, 780);
      return;
    }

    lastTapRef.current = { id: item.id, time: now };
    setTimeout(() => {
      if (
        lastTapRef.current.id === item.id &&
        lastTapRef.current.time === now
      ) {
        onSelectPhoto(item.id);
      }
    }, 240);
  };

  if (items.length === 0) {
    return (
      <div className="photo-grid-wrap">
        <div className="empty-gallery">
          <h3>No Photos in This Filter</h3>
          <p>
            Is category, collection ya size me abhi koi photo nahi hai. Filter
            reset karke baaki collections dekhein.
          </p>
          <div className="empty-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={onResetFilters}
            >
              <RotateCcw size={15} />
              <span>Show All Photos</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="photo-grid-wrap">
      <div className="photo-grid">
        {items.map((item) => (
          <div
            key={item.id}
            className="photo-tile"
            onClick={() => handleTileClick(item)}
            role="button"
            tabIndex={0}
            aria-label={`View ${item.category} fashion photo`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectPhoto(item.id);
              }
            }}
          >
            <img src={item.image} alt="" loading="lazy" />

            <button
              type="button"
              className={`tile-heart-btn ${item.liked ? 'liked' : ''}`}
              aria-label={item.liked ? 'Unlike photo' : 'Like photo'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(item.id);
              }}
            >
              <Heart
                size={16}
                fill={item.liked ? 'currentColor' : 'none'}
                strokeWidth={2.2}
              />
            </button>

            {burstId === item.id && (
              <div className="heart-burst">
                <Heart
                  size={68}
                  fill="#ffffff"
                  color="#ffffff"
                  style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.45))' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
