/**
 * UI_Layer
 *
 * Manages all DOM interactions for the PyKnowledge platform.
 * Implements the four public methods defined in the Class Diagram
 * (section 4.7.2) and orchestrates the user-facing presentation layer.
 *
 * Responsibilities:
 *   • renderDashboard()       — build the module grid from engine data
 *   • displayLesson(content)  — inject lesson HTML into the content pane
 *   • notifyScore(score)      — show the score result and feedback
 *   • toggleDarkMode()        — switch the dark/light color theme
 */
class UI_Layer {
  /**
   * @param {ExecutionEngine}  engine  — the core computation layer
   * @param {LocalStorageProxy} storage — direct progress reads for rendering
   */
  constructor(engine, storage) {
    this._engine  = engine;
    this._storage = storage;
    this._darkMode = false;

    // Bound DOM element references (populated in init())
    this._els = {};
  }

  /**
   * Initialize the UI layer. Call once after the DOM is ready.
   */
  init() {
    this._els = {
      dashboard:      document.getElementById('dashboard'),
      contentPane:    document.getElementById('content-pane'),
      quizPane:       document.getElementById('quiz-pane'),
      scoreDisplay:   document.getElementById('score-display'),
      progressBar:    document.getElementById('progress-bar'),
      progressText:   document.getElementById('progress-text'),
      badgeContainer: document.getElementById('badge-container'),
      themeToggle:    document.getElementById('theme-toggle'),
      navBack:        document.getElementById('nav-back')
    };

    if (this._els.themeToggle) {
      this._els.themeToggle.addEventListener('click', () => this.toggleDarkMode());
    }
    if (this._els.navBack) {
      this._els.navBack.addEventListener('click', () => this._showSection('dashboard'));
    }

    // Sync internal _darkMode state with the theme the FOUC-prevention script may have set
    this._darkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    if (this._els.themeToggle) {
      this._els.themeToggle.textContent = this._darkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
    }

    this.renderDashboard();
  }

  // ── Public API (Class Diagram methods) ─────────────────────────────────────

  /**
   * Build and render the module dashboard grid.
   * Reads the current progress state from LocalStorage to mark each
   * module as locked, unlocked, or completed.
   */
  async renderDashboard() {
    const dashboard = this._els.dashboard;
    if (!dashboard) return;

    const moduleIDs = await this._engine.getModuleIDs();
    const progress  = this._storage.readProgress();

    dashboard.innerHTML = '';

    for (let i = 0; i < moduleIDs.length; i++) {
      const id    = moduleIDs[i];
      const state = progress.modules[id] || {};
      const card  = this._buildModuleCard(id, state, i);
      dashboard.appendChild(card);
    }

    this._updateProgressUI(progress);
    this._updateBadges(progress.badge_array || []);
    this._showSection('dashboard');
  }

  /**
   * Render lesson HTML content (syntax-highlighted) into the content pane.
   * @param {string} html — pre-formatted lesson HTML from lessons.json
   */
  displayLesson(html) {
    const pane = this._els.contentPane;
    if (!pane) return;
    pane.innerHTML = html;
    this._highlightCode(pane);
    this._showSection('content');
  }

