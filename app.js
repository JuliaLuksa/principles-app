import { translations, t } from './i18n.js';
import { newCard, review, isDue, isLearned, buildSession, stats } from './srs.js';

const STORAGE_KEY = 'principles-app-v1';
const LANG_KEY = 'principles-lang';

const state = {
  data: null,
  lang: localStorage.getItem(LANG_KEY) || (navigator.language?.startsWith('pl') ? 'pl' : 'en'),
  progress: {},
  streak: { count: 0, lastDate: null },
  session: null
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.progress = parsed.progress || {};
      state.streak = parsed.streak || { count: 0, lastDate: null };
    }
  } catch (e) {
    console.warn('Failed to load state', e);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: state.progress, streak: state.streak }));
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function bumpStreak() {
  const today = todayISO();
  if (state.streak.lastDate === today) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  if (state.streak.lastDate === yesterday) {
    state.streak.count += 1;
  } else {
    state.streak.count = 1;
  }
  state.streak.lastDate = today;
  saveState();
}

function tt(path) { return t(state.lang, path); }

function localized(field) {
  if (typeof field === 'string') return field;
  return field[state.lang] || field.en;
}

function allPrincipleIds() {
  return state.data.collections.flatMap((c) => c.principles.map((p) => p.id));
}

function findPrinciple(id) {
  for (const c of state.data.collections) {
    const p = c.principles.find((x) => x.id === id);
    if (p) return { ...p, collection: c };
  }
  return null;
}

