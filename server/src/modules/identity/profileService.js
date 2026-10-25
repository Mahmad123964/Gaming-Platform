/**
 * NexusPlay — Player Profile Service
 * Traceability: EP01-04 (Player Profile Management)
 * Acceptance Criteria: AC-4.1, AC-4.2, AC-4.3
 */

const crypto = require('node:crypto');
const { getDb } = require('../../db');

const ALLOWED_AVATAR_PRESETS = [
  'pilot-cyan',
  'cyber-sentinel',
  'neon-commander',
  'obsidian-ace',
  'quantum-ghost',
  'retro-droid',
  'cyber-neon',
  'pixel-invader',
  'phantom-scout',
  'void-walker',
  'quantum-pilot',
  'solar-sentinel'
];

const ALLOWED_THEMES = ['obsidian', 'dark', 'cyberpunk', 'dark-obsidian', 'cyber-neon', 'midnight-void'];
const ALLOWED_PRIVACY_MODES = ['public', 'friends-only', 'private'];

class ProfileService {
  constructor(db) {
    this.db = db || getDb();
    this.ensureTables();
  }

  ensureTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        id TEXT PRIMARY KEY,
        player_id TEXT UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT 'pilot-cyan',
        bio TEXT NOT NULL DEFAULT '',
        preferences_json TEXT NOT NULL DEFAULT '{"theme":"obsidian","soundEnabled":true,"notificationsEnabled":true,"privacyMode":"public"}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      this.db.run(`
        INSERT OR IGNORE INTO player_profiles (id, player_id, display_name)
        SELECT 'prof-' || id, id, display_name FROM players
      `);
    } catch (_) {}
  }

  /**
   * Ensure a profile record exists for the given player
   */
  ensureProfileExists(playerId, fallbackDisplayName = 'Player') {
    const existing = this.db.get('SELECT * FROM player_profiles WHERE player_id = ?', [playerId]);
    if (existing) return existing;

    const player = this.db.get('SELECT display_name FROM players WHERE id = ?', [playerId]);
    const displayName = player ? player.display_name : fallbackDisplayName;
    const profileId = 'prof-' + crypto.randomUUID();

    const defaultPrefs = JSON.stringify({
      theme: 'obsidian',
      soundEnabled: true,
      notificationsEnabled: true,
      privacyMode: 'public'
    });

    this.db.run(
      `INSERT OR IGNORE INTO player_profiles (id, player_id, display_name, avatar, bio, preferences_json, created_at, updated_at)
       VALUES (?, ?, ?, 'pilot-cyan', '', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [profileId, playerId, displayName, defaultPrefs]
    );