  /**
   * Display the numeric score and corresponding feedback message.
   * Scrolls the score display into view automatically.
   *
   * @param {number} score — percentage (0–100)
   * @param {string} moduleID — used to compose the "next module" CTA
   */
  notifyScore(score, moduleID) {
    const el = this._els.scoreDisplay;
    if (!el) return;

    const passed  = score >= 75;
    const emoji   = score === 100 ? '🏆' : passed ? '✅' : '❌';
    const message = passed
      ? `Congratulations! You scored <strong>${score}%</strong> — module unlocked! ${emoji}`
      : `You scored <strong>${score}%</strong>. A minimum of 75% is required. Please review the material and try again. ${emoji}`;

    el.innerHTML = `
      <div class="score-card ${passed ? 'score-pass' : 'score-fail'}">
        <p class="score-value">${score}<span>%</span></p>
        <p class="score-message">${message}</p>
        <button id="btn-return-dashboard" class="btn-primary">
          Return to Dashboard
        </button>
      </div>`;

    const btnReturn = el.querySelector('#btn-return-dashboard');
    if (btnReturn) {
      btnReturn.addEventListener('click', () => this.renderDashboard());
    }

    this._showSection('score');
    el.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Toggle between dark and light color themes.
   * Persists the preference using a data attribute on <html>.
   */
  toggleDarkMode() {
    this._darkMode = !this._darkMode;
    const theme = this._darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (this._els.themeToggle) {
      this._els.themeToggle.textContent = this._darkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
    // Persist preference so the inline FOUC-prevention script can restore it on reload
    try {
      localStorage.setItem('pyknowledge_theme', theme);
    } catch (_) { /* LocalStorage unavailable — non-critical */ }
  }

  // ── Quiz rendering ─────────────────────────────────────────────────────────

  /**
   * Render a quiz form for the specified module and wire up the submit handler.
   * @param {object} quiz     — quiz object from quizzes.json
   * @param {string} moduleID
   */
  renderQuiz(quiz, moduleID) {
    const pane = this._els.quizPane;
    if (!pane) return;

    const questionsHTML = quiz.questionSet.map((q, idx) => `
      <div class="quiz-question" data-index="${idx}">
        <p class="question-text">${idx + 1}. ${q.question}</p>
        <div class="choices">
          ${q.choices.map(choice => {
            const letter = choice.charAt(0);
            return `<label class="choice-label">
              <input type="radio" name="q${idx}" value="${letter}" required />
              ${choice}
            </label>`;
          }).join('')}
        </div>
      </div>`).join('');

    pane.innerHTML = `
      <form id="quiz-form">
        <h2>Quiz: ${moduleID}</h2>
        ${questionsHTML}
        <button type="submit" class="btn-primary">Submit Answers</button>
      </form>`;

    pane.querySelector('#quiz-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const responses = quiz.questionSet.map((_, idx) => {
        const selected = pane.querySelector(`input[name="q${idx}"]:checked`);
        return selected ? selected.value : '';
      });
      const score = await this._engine.calculateScore(responses, moduleID);
      this.notifyScore(score, moduleID);
      this.renderDashboard();
    });

    this._showSection('quiz');
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _buildModuleCard(moduleID, state, index) {
    const isLocked     = !state.is_unlocked && index !== 0;
    const isCompleted  = !!state.is_completed;
    const score        = state.quiz_score != null ? `${state.quiz_score}%` : '—';

    const card = document.createElement('div');
    card.className = `module-card ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`;
    card.dataset.moduleId = moduleID;
    card.innerHTML = `
      <span class="module-badge">${isCompleted ? '✅' : isLocked ? '🔒' : '📖'}</span>
      <h3>${this._formatTitle(moduleID)}</h3>
      <p class="module-score">Best: ${score}</p>`;

    if (!isLocked) {
      card.addEventListener('click', () => this._onModuleSelect(moduleID));
    }
    return card;
  }

  async _onModuleSelect(moduleID) {
    const lesson = await this._engine.loadModule(moduleID);
    if (!lesson) return;
    this.displayLesson(lesson.content);

    const startQuizBtn = document.createElement('button');
    startQuizBtn.className = 'btn-primary btn-start-quiz';
    startQuizBtn.textContent = 'Take Quiz';
    startQuizBtn.addEventListener('click', async () => {
      const response = await this._engine._cache.fetchAsset('/data/quizzes.json');
      const quizzes  = response ? await response.json() : [];
      const quiz     = quizzes.find(q => q.lessonRef === moduleID);
      if (quiz) this.renderQuiz(quiz, moduleID);
    });

    this._els.contentPane.appendChild(startQuizBtn);
  }

  _updateProgressUI(progress) {
    const pct = Math.round((progress.total_progress || 0) * 100);
    if (this._els.progressBar)  this._els.progressBar.style.width  = `${pct}%`;
    if (this._els.progressText) this._els.progressText.textContent = `${pct}% complete`;
  }

  _updateBadges(badgeArray) {
    const container = this._els.badgeContainer;
    if (!container) return;
    container.innerHTML = badgeArray.length
      ? badgeArray.map(b => `<span class="badge">${b}</span>`).join('')
      : '<span class="badge-empty">No badges yet</span>';
  }

  /** Apply basic syntax highlighting using CSS classes */
  _highlightCode(container) {
    container.querySelectorAll('code').forEach(block => {
      block.classList.add('highlighted');
    });
  }

  /** Show only the specified section; hide all others */
  _showSection(section) {
    const sections = {
      dashboard: this._els.dashboard,
      content:   this._els.contentPane,
      quiz:      this._els.quizPane,
      score:     this._els.scoreDisplay
    };
    Object.entries(sections).forEach(([key, el]) => {
      if (el) el.style.display = key === section ? '' : 'none';
    });
    if (this._els.navBack) {
      this._els.navBack.style.display = section !== 'dashboard' ? '' : 'none';
    }
  }

  _formatTitle(moduleID) {
    return moduleID
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
