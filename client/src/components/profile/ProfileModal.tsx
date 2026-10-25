import React, { useState, useEffect, useCallback } from 'react';
import styles from './ProfileModal.module.css';
import { getCsrfToken } from '../../utils/csrf';
import { User } from '../AuthModal';

interface ProfilePreferences {
  theme: 'dark-obsidian' | 'cyber-neon' | 'midnight-void';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  privacyMode: 'public' | 'friends-only' | 'private';
}

interface PlayerProfileData {
  id: string;
  email: string;
  displayName: string;
  role: string;
  subscription: string;
  gamerscore: number;
  avatar: string;
  bio: string;
  preferences: ProfilePreferences;
  createdAt: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onProfileUpdated?: (updated: { displayName: string; avatar?: string }) => void;
  onLog: (msg: string, type: 'green' | 'yellow' | 'rose' | 'blue' | 'dim') => void;
}

const AVATAR_PRESETS = [
  { id: 'cyber-neon', label: 'Neon Cyber', icon: '⚡' },
  { id: 'pixel-invader', label: 'Invader', icon: '👾' },
  { id: 'phantom-scout', label: 'Phantom', icon: '👻' },
  { id: 'void-walker', label: 'Void Walker', icon: '🪐' },
  { id: 'quantum-pilot', label: 'Quantum', icon: '🚀' },
  { id: 'solar-sentinel', label: 'Sentinel', icon: '🛡️' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  onLog,
}) => {
  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('cyber-neon');
  const [bio, setBio] = useState('');
  const [preferences, setPreferences] = useState<ProfilePreferences>({
    theme: 'dark-obsidian',
    soundEnabled: true,
    notificationsEnabled: true,
    privacyMode: 'public',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setNameError(null);
    try {
      const res = await fetch('/api/v1/profile', {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to fetch profile (HTTP ${res.status})`);
      }
      const data = await res.json();
      const p: PlayerProfileData = data.profile;
      setProfile(p);
      setDisplayName(p.displayName || '');
      setAvatar(p.avatar || 'cyber-neon');
      setBio(p.bio || '');
      if (p.preferences) {
        setPreferences({
          theme: p.preferences.theme || 'dark-obsidian',
          soundEnabled: p.preferences.soundEnabled ?? true,
          notificationsEnabled: p.preferences.notificationsEnabled ?? true,
          privacyMode: p.preferences.privacyMode || 'public',
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      onLog(`Profile query error: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  }, [onLog]);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, fetchProfile]);

  const validateDisplayName = (name: string): boolean => {
    if (!name || name.trim().length === 0) {
      setNameError('Display name is required.');
      return false;
    }
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      setNameError('Display name must be between 3 and 30 characters in length.');
      return false;
    }
    const validPattern = /^[a-zA-Z0-9_\- ]+$/;
    if (!validPattern.test(trimmed)) {
      setNameError('Display name can only contain letters, numbers, spaces, underscores, and hyphens.');
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    if (nameError) {
      validateDisplayName(val);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateDisplayName(displayName)) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        displayName: displayName.trim(),
        avatar,
        bio: bio.slice(0, 250),
        preferences,
      };

      const res = await fetch('/api/v1/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      const updated = data.profile;
      setProfile(updated);
      setSuccessMsg('Profile updated successfully! Revised identity active.');
      onLog(`Profile saved for player: "${updated.displayName}" (AC-4.1 verified)`, 'green');

      if (onProfileUpdated) {
        onProfileUpdated({
          displayName: updated.displayName,
          avatar: updated.avatar,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      onLog(`Profile update rejected: ${err.message}`, 'rose');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" id="profile-modal">
      <div className={styles.modal}>
        <div className={styles.modalGlow} aria-hidden="true" />

        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.tagRow}>
              <span className={styles.tag}>EP01-04 • PLAYER IDENTITY & PROFILE</span>
            </div>
            <h3 className={styles.title}>Player Profile Settings</h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
            id="btnCloseProfileModal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading player identity records...
            </div>
          ) : (
            <form onSubmit={handleSave} id="profileForm" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Identity Banner */}
              <div className={styles.identityCard}>
                <div className={styles.avatarLarge}>
                  {AVATAR_PRESETS.find((a) => a.id === avatar)?.icon || (displayName ? displayName.charAt(0).toUpperCase() : '🎮')}
                </div>
                <div className={styles.identityMeta}>
                  <div className={styles.identityNameRow}>
                    <span className={styles.identityName} id="profile-preview-name">
                      {displayName || currentUser?.displayName || 'Player'}
                    </span>
                    <span className={`${styles.roleBadge} ${currentUser?.role === 'admin' ? styles.adminRoleBadge : ''}`} id="profile-role-badge">
                      {profile?.role?.toUpperCase() || currentUser?.role?.toUpperCase() || 'PLAYER'}
                    </span>
                    <span className={styles.roleBadge} style={{ borderColor: 'rgba(255, 184, 0, 0.4)', color: '#FFB800' }}>
                      {profile?.subscription === 'pro' ? 'Obsidian Pro' : 'Free Tier'}
                    </span>
                  </div>
                  <div className={styles.identitySubtext}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>{profile?.email || currentUser?.email || 'email@nexusplay.gg'}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                      🏆 {profile?.gamerscore ?? 0} G
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Notifications */}
              {successMsg && (
                <div className={styles.alertSuccess} id="profile-success-alert" role="status">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className={styles.alertError} id="profile-error-alert" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Display Name Input */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="profile-input-displayName">
                  <span>Display Name / GamerTag *</span>
                  <span className={styles.charCounter}>{displayName.length}/30</span>
                </label>
                <input
                  id="profile-input-displayName"
                  type="text"
                  className={`${styles.input} ${nameError ? styles.inputError : ''}`}
                  value={displayName}
                  onChange={handleNameChange}
                  placeholder="Enter unique public display name"
                  maxLength={30}
                  autoComplete="nickname"
                  required
                />
                {nameError ? (
                  <span className={styles.fieldError} id="profile-name-error">{nameError}</span>
                ) : (
                  <span className={styles.fieldHint}>Must be 3–30 characters (letters, numbers, spaces, underscores, hyphens).</span>
                )}
              </div>

              {/* Avatar Preset Selector */}
              <div className={styles.avatarSection}>
                <label className={styles.sectionLabel}>
                  <span>Select Avatar Emblem</span>
                  <span className={styles.charCounter}>Active: {avatar}</span>
                </label>
                <div className={styles.avatarGrid}>
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      id={`avatar-opt-${preset.id}`}
                      className={`${styles.avatarOption} ${avatar === preset.id ? styles.avatarOptionActive : ''}`}
                      onClick={() => setAvatar(preset.id)}
                    >
                      <span className={styles.avatarIcon}>{preset.icon}</span>
                      <span className={styles.avatarLabel}>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio Field */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="profile-input-bio">
                  <span>Player Bio</span>
                  <span className={styles.charCounter}>{bio.length}/250</span>
                </label>
                <textarea
                  id="profile-input-bio"
                  className={styles.textarea}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share your gaming bio, favorite genres, or community playstyle..."
                  maxLength={250}
                  rows={3}
                />
              </div>

              {/* Preferences Grid */}
              <div className={styles.prefGrid}>
                {/* Theme Selector */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="profile-select-theme">
                    <span>Obsidian Theme</span>
                  </label>
                  <select
                    id="profile-select-theme"
                    className={styles.select}
                    value={preferences.theme}
                    onChange={(e: any) => setPreferences((p) => ({ ...p, theme: e.target.value }))}
                  >
                    <option value="dark-obsidian">Dark Obsidian (Default)</option>
                    <option value="cyber-neon">Cyber Neon Glow</option>
                    <option value="midnight-void">Midnight Void</option>
                  </select>
                </div>

                {/* Privacy Mode */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="profile-select-privacy">
                    <span>Career Privacy</span>
                  </label>
                  <select
                    id="profile-select-privacy"
                    className={styles.select}
                    value={preferences.privacyMode}
                    onChange={(e: any) => setPreferences((p) => ({ ...p, privacyMode: e.target.value }))}
                  >
                    <option value="public">Public (Show on Boards)</option>
                    <option value="friends-only">Friends Only</option>
                    <option value="private">Private (Stealth)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className={styles.prefGrid}>
                <div className={styles.prefCard}>
                  <div className={styles.prefInfo}>
                    <span className={styles.prefTitle}>Sound Effects</span>
                    <span className={styles.prefDesc}>Game launch & arcade audio</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      id="profile-toggle-sound"
                      checked={preferences.soundEnabled}
                      onChange={(e) => setPreferences((p) => ({ ...p, soundEnabled: e.target.checked }))}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                <div className={styles.prefCard}>
                  <div className={styles.prefInfo}>
                    <span className={styles.prefTitle}>Notifications</span>
                    <span className={styles.prefDesc}>Achievement unlock alerts</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      id="profile-toggle-notifications"
                      checked={preferences.notificationsEnabled}
                      onChange={(e) => setPreferences((p) => ({ ...p, notificationsEnabled: e.target.checked }))}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>

              {/* Protected Attributes Guard */}
              <div className={styles.securityNotice}>
                <div className={styles.securityNoticeIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <div>
                  <strong>Security Guard:</strong> Privileged account attributes (Account ID, Email, Role, Subscription Tier, Gamerscore) are strictly protected and immutable via profile updates.
                </div>
              </div>

              {/* Form Buttons */}
              <div className={styles.footer} style={{ padding: '0.75rem 0 0', borderTop: 'none' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={onClose}
                  id="btnCancelProfile"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={saving || !!nameError}
                  id="btnSaveProfile"
                >
                  {saving ? (
                    <span>Saving Changes...</span>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