const CHEVRON = `<svg class="chevron" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHECK_CIRCLE = `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="36" cy="36" r="32" fill="currentColor" opacity="0.15"/><path d="M22 36l11 11 18-22" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const TARGET = `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="36" cy="36" r="32" stroke="currentColor" stroke-width="3.5" fill="none" opacity="0.3"/><circle cx="36" cy="36" r="20" stroke="currentColor" stroke-width="3.5" fill="none" opacity="0.6"/><circle cx="36" cy="36" r="8" fill="currentColor"/></svg>`;
const LEAF = `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 58c0-24 16-44 44-44-2 28-18 44-44 44z" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 58l28-28" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  document.getElementById('lang-pl').setAttribute('aria-pressed', String(lang === 'pl'));
  document.getElementById('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = tt(el.dataset.i18n);
  });
  render();
}

/* ROUTING */
function currentRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/home';
  const parts = hash.split('/').filter(Boolean);
  return { name: parts[0] || 'home', params: parts.slice(1) };
}

function navigate(path) {
  window.location.hash = path;
}

function render() {
  if (!state.data) return;
  const route = currentRoute();
  const view = document.getElementById('view');
  view.innerHTML = '';
  document.querySelectorAll('.nav-item').forEach((el) => {
    const matches = route.name === el.dataset.route || (route.name === 'home' && el.dataset.route === 'home');
    if (matches) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  const handlers = { home: renderHome, daily: renderDaily, explore: renderExplore, quiz: renderQuiz, settings: renderSettings };
  const handler = handlers[route.name] || renderHome;
  handler(view, route.params);
}

/* HOME */
function renderHome(root) {
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'home.greetingMorning' : hour < 18 ? 'home.greetingAfternoon' : 'home.greetingEvening';
  const session = buildSession(state.progress, allPrincipleIds(), { maxNew: 1, maxReviews: 20 });
  const s = stats(state.progress);
  const streakLabel = state.streak.count === 1 ? tt('home.streakOne') : tt('home.streak');

  const sessionBlock = session.total === 0
    ? `<div class="section">
         <div class="list-group">
           <div class="empty-state">
             <div class="empty-state-icon">${LEAF}</div>
             <h2>${tt('home.allDone')}</h2>
             <p>${tt('home.allDoneSub')}</p>
             <a class="btn-secondary" href="#/explore" style="text-decoration: none;">${tt('nav.explore')}</a>
           </div>
         </div>
       </div>`
    : `<div class="section">
         <div class="section-header">${tt('home.todaysSession')}</div>
         <div class="list-group">
           <div class="session-row">
             <div class="session-counts">
               <div><strong>${session.newCards.length}</strong><span class="label-after">${tt('home.newCard')}</span></div>
               <div><strong>${session.reviews.length}</strong><span class="label-after">${tt('home.reviews')}</span></div>
             </div>
             <button class="btn-primary" id="start-session">${tt('home.startDaily')}</button>
           </div>
         </div>
       </div>`;

  root.innerHTML = `
    <h1 class="large-title">${tt(greetingKey)}</h1>
    <p class="large-title-subtitle">${tt('tagline')}</p>

    <div class="section">
      <div class="list-group">
        <div class="streak-row">
          <span class="streak-number">${state.streak.count}</span>
          <span class="streak-label">${streakLabel}</span>
        </div>
      </div>
    </div>

    ${sessionBlock}

    <div class="section">
      <div class="list-group">
        <div class="list-row stat-row">
          <div class="list-row-content"><span class="list-row-title">${tt('home.totalLearned')}</span></div>
          <span class="stat-row-value">${s.learned}</span>
        </div>
        <div class="list-row stat-row">
          <div class="list-row-content"><span class="list-row-title">${tt('home.totalSeen')}</span></div>
          <span class="stat-row-value">${s.total}</span>
        </div>
      </div>
    </div>

    <div class="attribution-footer">
      ${tt('attribution.via')} <a href="https://principles.design/" target="_blank" rel="noopener">principles.design</a> ${tt('attribution.and')}.
    </div>
  `;
  const startBtn = document.getElementById('start-session');
  if (startBtn) startBtn.addEventListener('click', () => navigate('/daily'));
}

/* DAILY */
function renderDaily(root) {
  if (!state.session) {
    const built = buildSession(state.progress, allPrincipleIds(), { maxNew: 1, maxReviews: 20 });
    state.session = {
      queue: [...built.reviews, ...built.newCards],
      total: built.total,
      done: 0
    };
  }
  if (state.session.queue.length === 0) {
    if (state.session.total > 0) bumpStreak();
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${CHECK_CIRCLE}</div>
        <h2>${tt('daily.sessionComplete')}</h2>
        <p>${tt('daily.sessionCompleteSub')}</p>
        <a class="btn-primary" href="#/home" style="text-decoration: none;">${tt('daily.backHome')}</a>
      </div>
    `;
    state.session = null;
    return;
  }

  const card = state.session.queue[0];
  const principle = findPrinciple(card.id);
  if (!principle) {
    state.session.queue.shift();
    renderDaily(root);
    return;
  }

  const progress = ((state.session.done) / state.session.total) * 100;
  const left = state.session.queue.length;

  root.innerHTML = `
    <div class="session-progress">
      <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
      <span>${left} ${tt('daily.cardsLeft')}</span>
    </div>
    <div class="card">
      <div class="card-company">${principle.collection.company}</div>
      <div class="card-title">${principle.title}</div>
      <div class="card-description hidden" id="card-desc">${principle.description}</div>
      <div class="card-source hidden" id="card-source">
        ${tt('daily.source')}: <a href="${principle.collection.sourceUrl}" target="_blank" rel="noopener">${principle.collection.company}</a>
        · ${tt('daily.via')} <a href="${principle.collection.viaUrl}" target="_blank" rel="noopener">principles.design</a>
      </div>
    </div>
    <div class="reveal-wrap">
      <button class="btn-primary" id="reveal-btn">${tt('daily.reveal')}</button>
    </div>
    <div class="rating-buttons hidden" id="rating-btns">
      <button class="btn-again" data-rating="again">
        <span>${tt('daily.again')}</span>
        <span class="rating-hint">${tt('daily.againHint')}</span>
      </button>
      <button class="btn-good" data-rating="good">
        <span>${tt('daily.good')}</span>
      </button>
      <button class="btn-easy" data-rating="easy">
        <span>${tt('daily.easy')}</span>
      </button>
    </div>
  `;

  document.getElementById('reveal-btn').addEventListener('click', () => {
    document.getElementById('card-desc').classList.remove('hidden');
    document.getElementById('card-source').classList.remove('hidden');
    document.querySelector('.reveal-wrap').classList.add('hidden');
    document.getElementById('rating-btns').classList.remove('hidden');
  });

  document.querySelectorAll('[data-rating]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rating = btn.dataset.rating;
      const updated = review(card, rating);
      state.progress[updated.id] = updated;
      saveState();
      if (rating === 'again') {
        state.session.queue.push(updated);
        state.session.queue.shift();
      } else {
        state.session.queue.shift();
        state.session.done += 1;
      }
      render();
    });
  });
}

