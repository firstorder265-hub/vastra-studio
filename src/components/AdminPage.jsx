import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Cloud,
  ExternalLink,
  FolderPlus,
  HardDrive,
  Heart,
  Images,
  Lock,
  LogOut,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import { formatCount } from '../data/initialData';
import StudioMediaTabs from './StudioMediaTabs';

export default function AdminPage({
  activeAdmin,
  isCloudActive,
  admins,
  channel,
  collections,
  items,
  counts,
  totalLikes,
  onLoginSuccess,
  onLock,
  onGoHome,
  onAddItems,
  onUpdateItem,
  onDeleteItem,
  onAddCollection,
  onDeleteCollection,
  showToast,
}) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState('upload');

  const permissions = activeAdmin?.permissions || {
    canUpload: true,
    canEdit: true,
    canDelete: false,
    canManageCollections: true,
  };

  // Ensure active tab is permitted for this staff member
  useEffect(() => {
    if (!activeAdmin) return;
    if (activeTab === 'upload' && !permissions.canUpload) {
      setActiveTab(permissions.canManageCollections ? 'collections' : 'photos');
    } else if (activeTab === 'collections' && !permissions.canManageCollections) {
      setActiveTab(permissions.canUpload ? 'upload' : 'photos');
    }
  }, [activeAdmin, activeTab, permissions.canUpload, permissions.canManageCollections]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const entered = pinInput.trim();
    if (!entered) {
      setPinError('Apna Admin PIN / Password daalein.');
      return;
    }

    // Match against staff accounts managed by Super Admin
    const matchedAdmin = (admins || []).find((a) => a.pin === entered);
    if (matchedAdmin) {
      if (!matchedAdmin.active) {
        setPinError('Aapka Admin account Super Admin ne block kiya hua hai.');
        return;
      }
      setPinError('');
      setPinInput('');
      onLoginSuccess(matchedAdmin);
      return;
    }

    // Backwards-compatible fallback to legacy channel.adminPin if no staff list exists
    if ((!admins || admins.length === 0) && entered === (channel.adminPin || '1234')) {
      setPinError('');
      setPinInput('');
      onLoginSuccess({
        id: 'admin-default',
        name: 'Main Admin',
        roleLabel: 'Store Admin',
        pin: entered,
        active: true,
        permissions: {
          canUpload: true,
          canEdit: true,
          canDelete: true,
          canManageCollections: true,
        },
      });
      return;
    }

    setPinError('Galat Password! Dobara koshish karein.');
  };

  // Dedicated Full-Page Login Gate
  if (!activeAdmin) {
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

  const actor = {
    name: activeAdmin.name,
    role: 'admin',
  };

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
              <span className="admin-actor-subtitle">
                <UserCheck size={12} />
                {activeAdmin.name} ({activeAdmin.roleLabel || 'Staff Admin'})
              </span>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <span
              className={`storage-status-pill ${isCloudActive ? 'cloud' : 'local'}`}
              title={
                isCloudActive
                  ? 'Connected to Supabase Cloud — Sabhi customers ko live dikhega'
                  : 'Local Browser Mode'
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
              title="Logout Admin"
            >
              <LogOut size={15} />
              <span>Logout</span>
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

        {/* Main Workspace Card (Photos & Collections Only — Owner Settings are in Super Admin) */}
        <section className="admin-workspace-card">
          <div className="admin-tabs">
            {permissions.canUpload && (
              <button
                type="button"
                className={`admin-tab ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                <Upload size={15} />
                <span>Upload Photos</span>
              </button>
            )}
            {permissions.canManageCollections && (
              <button
                type="button"
                className={`admin-tab ${
                  activeTab === 'collections' ? 'active' : ''
                }`}
                onClick={() => setActiveTab('collections')}
              >
                <FolderPlus size={15} />
                <span>Collections ({collections.length})</span>
              </button>
            )}
            <button
              type="button"
              className={`admin-tab ${activeTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              <Images size={15} />
              <span>Manage Photos ({items.length})</span>
            </button>
          </div>

          <div className="admin-body admin-page-body">
            <StudioMediaTabs
              activeTab={activeTab}
              isCloudActive={isCloudActive}
              actor={actor}
              permissions={permissions}
              collections={collections}
              items={items}
              onAddItems={onAddItems}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
              onAddCollection={onAddCollection}
              onDeleteCollection={onDeleteCollection}
              showToast={showToast}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