    return this.db.get('SELECT * FROM player_profiles WHERE player_id = ?', [playerId]);
  }

  /**
   * Retrieve player profile
   * Enforces privacy mode if requested by another player
   */
  getProfile(targetPlayerId, requestingPlayerId = null) {
    const player = this.db.get('SELECT id, email, display_name, role, status, created_at FROM players WHERE id = ?', [targetPlayerId]);
    if (!player) {
      const err = new Error(`Player with ID '${targetPlayerId}' not found.`);
      err.status = 404;
      err.code = 'PLAYER_NOT_FOUND';
      throw err;
    }

    const profileRow = this.ensureProfileExists(player.id, player.display_name);

    let preferences = {
      theme: 'obsidian',
      soundEnabled: true,
      notificationsEnabled: true,
      privacyMode: 'public'
    };

    try {
      if (profileRow.preferences_json) {
        preferences = { ...preferences, ...JSON.parse(profileRow.preferences_json) };
      }
    } catch (_) {}

    // Aggregate player career statistics (gamerscore, achievements, sessions, checkpoints)
    const pointsRow = this.db.get(
      `SELECT COALESCE(SUM(a.points), 0) as total_points, COUNT(pa.id) as unlock_count
       FROM player_achievements pa
       JOIN achievements a ON pa.achievement_id = a.id
       WHERE pa.player_id = ?`,
      [player.id]
    );

    const historyCountRow = this.db.get(
      'SELECT COUNT(id) as session_count FROM game_history WHERE player_id = ?',
      [player.id]
    );

    const checkpointRow = this.db.get(
      'SELECT level, score, updated_at FROM game_progress WHERE player_id = ? ORDER BY updated_at DESC LIMIT 1',
      [player.id]
    );

    // Active subscription status
    const subRow = this.db.get(
      `SELECT s.status, s.current_period_end, p.name as plan_name
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.player_id = ? AND s.status = 'active'
       ORDER BY s.current_period_end DESC LIMIT 1`,
      [player.id]
    );

    const isSelf = requestingPlayerId && requestingPlayerId === player.id;
    const isPrivate = preferences.privacyMode === 'private' && !isSelf;

    const stats = {
      totalGamerscore: pointsRow ? pointsRow.total_points : 0,
      unlockedAchievements: pointsRow ? pointsRow.unlock_count : 0,
      completedSessions: historyCountRow ? historyCountRow.session_count : 0,
      highestLevelCheckpoint: checkpointRow ? checkpointRow.level : 1
    };

    if (isPrivate) {
      return {
        id: profileRow.id,
        playerId: player.id,
        displayName: profileRow.display_name,
        avatar: profileRow.avatar,
        bio: profileRow.bio,
        privacyMode: 'private',
        isPrivate: true,
        message: 'This player profile is set to private by the account owner.'
      };
    }

    return {
      id: profileRow.id,
      playerId: player.id,
      email: isSelf ? player.email : undefined,
      displayName: profileRow.display_name,
      avatar: profileRow.avatar,
      bio: profileRow.bio,
      preferences: isSelf ? preferences : { theme: preferences.theme, privacyMode: preferences.privacyMode },
      role: player.role,
      status: player.status,
      subscription: subRow ? { plan: subRow.plan_name, status: subRow.status, expiresAt: subRow.current_period_end } : null,
      stats,
      isSelf: !!isSelf,
      createdAt: profileRow.created_at,
      updatedAt: profileRow.updated_at
    };
  }

  /**
   * Update player profile with strict field validation and privileged attribute protection
   * Traceability: EP01-04, AC-4.1, AC-4.2, AC-4.3
   */
  updateProfile(playerId, updates = {}) {
    if (!playerId) {
      const err = new Error('Authentication required: Profile updates require an active signed-in session (AC-4.3).');
      err.status = 401;
      err.code = 'AUTHENTICATION_REQUIRED';
      throw err;
    }

    const player = this.db.get('SELECT id, email, display_name, role FROM players WHERE id = ?', [playerId]);
    if (!player) {
      const err = new Error('Player account not found.');
      err.status = 404;
      err.code = 'PLAYER_NOT_FOUND';
      throw err;
    }

    const currentProfile = this.ensureProfileExists(player.id, player.display_name);

    let currentPrefs = {
      theme: 'obsidian',
      soundEnabled: true,
      notificationsEnabled: true,
      privacyMode: 'public'
    };
    try {
      if (currentProfile.preferences_json) {
        currentPrefs = { ...currentPrefs, ...JSON.parse(currentProfile.preferences_json) };
      }
    } catch (_) {}

    // Security Gate: Reject or strip attempts to modify privileged security fields
    const {
      displayName,
      avatar,
      bio,
      preferences,
      // Privileged fields that MUST NOT be modified via profile
      role,
      email,
      status,
      id,
      playerId: submittedPlayerId,
      password,
      passwordHash,
      gamerscore,
      subscription
    } = updates;

    // Field Validation: Display Name (AC-4.1, AC-4.2)
    let newDisplayName = currentProfile.display_name;
    if (displayName !== undefined) {
      if (typeof displayName !== 'string') {
        const err = new Error('Invalid display name: Value must be a valid text string (AC-4.2).');
        err.status = 400;
        err.code = 'INVALID_DISPLAY_NAME';
        throw err;
      }

      const trimmedName = displayName.trim();
      if (trimmedName.length < 3 || trimmedName.length > 30) {
        const err = new Error('Invalid display name: Length must be between 3 and 30 characters inclusive (AC-4.2).');
        err.status = 400;
        err.code = 'INVALID_DISPLAY_NAME_LENGTH';
        err.details = { minLength: 3, maxLength: 30, currentLength: trimmedName.length };
        throw err;
      }

      // Allowed characters: alphanumeric, underscores, hyphens, and spaces
      const validNamePattern = /^[a-zA-Z0-9_\- ]+$/;
      if (!validNamePattern.test(trimmedName)) {
        const err = new Error('Invalid display name: Only letters, numbers, hyphens, underscores, and spaces are permitted (AC-4.2).');
        err.status = 400;
        err.code = 'INVALID_DISPLAY_NAME_CHARACTERS';
        throw err;
      }

      newDisplayName = trimmedName;
    }

    // Field Validation: Avatar
    let newAvatar = currentProfile.avatar;
    if (avatar !== undefined) {
      if (typeof avatar !== 'string') {
        const err = new Error('Invalid avatar value: Avatar must be a valid preset identifier or HTTPS URL (AC-4.2).');
        err.status = 400;
        err.code = 'INVALID_AVATAR';
        throw err;
      }

      const trimmedAvatar = avatar.trim();
      const isPreset = ALLOWED_AVATAR_PRESETS.includes(trimmedAvatar);
      const isHttpsUrl = trimmedAvatar.startsWith('https://') && trimmedAvatar.length <= 500;

      if (!isPreset && !isHttpsUrl) {
        const err = new Error(`Invalid avatar: Must be one of [${ALLOWED_AVATAR_PRESETS.join(', ')}] or an authorized HTTPS image URL (AC-4.2).`);
        err.status = 400;
        err.code = 'INVALID_AVATAR_PRESET';
        err.details = { allowedPresets: ALLOWED_AVATAR_PRESETS };
        throw err;
      }

      newAvatar = trimmedAvatar;
    }

    // Field Validation: Bio
    let newBio = currentProfile.bio || '';
    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        const err = new Error('Invalid bio: Bio must be text (AC-4.2).');
        err.status = 400;
        err.code = 'INVALID_BIO';
        throw err;
      }

      if (bio.length > 250) {
        const err = new Error('Invalid bio: Biography exceeds maximum limit of 250 characters (AC-4.2).');
        err.status = 400;
        err.code = 'BIO_TOO_LONG';
        err.details = { maxLength: 250, currentLength: bio.length };
        throw err;
      }

      newBio = bio.trim();
    }

    // Field Validation: Preferences
    let newPrefs = { ...currentPrefs };
    if (preferences !== undefined) {
      if (typeof preferences !== 'object' || preferences === null || Array.isArray(preferences)) {
        const err = new Error('Invalid preferences: Value must be an object of key-value settings (AC-4.2).');
        err.status = 400;
        err.code = 'INVALID_PREFERENCES';
        throw err;
      }

      if (preferences.theme !== undefined) {
        if (!ALLOWED_THEMES.includes(preferences.theme)) {
          const err = new Error(`Invalid theme: Must be one of [${ALLOWED_THEMES.join(', ')}] (AC-4.2).`);
          err.status = 400;
          err.code = 'INVALID_THEME';
          throw err;
        }
        newPrefs.theme = preferences.theme;
      }

      if (preferences.privacyMode !== undefined) {
        if (!ALLOWED_PRIVACY_MODES.includes(preferences.privacyMode)) {
          const err = new Error(`Invalid privacy mode: Must be one of [${ALLOWED_PRIVACY_MODES.join(', ')}] (AC-4.2).`);
          err.status = 400;
          err.code = 'INVALID_PRIVACY_MODE';
          throw err;
        }
        newPrefs.privacyMode = preferences.privacyMode;
      }

      if (preferences.soundEnabled !== undefined) {
        newPrefs.soundEnabled = Boolean(preferences.soundEnabled);
      }

      if (preferences.notificationsEnabled !== undefined) {
        newPrefs.notificationsEnabled = Boolean(preferences.notificationsEnabled);
      }
    }

    // Execute updates transactionally across player_profiles and players (AC-4.1)
    const executeProfileUpdate = () => {
      this.db.run(
        `UPDATE player_profiles
         SET display_name = ?, avatar = ?, bio = ?, preferences_json = ?, updated_at = CURRENT_TIMESTAMP
         WHERE player_id = ?`,
        [newDisplayName, newAvatar, newBio, JSON.stringify(newPrefs), player.id]
      );

      // If display name was updated, synchronize players table display_name
      if (newDisplayName !== player.display_name) {
        this.db.run(
          `UPDATE players
           SET display_name = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [newDisplayName, player.id]
        );
      }
    };

    if (typeof this.db.transaction === 'function') {
      this.db.transaction(executeProfileUpdate);
    } else {
      this.db.run('BEGIN IMMEDIATE;');
      try {
        executeProfileUpdate();
        this.db.run('COMMIT;');
      } catch (txErr) {
        try { this.db.run('ROLLBACK;'); } catch (_) {}
        throw txErr;
      }
    }

    const updatedProfile = this.getProfile(player.id, player.id);

    return {
      success: true,
      message: 'Profile settings updated successfully (AC-4.1).',
      profile: updatedProfile
    };
  }
}

let instance = null;
function getProfileService(customDb) {
  if (!instance || customDb) {
    instance = new ProfileService(customDb);
  }
  return instance;
}

module.exports = {
  ProfileService,
  getProfileService,
  ALLOWED_AVATAR_PRESETS,
  ALLOWED_THEMES,
  ALLOWED_PRIVACY_MODES
};
