import React from 'react';
import {
  BadgeCheck,
  Check,
  Heart,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
} from 'lucide-react';
import { formatCount } from '../data/initialData';

export default function ChannelHeader({
  channel,
  totalLikes,
  totalPosts,
  totalCollections,
  onToggleFollow,
  onShareChannel,
}) {
  const cleanWhatsapp = (channel.whatsapp || '').replace(/\D/g, '');

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-inner">
          <div className="nav-brand">
            <img
              src={channel.avatar}
              alt={channel.name}
              className="nav-avatar"
            />
            <span className="nav-brand-name">{channel.name}</span>
            {channel.verified && (
              <span className="verified-badge" title="Verified Fashion Channel">
                <BadgeCheck size={17} fill="currentColor" stroke="#ffffff" />
              </span>
            )}
          </div>

          <div className="nav-actions">
            <button
              type="button"
              className="icon-pill-btn"
              onClick={onShareChannel}
              title="Share Channel"
            >
              <Share2 size={15} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </header>

      <section className="channel-hero">
        <div className="channel-banner-wrap">
          <img
            src={channel.banner}
            alt={`${channel.name} cover`}
            className="channel-banner-img"
          />
          <div className="channel-banner-scrim" />
        </div>

        <div className="channel-profile-card">
          <div className="channel-profile-top">
            <div className="channel-identity">
              <div className="channel-avatar-ring">
                <img
                  src={channel.avatar}
                  alt={channel.name}
                  className="channel-avatar-img"
                />
              </div>
              <div className="channel-title-group">
                <div className="channel-name-row">
                  <h1 className="channel-name">{channel.name}</h1>
                  {channel.verified && (
                    <span
                      className="verified-badge"
                      title="Verified Official Channel"
                    >
                      <BadgeCheck
                        size={22}
                        fill="currentColor"
                        stroke="#ffffff"
                      />
                    </span>
                  )}
                </div>
                <p className="channel-handle">{channel.handle}</p>
              </div>
            </div>

            <div className="channel-cta-group">
              <button
                type="button"
                className={`follow-btn ${channel.isFollowing ? 'following' : ''}`}
                onClick={onToggleFollow}
              >
                {channel.isFollowing ? (
                  <>
                    <Check size={17} strokeWidth={2.6} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <Plus size={17} strokeWidth={2.6} />
                    <span>Follow</span>
                  </>
                )}
              </button>

              {cleanWhatsapp && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                    `Hi ${channel.name}, I saw your fashion channel and want to enquire about your collection.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="whatsapp-btn"
                >
                  <MessageCircle size={17} />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          {channel.bio && <p className="channel-bio">{channel.bio}</p>}

          <div className="channel-stats">
            <div
              className="stat-item"
              title={`${channel.followersCount.toLocaleString()} Followers`}
            >
              <span className="stat-value">
                {formatCount(channel.followersCount)}
              </span>
              <span className="stat-label">Followers</span>
            </div>

            <div
              className="stat-item"
              title={`${totalLikes.toLocaleString()} Total Likes`}
            >
              <Heart
                size={15}
                fill="#e53955"
                color="#e53955"
                style={{ alignSelf: 'center' }}
              />
              <span className="stat-value">{formatCount(totalLikes)}</span>
              <span className="stat-label">Likes</span>
            </div>

            <div className="stat-item">
              <span className="stat-value">{totalPosts}</span>
              <span className="stat-label">Photos</span>
            </div>

            <div className="stat-item">
              <Sparkles
                size={14}
                color="#c69c53"
                style={{ alignSelf: 'center' }}
              />
              <span className="stat-value">{totalCollections}</span>
              <span className="stat-label">Collections</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
