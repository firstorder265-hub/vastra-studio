import React from 'react';
import { Grid3X3 } from 'lucide-react';
import { ALL_FILTER_SIZES } from '../data/initialData';

export default function FilterBar({
  activeCategory,
  onCategoryChange,
  activeCollection,
  onCollectionChange,
  activeSize,
  onSizeChange,
  collections,
  counts,
  customSizes,
}) {
  const visibleCollections = collections.filter((col) => {
    if (activeCategory === 'all') return true;
    return col.category === 'both' || col.category === activeCategory;
  });

  const allSizesList = Array.from(
    new Set([...ALL_FILTER_SIZES, ...customSizes])
  );

  return (
    <section className="filter-section">
      {/* Main Category Tabs */}
      <div className="category-tabs" role="tablist" aria-label="Clothing Category">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'all'}
          className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => onCategoryChange('all')}
        >
          <span>All</span>
          <span className="tab-count">{counts.all}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'ladies'}
          className={`category-tab ${activeCategory === 'ladies' ? 'active' : ''}`}
          onClick={() => onCategoryChange('ladies')}
        >
          <span>Ladies</span>
          <span className="tab-count">{counts.ladies}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'boys'}
          className={`category-tab ${activeCategory === 'boys' ? 'active' : ''}`}
          onClick={() => onCategoryChange('boys')}
        >
          <span>Boys</span>
          <span className="tab-count">{counts.boys}</span>
        </button>
      </div>

      {/* Collection Story Highlights */}
      <div className="highlights-strip" aria-label="Collections">
        <button
          type="button"
          className={`highlight-item ${activeCollection === 'all' ? 'active' : ''}`}
          onClick={() => onCollectionChange('all')}
        >
          <div className="highlight-ring">
            <div className="highlight-thumb">
              <Grid3X3 size={22} />
            </div>
          </div>
          <span className="highlight-name">All Drops</span>
        </button>

        {visibleCollections.map((col) => (
          <button
            key={col.id}
            type="button"
            className={`highlight-item ${activeCollection === col.id ? 'active' : ''}`}
            onClick={() => onCollectionChange(col.id)}
          >
            <div className="highlight-ring">
              {col.cover ? (
                <img
                  src={col.cover}
                  alt={col.name}
                  className="highlight-thumb"
                />
              ) : (
                <div className="highlight-thumb">
                  <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    {col.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <span className="highlight-name">{col.name}</span>
          </button>
        ))}
      </div>

      {/* Size Filter Strip */}
      <div className="size-filter-bar" aria-label="Filter by Size">
        <span className="size-filter-label">Size:</span>
        <button
          type="button"
          className={`size-chip ${activeSize === 'all' ? 'active' : ''}`}
          onClick={() => onSizeChange('all')}
        >
          All Sizes
        </button>
        {allSizesList.map((size) => (
          <button
            key={size}
            type="button"
            className={`size-chip ${activeSize === size ? 'active' : ''}`}
            onClick={() => onSizeChange(size)}
          >
            {size}
          </button>
        ))}
      </div>
    </section>
  );
}
