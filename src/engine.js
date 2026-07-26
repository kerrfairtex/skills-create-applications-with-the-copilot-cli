/**
 * ExecutionEngine
 *
 * The core JavaScript (ES6+) execution engine for the PyKnowledge
 * offline educational platform. Implements the three primary functional
 * objects defined in the Class Diagram (section 4.7.2):
 *
 *   • loadModule(moduleID)      — fetches lesson data from lessons.json
 *   • calculateScore(responses) — binary comparison against quizzes.json
 *   • checkPrerequisite()       — enforces the ≥ 75% competency threshold
 *
 * All operations are client-side; no server or network call is required
 * after the initial cache population by the Service Worker.
 */
class ExecutionEngine {
  /**
   * @param {LocalStorageProxy}   storageProxy — persists user progress
   * @param {ServiceWorkerProxy}  cacheProxy   — serves cached assets
   */
  constructor(storageProxy, cacheProxy) {
    this._storage = storageProxy;
    this._cache   = cacheProxy;

    // In-memory caches to avoid redundant fetches within a session
    this._lessonsCache = null;
    this._quizzesCache = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Fetch the lesson identified by moduleID from the local lessons.json
   * dictionary. Uses the Cache API (via ServiceWorkerProxy) so the app
   * functions without network connectivity after the first load.
   *
   * @param   {string}          moduleID — e.g. "variables", "oop"
   * @returns {Promise<object|null>}     lesson object or null if not found
   */
  async loadModule(moduleID) {
    const lessons = await this._getLessons();
    if (!lessons) return null;

    const lesson = lessons.find(l => l.moduleID === moduleID);
    if (!lesson) {
      console.warn('[ExecutionEngine] Module not found:', moduleID);
      return null;
    }
    return lesson;
  }

  /**
   * Evaluate the student's response array against the answer key stored
   * in quizzes.json. Persists the score to LocalStorage and returns the
   * numeric percentage result.
   *
   * Binary comparison: each response element is compared with its
   * corresponding answer key element; no partial credit is awarded.
   *
   * @param   {string[]} responses — e.g. ["A","C","B","D",…] (10 elements)
   * @param   {string}   moduleID  — the quiz / lesson this attempt belongs to
   * @returns {Promise<number>}    percentage score (0–100)
   */
  async calculateScore(responses, moduleID) {
    const quizzes = await this._getQuizzes();
    if (!quizzes) return 0;

    const quiz = quizzes.find(q => q.lessonRef === moduleID);
    if (!quiz) {
      console.warn('[ExecutionEngine] Quiz not found for module:', moduleID);
      return 0;
    }

    const answerKey = quiz.answerKey;
    let correct = 0;
    const total = answerKey.length;

    for (let i = 0; i < total; i++) {
      if (responses[i] && responses[i].toUpperCase() === answerKey[i].toUpperCase()) {
        correct++;
      }
    }

    const score = Math.round((correct / total) * 100);

    // Persist the score immediately
    this._storage.updateModule(moduleID, {
      quiz_score:   score,
      is_completed: true,
      is_unlocked:  this._meetsThreshold(score)
    });

    return score;
  }

  /**
   * Validate the completion state for a given module and enforce the
   * sequential competency threshold (≥ 75%) required for advancement.
   *
   * If the prerequisite is met, the module state is updated to
   * is_unlocked = true in LocalStorage.
   *
   * @param   {string}  moduleID — the module to check prerequisites for
   * @param   {string}  [requiredModuleID] — the preceding module that must be passed
   * @returns {boolean} true if the student may proceed; false otherwise
   */
  checkPrerequisite(moduleID, requiredModuleID = null) {
    const progress = this._storage.readProgress();

    // If there is no prerequisite module (first module), always unlock
    if (!requiredModuleID) {
      this._storage.updateModule(moduleID, { is_unlocked: true });
      return true;
    }

    const prerequisiteState = progress.modules[requiredModuleID];
    if (!prerequisiteState) return false;

    const prerequisiteMet = prerequisiteState.is_completed &&
                            this._meetsThreshold(prerequisiteState.quiz_score);

    if (prerequisiteMet) {
      this._storage.updateModule(moduleID, { is_unlocked: true });
      this._checkAndAwardBadge(requiredModuleID, prerequisiteState.quiz_score);
    }

    return prerequisiteMet;
  }

  /**
   * Return the ordered list of all lesson module identifiers from
   * lessons.json. Used by the dashboard to render the learning path.
   * @returns {Promise<string[]>}
   */
  async getModuleIDs() {
    const lessons = await this._getLessons();
    if (!lessons) return [];
    const ids = lessons.map(l => l.moduleID);

    // Persist the total module count so LocalStorageProxy can calculate
    // total_progress dynamically without a hardcoded magic number.
    const state = this._storage.readProgress();
    if (state.totalModuleCount !== ids.length) {
      state.totalModuleCount = ids.length;
      this._storage.writeProgress(state);
    }

    return ids;
  }

  /**
   * Fetch the quiz object for a given moduleID from the cached quizzes.json.
   * Provides a public, encapsulated way to retrieve quiz data without
   * exposing the internal _cache reference to external callers (e.g., UI_Layer).
   *
   * @param   {string}          moduleID
   * @returns {Promise<object|null>}
   */
  async getQuizForModule(moduleID) {
    const quizzes = await this._getQuizzes();
    if (!quizzes) return null;
    return quizzes.find(q => q.lessonRef === moduleID) || null;
  }



  /** Lazily load and cache lessons.json */
  async _getLessons() {
    if (this._lessonsCache) return this._lessonsCache;
    try {
      const response = await this._cache.fetchAsset('/data/lessons.json');
      if (!response || !response.ok) throw new Error('Bad response for lessons.json');
      this._lessonsCache = await response.json();
      return this._lessonsCache;
    } catch (err) {
      console.error('[ExecutionEngine] Could not load lessons.json:', err);
      return null;
    }
  }

  /** Lazily load and cache quizzes.json */
  async _getQuizzes() {
    if (this._quizzesCache) return this._quizzesCache;
    try {
      const response = await this._cache.fetchAsset('/data/quizzes.json');
      if (!response || !response.ok) throw new Error('Bad response for quizzes.json');
      this._quizzesCache = await response.json();
      return this._quizzesCache;
    } catch (err) {
      console.error('[ExecutionEngine] Could not load quizzes.json:', err);
      return null;
    }
  }

  /** Returns true when a score meets the ≥ 75% competency threshold */
  _meetsThreshold(score) {
    return typeof score === 'number' && score >= 75;
  }

  /** Award a mastery badge based on score tier */
  _checkAndAwardBadge(moduleID, score) {
    if (score === 100) {
      this._storage.awardBadge(`perfect-${moduleID}`);
    } else if (score >= 90) {
      this._storage.awardBadge(`distinction-${moduleID}`);
    } else if (score >= 75) {
      this._storage.awardBadge(`pass-${moduleID}`);
    }
  }
}
