/**
 * LocalStorageProxy
 *
 * Manages all read/write operations for the pyknowledge_progress key
 * stored in the browser's LocalStorage API. Progress is serialized as
 * a single JSON string to minimize storage overhead.
 *
 * LocalStorage structure (pyknowledge_progress):
 * {
 *   modules: {
 *     [moduleID]: {
 *       quiz_score:    number  — percentage (0-100) from last attempt
 *       is_completed:  boolean — module quiz has been submitted
 *       is_unlocked:   boolean — checkPrerequisite() returned true
 *     }
 *   },
 *   total_progress: number  — overall curriculum completion (0.0–1.0)
 *   badge_array:    string[] — earned achievement identifiers
 * }
 */
class LocalStorageProxy {
  constructor() {
    this._progressKey = 'pyknowledge_progress';
  }

  /**
   * Read the full progress state from LocalStorage.
   * Returns a parsed object, or a default empty state if not yet initialized.
   * @returns {object}
   */
  readProgress() {
    try {
      const raw = localStorage.getItem(this._progressKey);
      if (!raw) {
        return this._defaultState();
      }
      return JSON.parse(raw);
    } catch {
      return this._defaultState();
    }
  }

  /**
   * Write an updated progress state to LocalStorage.
   * @param {object} data — the full progress state object
   */
  writeProgress(data) {
    try {
      localStorage.setItem(this._progressKey, JSON.stringify(data));
    } catch (err) {
      console.error('[LocalStorageProxy] Failed to persist progress:', err);
    }
  }

  /**
   * Update a single module's progress record without overwriting the rest.
   * @param {string} moduleID
   * @param {object} moduleData — partial { quiz_score, is_completed, is_unlocked }
   */
  updateModule(moduleID, moduleData) {
    const state = this.readProgress();
    state.modules[moduleID] = Object.assign(
      state.modules[moduleID] || {},
      moduleData
    );
    this._recalculateTotalProgress(state);
    this.writeProgress(state);
  }

  /**
   * Award a badge if not already present.
   * @param {string} badgeID
   */
  awardBadge(badgeID) {
    const state = this.readProgress();
    if (!state.badge_array.includes(badgeID)) {
      state.badge_array.push(badgeID);
      this.writeProgress(state);
    }
  }

  /**
   * Clear all stored progress (reset to defaults).
   */
  clearProgress() {
    localStorage.removeItem(this._progressKey);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _defaultState() {
    return {
      modules: {},
      total_progress: 0,
      badge_array: []
    };
  }

  _recalculateTotalProgress(state) {
    const moduleIDs = Object.keys(state.modules);
    if (moduleIDs.length === 0) {
      state.total_progress = 0;
      return;
    }
    const completed = moduleIDs.filter(id => state.modules[id].is_completed).length;
    state.total_progress = parseFloat((completed / 15).toFixed(4));
  }
}