/* EXPLORE */
function renderExplore(root, params) {
  if (params[0]) return renderCollection(root, params[0]);

  const rows = state.data.collections.map((c) => {
    const seen = c.principles.filter((p) => state.progress[p.id]);
    const learned = seen.filter((p) => isLearned(state.progress[p.id])).length;
    const learningTxt = seen.length > 0 ? ` · ${seen.length} ${tt('explore.learning')}` : '';
    const learnedTxt = learned > 0 ? ` · ${learned} ${tt('explore.learned')}` : '';
    return `
      <a class="collection-row" href="#/explore/${c.id}">
        <div class="collection-content">
          <div class="collection-title">${localized(c.title)}</div>
          <div class="collection-meta">${c.company} · ${c.principles.length} ${tt('explore.principles')}${learningTxt}${learnedTxt}</div>
        </div>
        ${CHEVRON}
      </a>
    `;
  }).join('');

  root.innerHTML = `
    <h1 class="large-title">${tt('explore.title')}</h1>
    <p class="large-title-subtitle">${tt('explore.subtitle')}</p>

    <div class="section">
      <div class="list-group">
        ${rows}
      </div>
    </div>

    <div class="attribution-footer">
      ${tt('attribution.via')} <a href="https://principles.design/" target="_blank" rel="noopener">principles.design</a>.
    </div>
  `;
}

function renderCollection(root, collectionId) {
  const c = state.data.collections.find((x) => x.id === collectionId);
  if (!c) { navigate('/explore'); return; }

  const items = c.principles.map((p) => {
    const inProgress = !!state.progress[p.id];
    const learned = inProgress && isLearned(state.progress[p.id]);
    const status = learned ? `<span class="principle-status learned">${tt('explore.learned')}</span>` : (inProgress ? `<span class="principle-status">${tt('explore.learning')}</span>` : '<span></span>');
    return `
      <div class="principle-item">
        <div class="principle-item-title">${p.title}</div>
        <div class="principle-item-desc">${p.description}</div>
        <div class="principle-actions">
          ${status}
          <button class="toggle-pill ${inProgress ? 'active' : ''}" data-toggle="${p.id}">
            ${inProgress ? tt('explore.added') : tt('explore.add')}
          </button>
        </div>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <a class="back-btn" href="#/explore">${tt('nav.explore')}</a>
    <h1 class="large-title">${localized(c.title)}</h1>
    <p class="large-title-subtitle">${localized(c.description)}</p>

    <div class="section collection-detail">
      <div class="list-group">
        ${items}
      </div>
    </div>

    <div class="section">
      <div class="section-footer">
        <a href="${c.sourceUrl}" target="_blank" rel="noopener">${tt('explore.readSource')} →</a><br/>
        ${tt('explore.viaPrinciples')}: <a href="${c.viaUrl}" target="_blank" rel="noopener">principles.design</a>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggle;
      if (state.progress[id]) {
        delete state.progress[id];
      } else {
        state.progress[id] = newCard(id);
      }
      saveState();
      render();
    });
  });
}

/* QUIZ */
function renderQuiz(root) {
  if (!state.quiz) {
    root.innerHTML = `
      <h1 class="large-title">${tt('quiz.title')}</h1>
      <p class="large-title-subtitle">${tt('quiz.subtitle')}</p>
      <div class="quiz-actions" style="padding: 20px 16px 0;">
        <button class="btn-primary" id="start-quiz">${tt('quiz.start')}</button>
      </div>
      <div class="attribution-footer" style="margin-top: 24px;">
        ${tt('attribution.via')} <a href="https://principles.design/" target="_blank" rel="noopener">principles.design</a>.
      </div>
    `;
    document.getElementById('start-quiz').addEventListener('click', () => {
      state.quiz = buildQuiz();
      render();
    });
    return;
  }

  if (state.quiz.done) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${TARGET}</div>
        <h2>${tt('quiz.yourScore')}</h2>
        <div class="score-display">${state.quiz.score} <span class="score-divider">/</span> ${state.quiz.questions.length}</div>
        <button class="btn-primary" id="restart-quiz">${tt('quiz.tryAgain')}</button>
        <a class="btn-secondary" href="#/home" style="text-decoration: none;">${tt('quiz.backHome')}</a>
      </div>
    `;
    document.getElementById('restart-quiz').addEventListener('click', () => {
      state.quiz = buildQuiz();
      render();
    });
    return;
  }

  const q = state.quiz.questions[state.quiz.idx];
  const principle = findPrinciple(q.principleId);

  root.innerHTML = `
    <div class="quiz-progress">${state.quiz.idx + 1} / ${state.quiz.questions.length}</div>
    <div class="quiz-question">
      <div class="quiz-prompt">${tt('quiz.subtitle')}</div>
      <div class="quiz-principle">"${principle.title}"</div>
    </div>
    <div class="quiz-options">
      ${q.options.map((opt, i) => `<button class="quiz-option" data-opt="${i}">${opt}</button>`).join('')}
    </div>
    <div class="quiz-feedback hidden" id="quiz-feedback"></div>
    <div class="quiz-actions hidden" id="quiz-next-wrap" style="padding: 20px 16px 0;">
      <button class="btn-primary" id="quiz-next">${state.quiz.idx === state.quiz.questions.length - 1 ? tt('quiz.finish') : tt('quiz.next')}</button>
    </div>
  `;

  document.querySelectorAll('[data-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chosenIdx = parseInt(btn.dataset.opt);
      const chosen = q.options[chosenIdx];
      const isCorrect = chosen === q.answer;
      document.querySelectorAll('[data-opt]').forEach((b, i) => {
        b.disabled = true;
        if (q.options[i] === q.answer) b.classList.add('correct');
        if (i === chosenIdx && !isCorrect) b.classList.add('wrong');
      });
      const feedback = document.getElementById('quiz-feedback');
      feedback.classList.remove('hidden');
      feedback.textContent = isCorrect ? `✓ ${tt('quiz.correct')}` : `✗ ${tt('quiz.wasCorrect')}: ${q.answer}`;
      if (isCorrect) state.quiz.score += 1;
      document.getElementById('quiz-next-wrap').classList.remove('hidden');
    });
  });

  document.getElementById('quiz-next').addEventListener('click', () => {
    state.quiz.idx += 1;
    if (state.quiz.idx >= state.quiz.questions.length) state.quiz.done = true;
    render();
  });
}

