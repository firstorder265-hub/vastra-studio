import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Crown,
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
  UserPlus,
  Users,
} from 'lucide-react';
import { DEFAULT_ADMIN_PERMISSIONS, formatCount } from '../data/initialData';
import { compressImageFile } from '../db';
import StudioMediaTabs from './StudioMediaTabs';

const SUPER_ACTOR = { name: 'Super Admin', role: 'superadmin' };
const FULL_PERMISSIONS = {
  canUpload: true,
  canEdit: true,
  canDelete: true,
  canManageCollections: true,
};

const ACTION_META = {
  upload: { label: 'Photo Upload', tone: 'green' },
  edit: { label: 'Photo Edit', tone: 'blue' },
  delete: { label: 'Photo Delete', tone: 'red' },
  collection_add: { label: 'Collection Add', tone: 'gold' },
  collection_delete: { label: 'Collection Delete', tone: 'red' },
  admin_change: { label: 'Staff / Admin', tone: 'purple' },
  settings: { label: 'Settings', tone: 'gold' },
  login: { label: 'Login', tone: 'neutral' },
};

function formatDateTime(ts) {
  try {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export default function SuperAdminPage({
  isUnlocked,
  isCloudActive,
  onUnlock,
  onLock,
  onGoHome,
  channel,
  collections,
  items,
  admins,
  activityLogs,
  counts,
  totalLikes,
  onAddItems,
  onUpdateItem,
  onDeleteItem,
  onAddCollection,
  onDeleteCollection,
  onUpdateChannel,
  onAddAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  onClearLogs,
  onExportBackup,
  onImportBackup,
  onResetDemo,
  showToast,
}) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState('admins');

  // Staff / Admin Management State
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Staff Admin');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [newAdminPerms, setNewAdminPerms] = useState({
    ...DEFAULT_ADMIN_PERMISSIONS,
  });
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Activity Log Filter State
  const [logCategory, setLogCategory] = useState('all');
  const [logActorFilter, setLogActorFilter] = useState('all');

  // Owner Settings State
  const [settingsDraft, setSettingsDraft] = useState({ ...channel });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [newSuperPin, setNewSuperPin] = useState('');
  const [confirmSuperPin, setConfirmSuperPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    setSettingsDraft({ ...channel });
  }, [channel]);

  const currentSuperPin = channel.superAdminPin || '9999';

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === currentSuperPin) {
      setPinError('');
      setPinInput('');
      setSettingsDraft({ ...channel });
      onUnlock();
    } else {
      setPinError('Galat Super Admin Password! Dobara koshish karein.');
    }
  };

  const handleCopyStaffUrl = async () => {
    const url = `${window.location.origin}/#/admin`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Admin Portal link copy ho gaya!');
    } catch {
      showToast(url);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const name = newAdminName.trim();
    const pin = newAdminPin.trim();
    if (!name || !pin) {
      showToast('Admin ka naam aur PIN dono daalein');
      return;
    }
    if (pin === currentSuperPin) {
      showToast('Staff PIN, Super Admin PIN se alag hona chahiye!');
      return;
    }
    if ((admins || []).some((a) => a.pin === pin)) {
      showToast('Ye PIN kisi aur Admin ko already mila hua hai — alag PIN dein');
      return;
    }
    try {
      await onAddAdmin({
        name,
        roleLabel: newAdminRole.trim() || 'Staff Admin',
        pin,
        permissions: { ...newAdminPerms },
      });
      setNewAdminName('');
      setNewAdminRole('Staff Admin');
      setNewAdminPin('');
      setNewAdminPerms({ ...DEFAULT_ADMIN_PERMISSIONS });
    } catch {
      showToast('Admin add karne me error aaya');
    }
  };

  const handleSaveEditedAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    const name = editingAdmin.name.trim();
    const pin = editingAdmin.pin.trim();
    if (!name || !pin) {
      showToast('Admin ka naam aur PIN khali nahi ho sakta');
      return;
    }
    if (pin === currentSuperPin) {
      showToast('Staff PIN, Super Admin PIN se alag hona chahiye!');
      return;
    }
    if (
      (admins || []).some((a) => a.id !== editingAdmin.id && a.pin === pin)
    ) {
      showToast('Ye PIN kisi aur Admin ke paas already hai!');
      return;
    }
    try {
      await onUpdateAdmin(editingAdmin.id, {
        name,
        roleLabel: editingAdmin.roleLabel.trim() || 'Staff Admin',
        pin,
        active: Boolean(editingAdmin.active),
        permissions: { ...editingAdmin.permissions },
      });
      setEditingAdmin(null);
    } catch {
      showToast('Admin update karne me error aaya');
    }
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
      await onUpdateChannel(
        {
          ...channel,
          name: (settingsDraft.name ?? '').trim() || channel.name,
          handle: (settingsDraft.handle ?? '').trim() || channel.handle,
          bio: (settingsDraft.bio ?? '').trim(),
          whatsapp: (settingsDraft.whatsapp ?? '').trim(),
          followersCount: Math.max(
            0,
            Number(settingsDraft.followersCount) || 0
          ),
          verified: Boolean(settingsDraft.verified),
          avatar: settingsDraft.avatar,
          banner: settingsDraft.banner,
        },
        SUPER_ACTOR,
        'Channel branding & settings update ki'
      );
      showToast('Channel settings save ho gayi!');
    } catch {
      showToast('Settings save karne me error aaya');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleConfirmSuperPin = async (e) => {
    e.preventDefault();
    const nextPin = newSuperPin.trim();
    const confirmPin = confirmSuperPin.trim();
    if (!nextPin) {
      setPinChangeMsg({
        type: 'error',
        text: 'Pehle naya Super Admin PIN / Password daalein.',
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
    if ((admins || []).some((a) => a.pin === nextPin)) {
      setPinChangeMsg({
        type: 'error',
        text: 'Ye PIN kisi staff admin ka hai — Super Admin ke liye alag PIN rakhein.',
      });
      return;
    }
    try {
      await onUpdateChannel(
        {
          ...channel,
          superAdminPin: nextPin,
        },
        SUPER_ACTOR,
        'Super Admin PIN change kiya'
      );
      setNewSuperPin('');
      setConfirmSuperPin('');
      setPinChangeMsg({
        type: 'success',
        text: 'Super Admin PIN / Password successfully change ho gaya!',
      });
      showToast('Naya Super Admin PIN confirm & save ho gaya!');
    } catch {
      setPinChangeMsg({
        type: 'error',
        text: 'Cloud par PIN update karne me error aaya.',
      });
    }
  };

  const uniqueLogActors = useMemo(() => {
    const names = new Set();
    (activityLogs || []).forEach((l) => {
      if (l.actorName) names.add(l.actorName);
    });
    return Array.from(names);
  }, [activityLogs]);

  const filteredLogs = useMemo(() => {
    return (activityLogs || []).filter((log) => {
      if (logActorFilter !== 'all' && log.actorName !== logActorFilter) {
        return false;
      }
      if (logCategory === 'upload') return log.action === 'upload';
      if (logCategory === 'changes') {
        return log.action === 'edit' || log.action === 'delete';
      }
      if (logCategory === 'collections') {
        return (
          log.action === 'collection_add' || log.action === 'collection_delete'
        );
      }
      if (logCategory === 'security') {
        return (
          log.action === 'admin_change' ||
          log.action === 'settings' ||
          log.action === 'login'
        );
      }
      return true;
    });
  }, [activityLogs, logCategory, logActorFilter]);

  const activeAdminsCount = (admins || []).filter((a) => a.active).length;

  // Dedicated Full-Page Super Admin Login Gate
  if (!isUnlocked) {
    return (
      <div className="admin-login-page superadmin-login-bg">
        <div className="admin-login-card superadmin-login-card">
          <div className="admin-login-brand superadmin-brand">
            <img
              src={channel.avatar}
              alt={channel.name}
              className="admin-login-avatar"
            />
            <span className="admin-login-badge superadmin-badge">
              <Crown size={14} />
              Super Admin
            </span>
          </div>

          <form className="pin-gate admin-login-form" onSubmit={handlePinSubmit}>
            <div className="admin-lock-circle superadmin-lock-circle">
              <Crown size={26} color="#c69c53" />
            </div>
            <h1 style={{ marginBottom: 18 }}>{channel.name} Owner</h1>
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
              className="primary-btn superadmin-primary-btn"
              style={{ width: '100%' }}
            >
              Unlock Super Admin
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
      {/* Sticky Gold-Accented Super Admin Bar */}
      <header className="admin-page-topbar superadmin-topbar">
        <div className="admin-page-topbar-inner">
          <div className="admin-header-title">
            <img
              src={channel.avatar}
              alt={channel.name}
              className="admin-topbar-avatar"
            />
            <div>
              <div className="admin-topbar-heading">
                <Crown size={18} color="#f0c869" />
                <h1>{channel.name} — Super Admin</h1>
              </div>
              <span>Owner Command Center • Staff, Permissions &amp; Activity Logs</span>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <span
              className={`storage-status-pill ${isCloudActive ? 'cloud' : 'local'}`}
            >
              {isCloudActive ? <Cloud size={14} /> : <HardDrive size={14} />}
              <span>{isCloudActive ? 'Cloud Live' : 'Local Mode'}</span>
            </span>
            <button
              type="button"
              className="admin-topbar-btn"
              onClick={handleCopyStaffUrl}
              title="Copy Staff Admin Link"
            >
              <Copy size={14} />
              <span>Copy Admin Link</span>
            </button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="admin-topbar-btn"
            >
              <ExternalLink size={15} />
              <span>Website</span>
            </a>
            <button
              type="button"
              className="admin-topbar-btn danger"
              onClick={onLock}
            >
              <LogOut size={15} />
              <span>Lock</span>
            </button>
          </div>
        </div>
      </header>

      <main className="admin-page-shell">
        {/* Owner Overview KPIs */}
        <section className="admin-stats-grid" aria-label="Owner summary">
          <div className="admin-stat-card">
            <div className="admin-stat-icon gold">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="admin-stat-value">
                {activeAdminsCount}/{(admins || []).length}
              </div>
              <div className="admin-stat-label">Active Staff Admins</div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <Images size={18} />
            </div>
            <div>
              <div className="admin-stat-value">{counts.all}</div>
              <div className="admin-stat-label">
                Photos ({counts.ladies} Ladies • {counts.boys} Boys)
              </div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <Activity size={18} />
            </div>
            <div>
              <div className="admin-stat-value">
                {(activityLogs || []).length}
              </div>
              <div className="admin-stat-label">Activity Log Entries</div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon heart">
              <Heart size={18} />
            </div>
            <div>
              <div className="admin-stat-value">
                {formatCount(totalLikes)} • {formatCount(channel.followersCount)}
              </div>
              <div className="admin-stat-label">Likes • Followers</div>
            </div>
          </div>
        </section>

        {/* Main Workspace Card */}
        <section className="admin-workspace-card">
          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab ${activeTab === 'admins' ? 'active' : ''}`}
              onClick={() => setActiveTab('admins')}
            >
              <Users size={15} />
              <span>Admins / Staff ({(admins || []).length})</span>
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <Activity size={15} />
              <span>Activity Log ({(activityLogs || []).length})</span>
            </button>
            <button
              type="button"
              className={`admin-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={15} />
              <span>Upload</span>
            </button>
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
            <button
              type="button"
              className={`admin-tab ${activeTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              <Images size={15} />
              <span>Photos ({items.length})</span>
            </button>
            <button
              type="button"
              className={`admin-tab ${
                activeTab === 'settings' ? 'active' : ''
              }`}
              onClick={() => {
                setSettingsDraft({ ...channel });
                setActiveTab('settings');
              }}
            >
              <Settings size={15} />
              <span>Owner Settings</span>
            </button>
          </div>

          <div className="admin-body admin-page-body">
            {/* TAB 1: ADMINS / STAFF MANAGEMENT */}
            {activeTab === 'admins' && (
              <>
                {editingAdmin ? (
                  <form
                    className="form-section pin-change-card"
                    onSubmit={handleSaveEditedAdmin}
                  >
                    <div className="size-toggle-header">
                      <span className="form-label">
                        Edit Staff Admin: {editingAdmin.name}
                      </span>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ height: 32 }}
                        onClick={() => setEditingAdmin(null)}
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="settings-grid">
                      <div className="form-section">
                        <span className="form-label">Admin Name</span>
                        <input
                          type="text"
                          className="text-input"
                          value={editingAdmin.name}
                          onChange={(e) =>
                            setEditingAdmin({
                              ...editingAdmin,
                              name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-section">
                        <span className="form-label">Role Label</span>
                        <input
                          type="text"
                          className="text-input"
                          value={editingAdmin.roleLabel}
                          onChange={(e) =>
                            setEditingAdmin({
                              ...editingAdmin,
                              roleLabel: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="form-section">
                      <span className="form-label">Login PIN / Password</span>
                      <input
                        type="text"
                        className="text-input"
                        value={editingAdmin.pin}
                        onChange={(e) =>
                          setEditingAdmin({
                            ...editingAdmin,
                            pin: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="form-section">
                      <span className="form-label">Permissions</span>
                      <div className="perm-checkbox-grid">
                        {[
                          ['canUpload', 'Upload Photos'],
                          ['canEdit', 'Edit Photos'],
                          ['canDelete', 'Delete Photos & Collections'],
                          ['canManageCollections', 'Add Collections'],
                        ].map(([key, label]) => (
                          <label key={key} className="verified-checkbox-row">
                            <input
                              type="checkbox"
                              checked={Boolean(editingAdmin.permissions?.[key])}
                              onChange={(e) =>
                                setEditingAdmin({
                                  ...editingAdmin,
                                  permissions: {
                                    ...editingAdmin.permissions,
                                    [key]: e.target.checked,
                                  },
                                })
                              }
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <button type="submit" className="primary-btn">
                        <Check size={16} />
                        <span>Save Admin Changes</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form
                    className="form-section pin-change-card"
                    onSubmit={handleCreateAdmin}
                  >
                    <div className="pin-change-header">
                      <UserPlus size={16} color="var(--gold)" />
                      <span className="form-label">
                        Naya Admin / Staff Account Banayein
                      </span>
                    </div>

                    <div className="settings-grid">
                      <div className="form-section">
                        <span className="form-label">Staff Name</span>
                        <input
                          type="text"
                          className="text-input"
                          placeholder="e.g. Rahul, Priya, Shop Manager"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-section">
                        <span className="form-label">Role Label</span>
                        <input
                          type="text"
                          className="text-input"
                          placeholder="e.g. Uploader, Manager"
                          value={newAdminRole}
                          onChange={(e) => setNewAdminRole(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-section">
                      <span className="form-label">
                        Unique Login PIN / Password (for /admin)
                      </span>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="e.g. 5678 ya rahul2026"
                        value={newAdminPin}
                        onChange={(e) => setNewAdminPin(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-section">
                      <span className="form-label">Allowed Permissions</span>
                      <div className="perm-checkbox-grid">
                        {[
                          ['canUpload', 'Upload Photos'],
                          ['canEdit', 'Edit Photos'],
                          ['canDelete', 'Delete Photos & Collections'],
                          ['canManageCollections', 'Add Collections'],
                        ].map(([key, label]) => (
                          <label key={key} className="verified-checkbox-row">
                            <input
                              type="checkbox"
                              checked={Boolean(newAdminPerms[key])}
                              onChange={(e) =>
                                setNewAdminPerms({
                                  ...newAdminPerms,
                                  [key]: e.target.checked,
                                })
                              }
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <button type="submit" className="primary-btn">
                        <Plus size={16} />
                        <span>Add Staff Admin</span>
                      </button>
                    </div>
                  </form>
                )}

                <div className="form-section">
                  <span className="form-label">
                    All Staff Admins ({(admins || []).length})
                  </span>
                  <div className="staff-admin-list">
                    {(admins || []).map((admin) => (
                      <div
                        key={admin.id}
                        className={`staff-admin-card ${
                          admin.active ? '' : 'blocked'
                        }`}
                      >
                        <div className="staff-admin-main">
                          <div className="staff-admin-top">
                            <h4>{admin.name}</h4>
                            <span className="staff-role-pill">
                              {admin.roleLabel || 'Staff Admin'}
                            </span>
                            <span
                              className={`staff-status-badge ${
                                admin.active ? 'active' : 'blocked'
                              }`}
                            >
                              {admin.active ? 'Active' : 'Blocked'}
                            </span>
                          </div>
                          <div className="staff-pin-row">
                            Login PIN: <code>{admin.pin}</code>
                          </div>
                          <div className="staff-perm-pills">
                            {admin.permissions?.canUpload && (
                              <span>Upload</span>
                            )}
                            {admin.permissions?.canEdit && <span>Edit</span>}
                            {admin.permissions?.canDelete && (
                              <span className="warn">Delete</span>
                            )}
                            {admin.permissions?.canManageCollections && (
                              <span>Collections</span>
                            )}
                          </div>
                        </div>

                        <div className="staff-admin-actions">
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ height: 34, padding: '0 12px', fontSize: '0.78rem' }}
                            onClick={() =>
                              setEditingAdmin({
                                ...admin,
                                permissions: { ...admin.permissions },
                              })
                            }
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ height: 34, padding: '0 12px', fontSize: '0.78rem' }}
                            onClick={() =>
                              onUpdateAdmin(admin.id, {
                                active: !admin.active,
                              })
                            }
                          >
                            {admin.active ? (
                              <>
                                <Ban size={13} />
                                <span>Block</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Unblock</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            style={{ height: 34 }}
                            onClick={() => onDeleteAdmin(admin.id)}
                            title="Delete Admin"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: ACTIVITY LOGS */}
            {activeTab === 'logs' && (
              <>
                <div className="log-toolbar">
                  <div className="quick-size-actions">
                    {[
                      ['all', 'All Activity'],
                      ['upload', 'Uploads'],
                      ['changes', 'Edits & Deletes'],
                      ['collections', 'Collections'],
                      ['security', 'Admins & Settings'],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`mini-pill-btn ${
                          logCategory === id ? 'active' : ''
                        }`}
                        onClick={() => setLogCategory(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="log-toolbar-right">
                    <select
                      className="select-input"
                      style={{ height: 34, width: 'auto', minWidth: 150 }}
                      value={logActorFilter}
                      onChange={(e) => setLogActorFilter(e.target.value)}
                    >
                      <option value="all">All Users</option>
                      {uniqueLogActors.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>

                    {(activityLogs || []).length > 0 && (
                      <button
                        type="button"
                        className="danger-btn"
                        style={{ height: 34 }}
                        onClick={onClearLogs}
                      >
                        <Trash2 size={13} />
                        <span>Clear Logs</span>
                      </button>
                    )}
                  </div>
                </div>

                {filteredLogs.length === 0 ? (
                  <div className="permission-notice">
                    Abhi is filter me koi activity log nahi hai. Jab bhi koi
                    Admin ya Super Admin photo upload, edit, delete ya settings
                    change karega, yahan poori history record hogi.
                  </div>
                ) : (
                  <div className="activity-log-list">
                    {filteredLogs.map((log) => {
                      const meta = ACTION_META[log.action] || {
                        label: log.action,
                        tone: 'neutral',
                      };
                      return (
                        <div key={log.id} className="activity-log-row">
                          {log.thumbnail ? (
                            <img
                              src={log.thumbnail}
                              alt=""
                              className="activity-log-thumb"
                            />
                          ) : (
                            <div className={`activity-log-dot ${meta.tone}`}>
                              <Activity size={15} />
                            </div>
                          )}

                          <div className="activity-log-content">
                            <div className="activity-log-top">
                              <span className="activity-actor-name">
                                {log.actorName}
                              </span>
                              <span
                                className={`activity-role-pill ${log.actorRole}`}
                              >
                                {log.actorRole === 'superadmin'
                                  ? 'Super Admin'
                                  : 'Admin'}
                              </span>
                              <span
                                className={`activity-action-pill ${meta.tone}`}
                              >
                                {meta.label}
                              </span>
                              <span className="activity-time">
                                {formatDateTime(log.createdAt)}
                              </span>
                            </div>
                            <p className="activity-details">{log.details}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* TABS 3, 4, 5: SHARED UPLOAD / COLLECTIONS / MANAGE PHOTOS */}
            {(activeTab === 'upload' ||
              activeTab === 'collections' ||
              activeTab === 'photos') && (
              <StudioMediaTabs
                activeTab={activeTab}
                isCloudActive={isCloudActive}
                actor={SUPER_ACTOR}
                permissions={FULL_PERMISSIONS}
                collections={collections}
                items={items}
                onAddItems={onAddItems}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onAddCollection={onAddCollection}
                onDeleteCollection={onDeleteCollection}
                showToast={showToast}
              />
            )}

            {/* TAB 6: OWNER SETTINGS */}
            {activeTab === 'settings' && (
              <>
                <form className="form-section" onSubmit={handleSaveSettings}>
                  <div className="settings-grid">
                    <div className="form-section">
                      <span className="form-label">Channel Name</span>
                      <input
                        type="text"
                        className="text-input"
                        value={settingsDraft.name ?? ''}
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
                        value={settingsDraft.handle ?? ''}
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
                      value={settingsDraft.bio ?? ''}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          bio: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="settings-grid">
                    <div className="form-section">
                      <span className="form-label">
                        WhatsApp Number (Optional)
                      </span>
                      <input
                        type="text"
                        className="text-input"
                        placeholder="e.g. 919876543210"
                        value={settingsDraft.whatsapp ?? ''}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            whatsapp: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="form-section">
                      <span className="form-label">Followers Count</span>
                      <input
                        type="number"
                        min="0"
                        className="text-input"
                        value={settingsDraft.followersCount ?? 0}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            followersCount: e.target.value,
                          })
                        }
                      />
                    </div>
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

                {/* Change Super Admin PIN Card with Confirm Button */}
                <form
                  className="form-section pin-change-card"
                  onSubmit={handleConfirmSuperPin}
                >
                  <div className="pin-change-header">
                    <Crown size={16} color="var(--gold)" />
                    <span className="form-label">
                      Change Super Admin PIN / Password
                    </span>
                  </div>

                  <div className="settings-grid">
                    <div className="form-section">
                      <span className="form-label">
                        New Super Admin PIN / Password
                      </span>
                      <input
                        type="password"
                        className="text-input"
                        placeholder="Naya Super Admin PIN daalein"
                        value={newSuperPin}
                        onChange={(e) => {
                          setNewSuperPin(e.target.value);
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
                        value={confirmSuperPin}
                        onChange={(e) => {
                          setConfirmSuperPin(e.target.value);
                          setPinChangeMsg({ type: '', text: '' });
                        }}
                      />
                    </div>
                  </div>

                  {pinChangeMsg.text && (
                    <div className={`pin-change-status ${pinChangeMsg.type}`}>
                      {pinChangeMsg.text}
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={!newSuperPin.trim() || !confirmSuperPin.trim()}
                    >
                      <Check size={17} />
                      <span>Confirm PIN</span>
                    </button>
                  </div>
                </form>

                {/* Backup & Reset */}
                <div
                  className="form-section"
                  style={{
                    paddingTop: 16,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <span className="form-label">Backup &amp; Restore</span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