function buildQuiz() {
  const all = state.data.collections.flatMap((c) => c.principles.map((p) => ({ ...p, company: c.company })));
  const companies = [...new Set(all.map((p) => p.company))];
  const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 10);
  const questions = shuffled.map((p) => {
    const wrong = companies.filter((c) => c !== p.company).sort(() => Math.random() - 0.5).slice(0, 2);
    const options = [p.company, ...wrong].sort(() => Math.random() - 0.5);
    return { principleId: p.id, answer: p.company, options };
  });
  return { questions, idx: 0, score: 0, done: false };
}

/* SETTINGS */
function renderSettings(root) {
  root.innerHTML = `
    <h1 class="large-title">${tt('settings.title')}</h1>

    <div class="section">
      <div class="section-header">${tt('settings.language')}</div>
      <div class="list-group">
        <div class="settings-row">
          <span class="settings-label">${tt('settings.language')}</span>
          <div class="settings-toggle">
            <button class="${state.lang === 'pl' ? 'active' : ''}" data-setlang="pl">${tt('settings.polish')}</button>
            <button class="${state.lang === 'en' ? 'active' : ''}" data-setlang="en">${tt('settings.english')}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">${tt('settings.about')}</div>
      <div class="list-group">
        <div class="about-text">${tt('settings.aboutBody')}</div>
        <a class="settings-row" href="https://principles.design/" target="_blank" rel="noopener" style="text-decoration: none;">
          <span class="settings-label">principles.design</span>
          <span class="list-row-trailing">↗</span>
        </a>
        <a class="settings-row" href="https://github.com/JuliaLuksa/principles-app" target="_blank" rel="noopener" style="text-decoration: none;">
          <span class="settings-label">${tt('settings.sourceCode')}</span>
          <span class="list-row-trailing">↗</span>
        </a>
        <div class="settings-row">
          <span class="settings-label">${tt('settings.version')}</span>
          <span class="settings-value">1.1</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="list-group">
        <button class="reset-row" id="reset-btn">${tt('settings.resetProgress')}</button>
      </div>
    </div>
  `;
  document.querySelectorAll('[data-setlang]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.setlang));
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm(tt('settings.resetConfirm'))) {
      state.progress = {};
      state.streak = { count: 0, lastDate: null };
      state.session = null;
      state.quiz = null;
      saveState();
      render();
    }
  });
}

/* INIT */
async function init() {
  loadState();
  document.documentElement.lang = state.lang;
  document.getElementById('lang-pl').setAttribute('aria-pressed', String(state.lang === 'pl'));
  document.getElementById('lang-en').setAttribute('aria-pressed', String(state.lang === 'en'));
  document.getElementById('lang-pl').addEventListener('click', () => setLang('pl'));
  document.getElementById('lang-en').addEventListener('click', () => setLang('en'));
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(state.lang, el.dataset.i18n);
  });

  try {
    const res = await fetch('./data.json');
    state.data = await res.json();
  } catch (e) {
    document.getElementById('view').innerHTML = `<p style="padding: 40px; color: var(--label-secondary);">Failed to load principles data.</p>`;
    return;
  }

  window.addEventListener('hashchange', () => {
    if (currentRoute().name !== 'daily') state.session = null;
    if (currentRoute().name !== 'quiz') state.quiz = null;
    render();
  });

  if (!window.location.hash) window.location.hash = '#/home';
  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
