import { translations, t } from './i18n.js?v=18';
import { newCard, markCard, isMastered, isLearning, buildSession, stats } from './srs.js?v=5';

const STORAGE_KEY = 'principles-app-v2';
const LEGACY_KEY = 'principles-app-v1';
const LANG_KEY = 'principles-lang';
const THEME_KEY = 'principles-theme';
const QUIZ_MODE_KEY = 'principles-quiz-mode';
const QUIZ_HISTORY_KEY = 'principles-quiz-history';

const state = {
  data: null,
  lang: localStorage.getItem(LANG_KEY) || (navigator.language?.startsWith('pl') ? 'pl' : 'en'),
  theme: localStorage.getItem(THEME_KEY) || 'auto',
  progress: {},
  streak: { count: 0, lastDate: null },
  session: null,
  quizMode: localStorage.getItem(QUIZ_MODE_KEY) || 'mix',
  quizHistory: JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || '{"last":null,"best":null,"total":0}')
};

function saveQuizMode(mode) {
  state.quizMode = mode;
  localStorage.setItem(QUIZ_MODE_KEY, mode);
}

function saveQuizResult(score) {
  state.quizHistory.last = score;
  state.quizHistory.best = Math.max(state.quizHistory.best || 0, score);
  state.quizHistory.total = (state.quizHistory.total || 0) + 1;
  localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(state.quizHistory));
}

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const resolved = theme === 'auto'
    ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  updateThemeToggleIcon();
}

function resolvedTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function updateThemeToggleIcon() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  // Show icon representing what tap WILL DO (the opposite theme).
  const isDark = resolvedTheme() === 'dark';
  btn.innerHTML = isDark ? SUN_ICON : MOON_ICON;
  btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function toggleTheme() {
  const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  render();
}

function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // migrate legacy SRS state — keep just the mastery info
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const migrated = {};
        for (const [id, c] of Object.entries(parsed.progress || {})) {
          migrated[id] = {
            id,
            mastery: c.state === 'review' && c.interval >= 7 ? 3 : (c.state === 'review' || c.state === 'learning' ? 2 : 1),
            timesSeen: c.reps || 0,
            lastSeen: c.due || null
          };
        }
        state.progress = migrated;
        state.streak = parsed.streak || { count: 0, lastDate: null };
        saveState();
        return;
      }
    }
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
  if (state.streak.lastDate === yesterday) state.streak.count += 1;
  else state.streak.count = 1;
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

function collectionIds(id) {
  if (id === 'mix') return allPrincipleIds();
  const c = state.data.collections.find((x) => x.id === id);
  if (c) return c.principles.map((p) => p.id);
  const t = state.data.themes?.find((x) => x.id === id);
  if (t) return principlesInTheme(id);
  return [];
}

function principlesInTheme(themeId) {
  const ids = [];
  for (const c of state.data.collections) {
    for (const p of c.principles) {
      if (p.themes?.includes(themeId)) ids.push(p.id);
    }
  }
  return ids;
}

function findTheme(id) { return state.data.themes?.find((t) => t.id === id); }

function findPrinciple(id) {
  for (const c of state.data.collections) {
    const p = c.principles.find((x) => x.id === id);
    if (p) return { ...p, collection: c };
  }
  return null;
}

function paragraphs(text) {
  return text.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
}

function editorialBadge(p) {
  return p.descriptionSource === 'editorial'
    ? '<span class="editorial-mark" title="Opis redakcyjny — nie verbatim z wydawcy">~</span> '
    : '';
}

function principleItem(p, { showCompany = false, sourceUrl = null, badge = '' } = {}) {
  const companyLine = showCompany ? `<div class="principle-item-company">${p.collection?.company || ''}</div>` : '';
  const sourceLine = sourceUrl ? `<div class="principle-item-meta"><a href="${sourceUrl}" target="_blank" rel="noopener">${tt('explore.readSource')} →</a></div>` : '';
  const actions = badge ? `<div class="principle-actions">${badge}<span></span></div>` : '';
  return `
    <div class="principle-item">
      ${companyLine}
      <div class="principle-item-title">${p.title}</div>
      <div class="principle-item-desc">${editorialBadge(p)}${paragraphs(p.description)}</div>
      ${sourceLine}${actions}
    </div>
  `;
}

function detailCta(href, label, count, countWord) {
  return `
    <a class="btn-primary detail-cta" href="${href}">
      <span>${label}</span>
      <span class="detail-cta-meta">${count} ${countWord} →</span>
    </a>`;
}

function masteryBadge(card) {
  if (!card) return '<span></span>';
  if (isMastered(card)) return `<span class="principle-status mastered">${tt('explore.mastered')}</span>`;
  if (isLearning(card)) return `<span class="principle-status learning">${tt('explore.learning')}</span>`;
  if (card.mastery === 2) return `<span class="principle-status">${tt('explore.learning')}</span>`;
  return '<span></span>';
}

const CHEVRON = `<svg class="chevron" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const COMPANY_MONOGRAMS = {
  'nhs': 'NHS', 'govuk': 'GOV', 'monzo': 'Mo', 'apple': 'Ap', 'material': 'Mt',
  'ibm': 'IBM', 'figma': 'Fi', 'atlassian': 'At', 'spotify': 'Sp', 'shopify': 'Sh',
  'msfluent': 'Fl', 'slack': 'Sl', 'airbnb': 'Ab', 'adobe': 'Ad', 'pinterest': 'Pi',
  'inclusive': 'IDP', 'googleai': 'GAI', 'bbc': 'BBC', 'etsy': 'Et', 'intercom': 'In',
  'usds': 'US', 'salesforce': 'Sf', 'uber': 'Ub', 'lyft': 'Ly', 'asana': 'As',
  'hubspot': 'Hu', 'sap': 'SAP', 'msai': 'MAI', 'norman': 'DN', 'maeda': 'JM',
  'unix': 'Un', 'ant': 'An', 'photon': 'Fx', 'quartz': 'Qz', 'ft': 'FT',
  'tailwind': 'Tw', 'gitlab': 'GL', 'paypal': 'PP', 'twilio': 'Pa', 'google10': 'G10',
  'facebook': 'Fb', 'ebay': 'eB', 'medium': 'Md', 'trello': 'Tr', 'mercedes': 'MB', 'rams': 'DR',
  'audi': 'Au', 'buzzfeed': 'Bz', 'cfpb': 'CFP', 'coop': 'Co', 'mapbox': 'Mb', 'line': 'LN',
  'adamsilver': 'AdS', 'bristol': 'Br', 'brainly': 'BP', 'calmtech': 'CT', 'react': 'Rc', 'telus': 'Tl', 'wikihouse': 'WH',
  'edenspiekermann': 'Ed', 'holstee': 'Ho', 'moo': 'Moo', 'orange': 'Or', 'skoda': 'Sk', 'watson': 'Wt', 'zengithub': 'Zen',
  '37signals': '37', 'autodesk': 'Atd', 'mendeley': 'Me', 'nordhealth': 'Nh', 'shneiderman': 'BS', 'sproutsocial': 'Spr', 'uswds': 'USW', 'vitaly': 'VF',
  'gelwestpac': 'GEL', 'gebruiker': 'GC', 'pair': 'GP', 'patternflyai': 'PF', 'salesforceagentic': 'SfA', 'wonderbly': 'Wo',
  'groww': 'Gw', 'html': 'HTM', 'leanstartup': 'LS', 'ns': 'NS', 'salesforcelightning': 'SfL', 'washingtonpost': 'WP',
  'android': 'And', 'domain': 'Do', 'fisherprice': 'FP', 'archlinux': 'Ar', 'thumbprint': 'Th', 'weightwatchers': 'WW',
  'amp': 'AMP', 'highways': 'HE', 'ovo': 'OVO', 'teamleader': 'Tm', 'yearclock': '10K',
  'blend': 'Bl', 'michelin': 'Mi', 'nava': 'Nv', 'occ': 'OCC', 'sunrisesolar': 'SS', 'tpx': 'TPX',
  'basis': 'Ba', 'builditgravity': 'Gr', 'duet': 'Du', 'htchero': 'HTC', 'kotti': 'Ko', 'ni': 'NI', 'txi': 'TXI',
  'codecademy': 'Cc', 'watsonibm': 'IBW', 'terraux': 'VTS', 'sustainsafety': 'SSf', 'chindogu': 'Ch', 'atlassiands': 'AtD',
  'iosux': 'iOS', 'androidwearos': 'AnW', 'fbbusiness': 'FbB', 'bbcgel': 'BcG', 'windowsux': 'Wnd', 'digitalservice': 'DSS',
  'audible': 'Aud', 'austgov': 'AuG', 'bing': 'Bi', 'cleanforest': 'CF', 'drupal': 'Dr', 'firefox': 'FF',
  'googley': 'Goo', 'grommet': 'Gmt', 'ibmsix': 'I6e', 'intuit': 'Int', 'jdanext': 'JDA', 'lullabot': 'LB',
  'mdn': 'MDN', 'msmetro': 'MSm', 'muji': 'MUJ', 'opower': 'Op', 'tivo': 'TV', 'tizen': 'Tz',
  'willem': 'WS', 'zaplabs': 'ZL', 'zappos': 'Zp',
  'nielsen': 'JN', 'solid': 'SOL', 'clearleft': 'Cl', 'dsplaybook': 'DSP', 'benbrignell': 'BB', 'codeforamerica': '21G', 'multidevice': 'Pch',
  'tognazzini': 'BT', 'googleconv': 'GoC'
};
const SUN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const CHECK_CIRCLE = `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="36" cy="36" r="32" fill="currentColor" opacity="0.15"/><path d="M22 36l11 11 18-22" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const TARGET = `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="36" cy="36" r="32" stroke="currentColor" stroke-width="3.5" fill="none" opacity="0.3"/><circle cx="36" cy="36" r="20" stroke="currentColor" stroke-width="3.5" fill="none" opacity="0.6"/><circle cx="36" cy="36" r="8" fill="currentColor"/></svg>`;

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
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

function navigate(path) { window.location.hash = path; }

function backLinkFor(route) {
  if (route.name === 'explore' && route.params[0]) {
    return { href: '#/explore', label: tt('explore.title') };
  }
  if (route.name === 'quiz' && state.quiz && !state.quiz.done) {
    return {
      href: '#/quiz',
      label: tt('quiz.title'),
      onClick: (e) => { e.preventDefault(); state.quiz = null; render(); }
    };
  }
  if (route.name === 'daily') {
    return {
      href: '#/home',
      label: tt('quiz.backHome'),
      onClick: () => { state.session = null; }
    };
  }
  return null;
}

function updateHeader(route) {
  const headerEl = document.querySelector('.app-header');
  const existingBack = headerEl.querySelector('.app-back');
  const logo = headerEl.querySelector('.app-logo');
  if (existingBack) existingBack.remove();
  const back = backLinkFor(route);
  if (back) {
    // Detail subpage — show back, hide logo
    logo.style.display = 'none';
    const a = document.createElement('a');
    a.className = 'app-back';
    a.href = back.href;
    a.innerHTML = `<span class="app-back-arrow">‹</span><span>${back.label}</span>`;
    if (back.onClick) a.addEventListener('click', back.onClick);
    headerEl.insertBefore(a, headerEl.firstChild);
  } else {
    // Home & top-level tabs — show logo for persistent brand presence
    logo.style.display = '';
  }
}

function render() {
  if (!state.data) return;
  const route = currentRoute();
  const view = document.getElementById('view');
  view.innerHTML = '';
  view.dataset.route = route.name;
  updateHeader(route);
  document.querySelectorAll('.nav-item').forEach((el) => {
    const matches = route.name === el.dataset.route || (route.name === 'home' && el.dataset.route === 'home');
    if (matches) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  const handlers = { home: renderHome, daily: renderDaily, explore: renderExplore, quiz: renderQuiz, settings: renderSettings };
  const handler = handlers[route.name] || renderHome;
  handler(view, route.params);
}

/* HOME — collection picker */
function renderHome(root) {
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'home.greetingMorning' : hour < 18 ? 'home.greetingAfternoon' : 'home.greetingEvening';

  // Suggested themes: less progress first, then more principles
  const themes = state.data.themes || [];
  const sortedThemes = [...themes].sort((a, b) => {
    const aIds = principlesInTheme(a.id);
    const bIds = principlesInTheme(b.id);
    const aSt = stats(state.progress, aIds);
    const bSt = stats(state.progress, bIds);
    const aProgress = aIds.length ? aSt.mastered / aIds.length : 0;
    const bProgress = bIds.length ? bSt.mastered / bIds.length : 0;
    if (aProgress !== bProgress) return aProgress - bProgress;
    return bIds.length - aIds.length;
  });
  const suggested = sortedThemes.slice(0, 2);

  const suggestedRows = suggested.map((t) => {
    const ids = principlesInTheme(t.id);
    const cs = stats(state.progress, ids);
    const pct = cs.total ? Math.round((cs.mastered / cs.total) * 100) : 0;
    return `
      <a class="collection-row pressable" href="#/daily/${t.id}">
        <div class="collection-content">
          <div class="collection-title">${localized(t.title)}</div>
          <div class="collection-tagline">${localized(t.tagline)}</div>
          <div class="collection-meta">${ids.length} ${tt('home.themeContains')}${cs.mastered ? ` · ${cs.mastered} ${tt('home.mastered')}` : ''}</div>
          <div class="progress-bar" style="margin-top: 10px;"><div class="progress-fill" style="width: ${pct}%"></div></div>
        </div>
        ${CHEVRON}
      </a>
    `;
  }).join('');

  const totalPrinciples = allPrincipleIds().length;
  const mixSub = tt('home.mixCtaSub').replace('{n}', String(totalPrinciples));

  root.innerHTML = `
    <h1 class="large-title">${tt(greetingKey)}</h1>
    <p class="large-title-subtitle">${tt('tagline')}</p>

    <div class="section">
      <a class="mix-cta" href="#/daily/mix">
        <div class="mix-cta-stat">
          <span class="mix-cta-stat-label">PRINCIPLES</span>
          <span class="mix-cta-stat-num">${totalPrinciples}</span>
        </div>
        <div class="mix-cta-content">
          <div class="mix-cta-label">${tt('home.mixCtaLabel')}</div>
          <div class="mix-cta-title">${tt('home.mixCta')}</div>
          <div class="mix-cta-sub">${mixSub} →</div>
        </div>
      </a>
    </div>

    <div class="section">
      <div class="section-header">${tt('home.suggestedThemes')}</div>
      <div class="list-group">
        ${suggestedRows}
      </div>
    </div>

    <div class="section">
      <a class="all-themes-link" href="#/explore">${tt('home.allThemesLink')}</a>
    </div>

    <div class="attribution-footer">
      ${tt('attribution.via')} <a href="https://principles.design/" target="_blank" rel="noopener">principles.design</a> ${tt('attribution.and')}.
    </div>
  `;
}

/* DAILY — study session for a collection */
function renderDaily(root, params) {
  const collectionId = params[0];

  if (!collectionId) {
    root.innerHTML = `
      <div class="empty-state">
        <h2>${tt('daily.pickFirst')}</h2>
        <p>${tt('daily.pickFirstSub')}</p>
        <a class="btn-primary" href="#/home" style="text-decoration: none;">${tt('daily.backHome')}</a>
      </div>
    `;
    return;
  }

  if (!state.session || state.session.collectionId !== collectionId) {
    const ids = collectionIds(collectionId);
    if (ids.length === 0) { navigate('/home'); return; }
    const built = buildSession(state.progress, ids);
    state.session = {
      queue: built.queue,
      total: built.total,
      collectionId,
      summary: { again: 0, good: 0, easy: 0 }
    };
  }

  if (state.session.queue.length === 0) {
    bumpStreak();
    const sum = state.session.summary;
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${CHECK_CIRCLE}</div>
        <h2>${tt('daily.sessionComplete')}</h2>
        <p>${tt('daily.sessionCompleteSub')}</p>
        <div class="session-summary session-summary-2">
          <div class="summary-tile">
            <div class="summary-value">${sum.again}</div>
            <div class="summary-label">${tt('daily.again')}</div>
          </div>
          <div class="summary-tile">
            <div class="summary-value">${sum.easy}</div>
            <div class="summary-label">${tt('daily.easy')}</div>
          </div>
        </div>
        <button class="btn-primary" id="study-again-btn">${tt('daily.studyAgain')}</button>
        <a class="btn-secondary" href="#/home" style="text-decoration: none;">${tt('daily.backHome')}</a>
      </div>
    `;
    document.getElementById('study-again-btn').addEventListener('click', () => {
      state.session = null;
      render();
    });
    return;
  }

  const card = state.session.queue[0];
  const principle = findPrinciple(card.id);
  if (!principle) {
    state.session.queue.shift();
    renderDaily(root, params);
    return;
  }

  const done = state.session.total - state.session.queue.length;
  const progress = (done / state.session.total) * 100;

  root.innerHTML = `
    <div class="session-progress">
      <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
      <span>${done}/${state.session.total}</span>
    </div>
    <div class="card">
      <div class="card-company">${principle.collection.company}</div>
      <div class="card-title">${principle.title}</div>
      <div class="card-description hidden" id="card-desc">${editorialBadge(principle)}${paragraphs(principle.description)}</div>
      <div class="card-source hidden" id="card-source">
        ${tt('daily.source')}: <a href="${principle.collection.sourceUrl}" target="_blank" rel="noopener">${principle.collection.company}</a>
        · ${tt('daily.via')} <a href="${principle.collection.viaUrl}" target="_blank" rel="noopener">principles.design</a>
      </div>
    </div>
    <div class="reveal-wrap">
      <button class="btn-primary" id="reveal-btn">${tt('daily.reveal')}</button>
    </div>
    <div class="rating-section hidden" id="rating-section">
      <div class="rating-buttons">
        <button class="btn-again" data-rating="again">${tt('daily.again')}</button>
        <button class="btn-easy" data-rating="easy">${tt('daily.easy')}</button>
      </div>
    </div>
  `;

  document.getElementById('reveal-btn').addEventListener('click', () => {
    document.getElementById('card-desc').classList.remove('hidden');
    document.getElementById('card-source').classList.remove('hidden');
    document.querySelector('.reveal-wrap').classList.add('hidden');
    document.getElementById('rating-section').classList.remove('hidden');
  });

  document.querySelectorAll('[data-rating]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rating = btn.dataset.rating;
      const updated = markCard(card, rating);
      state.progress[updated.id] = updated;
      saveState();
      state.session.summary[rating] += 1;
      state.session.queue.shift();
      if (rating === 'again') {
        // Re-insert in the middle of the queue — gives breathing room
        // before showing this card again, not at the very end
        const remaining = state.session.queue.length;
        const offset = Math.min(5, Math.max(2, Math.floor(remaining / 2)));
        state.session.queue.splice(offset, 0, updated);
        state.session.total += 1;
      }
      render();
    });
  });
}

/* EXPLORE */
function renderExplore(root, params) {
  if (params[0]) return renderDetail(root, params[0]);

  const view = state.exploreView || 'themes';

  const themeRows = (state.data.themes || []).map((t) => {
    const ids = principlesInTheme(t.id);
    return `
      <a class="collection-row pressable" href="#/explore/${t.id}">
        <div class="collection-content">
          <div class="collection-title">${localized(t.title)}</div>
          <div class="collection-tagline">${localized(t.tagline)}</div>
          <div class="collection-meta">${ids.length} ${tt('home.themeContains')}</div>
        </div>
        ${CHEVRON}
      </a>
    `;
  }).join('');

  function companyTile(c) {
    const tagline = c.tagline ? localized(c.tagline) : c.company;
    const mono = COMPANY_MONOGRAMS[c.id] || c.company.charAt(0);
    return `
      <a class="collection-row pressable" href="#/explore/${c.id}">
        <div class="collection-monogram">${mono}</div>
        <div class="collection-content">
          <div class="collection-title">${c.company}</div>
          <div class="collection-tagline">${tagline}</div>
          <div class="collection-meta">${c.principles.length} ${tt('explore.principles')}</div>
        </div>
        ${CHEVRON}
      </a>
    `;
  }

  const sortedCompanies = [...state.data.collections].sort((a, b) => a.company.localeCompare(b.company, state.lang));
  const letterGroups = {};
  for (const c of sortedCompanies) {
    const letter = c.company.charAt(0).toUpperCase();
    (letterGroups[letter] = letterGroups[letter] || []).push(c);
  }
  const companySections = Object.entries(letterGroups).map(([letter, list]) => `
    <div class="section letter-section">
      <div class="letter-header">${letter}</div>
      <div class="list-group">${list.map(companyTile).join('')}</div>
    </div>
  `).join('');

  const themesContent = `<div class="section"><div class="list-group">${themeRows}</div></div>`;

  root.innerHTML = `
    <h1 class="large-title">${tt('explore.title')}</h1>
    <p class="large-title-subtitle">${tt('explore.subtitle')}</p>

    <div class="explore-toggle">
      <button class="${view === 'themes' ? 'active' : ''}" data-view="themes">${tt('explore.themes')}</button>
      <button class="${view === 'companies' ? 'active' : ''}" data-view="companies">${tt('explore.companies')}</button>
    </div>

    ${view === 'themes' ? themesContent : companySections}
  `;

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.exploreView = btn.dataset.view;
      render();
    });
  });
}

function renderDetail(root, id) {
  const theme = findTheme(id);
  if (theme) return renderThemeDetail(root, theme);
  const company = state.data.collections.find((c) => c.id === id);
  if (company) return renderCollection(root, id);
  navigate('/explore');
}

function renderThemeDetail(root, theme) {
  const ids = principlesInTheme(theme.id);
  const items = ids.map((pid) => {
    const principle = findPrinciple(pid);
    if (!principle) return '';
    return principleItem(principle, { showCompany: true, sourceUrl: principle.collection.sourceUrl });
  }).join('');

  root.innerHTML = `
    <h1 class="large-title">${localized(theme.title)}</h1>
    <p class="large-title-subtitle">${localized(theme.tagline)}</p>

    <div class="section">${detailCta(`#/daily/${theme.id}`, tt('daily.studyCta'), ids.length, tt('home.themeContains'))}</div>

    <div class="section collection-detail">
      <div class="list-group">${items}</div>
    </div>
  `;
}

function renderCollection(root, collectionId) {
  const c = state.data.collections.find((x) => x.id === collectionId);
  if (!c) { navigate('/explore'); return; }

  const items = c.principles.map((p) =>
    principleItem(p, { badge: masteryBadge(state.progress[p.id]) })
  ).join('');

  const subtitle = c.tagline ? localized(c.tagline) : (c.description ? localized(c.description) : '');
  root.innerHTML = `
    <h1 class="large-title">${c.company}</h1>
    <p class="large-title-subtitle">${subtitle}</p>

    <div class="section">${detailCta(`#/daily/${c.id}`, tt('daily.studyCta'), c.principles.length, tt('explore.principles'))}</div>

    <div class="section collection-detail">
      <div class="list-group">${items}</div>
    </div>

    <div class="section">
      <div class="section-footer">
        <a href="${c.sourceUrl}" target="_blank" rel="noopener">${tt('explore.readSource')} →</a>
      </div>
    </div>
  `;
}

/* QUIZ */
function renderQuiz(root) {
  if (!state.quiz) {
    const totalFirms = state.data.collections.length;
    const totalPrinciples = allPrincipleIds().length;
    const history = state.quizHistory || {};
    const hasHistory = history.last !== null && history.last !== undefined;
    const modes = [
      { id: 'firma', title: tt('quiz.modeFirma'), sub: tt('quiz.modeFirmaSub') },
      { id: 'temat', title: tt('quiz.modeTemat'), sub: tt('quiz.modeTematSub') },
      { id: 'mix', title: tt('quiz.modeMix'), sub: tt('quiz.modeMixSub') }
    ];
    const modeRows = modes.map((m) => `
      <div class="list-row pressable mode-row" data-mode="${m.id}">
        <div class="list-row-content">
          <div class="list-row-title">${m.title}</div>
          <div class="list-row-subtitle">${m.sub}</div>
        </div>
        <div class="mode-radio${state.quizMode === m.id ? ' active' : ''}"></div>
      </div>
    `).join('');

    const firmsLabel = state.lang === 'pl' ? 'firm' : 'firms';
    const principlesLabel = state.lang === 'pl' ? 'zasad' : 'principles';

    // Top 3 themes by principle count for themed quiz tiles
    const themedThemes = [...state.data.themes]
      .map((th) => ({ ...th, count: principlesInTheme(th.id).length }))
      .filter((th) => th.count >= 5) // need at least 5 principles for a meaningful quiz
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const themedRows = themedThemes.map((th) => `
      <a class="collection-row pressable" href="javascript:void(0)" data-theme-quiz="${th.id}">
        <div class="collection-content">
          <div class="collection-title">${localized(th.title)}</div>
          <div class="collection-tagline">${localized(th.tagline)}</div>
          <div class="collection-meta">${th.count} ${principlesLabel}</div>
        </div>
        ${CHEVRON}
      </a>
    `).join('');

    root.innerHTML = `
      <h1 class="large-title">${tt('quiz.title')}</h1>
      <p class="large-title-subtitle">${tt('quiz.subtitle')}</p>

      <div class="section quiz-config-section">
        <div class="section-header">${tt('quiz.allHeader')}</div>
        <div class="list-group">${modeRows}</div>
        <button class="btn-primary quiz-start-btn" id="start-quiz">${tt('quiz.start')} →</button>
      </div>

      <div class="section">
        <div class="section-header">${tt('quiz.themedHeader')}</div>
        <div class="list-group">
          ${themedRows}
        </div>
      </div>

      ${hasHistory ? `
      <div class="section">
        <div class="section-header">${tt('quiz.historyHeader')}</div>
        <div class="stats-grid">
          <div class="stat-card-large">
            <div class="stat-card-number">${history.last}<span class="stat-card-divider">/10</span></div>
            <div class="stat-card-caption">${tt('quiz.lastScore')}</div>
          </div>
          <div class="stat-card-large">
            <div class="stat-card-number">${history.best}<span class="stat-card-divider">/10</span></div>
            <div class="stat-card-caption">${tt('quiz.bestScore')}</div>
          </div>
        </div>
      </div>
      ` : ''}
    `;

    document.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        saveQuizMode(btn.dataset.mode);
        render();
      });
    });
    document.getElementById('start-quiz').addEventListener('click', () => {
      state.quiz = buildQuiz(state.quizMode);
      render();
    });
    document.querySelectorAll('[data-theme-quiz]').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.preventDefault();
        const themeId = row.dataset.themeQuiz;
        state.quiz = buildQuiz('firma', themeId);
        render();
      });
    });
    return;
  }

  if (state.quiz.done) {
    if (!state.quiz.saved) {
      saveQuizResult(state.quiz.score);
      state.quiz.saved = true;
    }
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${TARGET}</div>
        <h2>${tt('quiz.yourScore')}</h2>
        <p class="score-display">${state.quiz.score} <span class="score-divider">/</span> ${state.quiz.questions.length}</p>
        <button class="btn-primary" id="restart-quiz">${tt('quiz.tryAgain')}</button>
        <a class="btn-secondary" href="#/home" style="text-decoration: none;">${tt('quiz.backHome')}</a>
      </div>
    `;
    const prevThemeId = state.quiz.themeId || null;
    document.getElementById('restart-quiz').addEventListener('click', () => {
      state.quiz = buildQuiz(prevThemeId ? 'firma' : state.quizMode, prevThemeId);
      render();
    });
    return;
  }

  const q = state.quiz.questions[state.quiz.idx];
  const principle = findPrinciple(q.principleId);

  root.innerHTML = `
    <div class="quiz-progress">${state.quiz.idx + 1} / ${state.quiz.questions.length}</div>
    <div class="quiz-question">
      <div class="quiz-prompt">${q.prompt}</div>
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

function buildQuiz(mode = 'mix', themeId = null) {
  let all = state.data.collections.flatMap((c) => c.principles.map((p) => ({ ...p, company: c.company })));
  if (themeId) {
    all = all.filter((p) => p.themes && p.themes.includes(themeId));
    mode = 'firma'; // themed quiz always = firma mode (temat would be trivial)
  }
  const companies = [...new Set(all.map((p) => p.company))];
  // Filter to principles that have at least one theme (for temat mode safety)
  const pool = mode === 'firma' ? all : all.filter((p) => p.themes && p.themes.length > 0);
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(10, pool.length));

  const promptFirma = t(state.lang, 'quiz.promptFirma');
  const promptTemat = t(state.lang, 'quiz.promptTemat');

  const questions = shuffled.map((p) => {
    const qMode = mode === 'mix' ? (Math.random() < 0.5 ? 'firma' : 'temat') : mode;

    if (qMode === 'firma') {
      const wrong = companies.filter((c) => c !== p.company).sort(() => Math.random() - 0.5).slice(0, 2);
      const options = [p.company, ...wrong].sort(() => Math.random() - 0.5);
      return { type: 'firma', principleId: p.id, answer: p.company, options, prompt: promptFirma };
    }

    // temat mode
    const principleThemes = p.themes || [];
    const correctThemeId = principleThemes[Math.floor(Math.random() * principleThemes.length)];
    const correctTheme = state.data.themes.find((th) => th.id === correctThemeId);
    if (!correctTheme) {
      // Fallback to firma if theme missing
      const wrong = companies.filter((c) => c !== p.company).sort(() => Math.random() - 0.5).slice(0, 2);
      const options = [p.company, ...wrong].sort(() => Math.random() - 0.5);
      return { type: 'firma', principleId: p.id, answer: p.company, options, prompt: promptFirma };
    }
    const wrongThemes = state.data.themes
      .filter((th) => !principleThemes.includes(th.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    const themeOpts = [correctTheme, ...wrongThemes].sort(() => Math.random() - 0.5);
    const options = themeOpts.map((th) => localized(th.title));
    const answer = localized(correctTheme.title);
    return { type: 'temat', principleId: p.id, answer, options, prompt: promptTemat };
  });
  return { questions, idx: 0, score: 0, done: false, themeId };
}

/* SETTINGS */
function renderSettings(root) {
  const stats = (() => {
    const cols = state.data.collections;
    const total = cols.reduce((s, c) => s + c.principles.length, 0);
    const editorial = cols.reduce((s, c) => s + c.principles.filter((p) => p.descriptionSource === 'editorial').length, 0);
    const verbatimPct = total > 0 ? Math.round(((total - editorial) / total) * 100) : 0;
    return {
      collections: cols.length,
      principles: total,
      themes: state.data.themes.length,
      verbatim: verbatimPct
    };
  })();
  root.innerHTML = `
    <h1 class="large-title">${tt('settings.title')}</h1>
    <p class="large-title-subtitle">${tt('settings.subtitle')}</p>

    <div class="section">
      <div class="section-header">${tt('settings.library')}</div>
      <div class="list-group">
        <div class="lib-stats">
          <div class="lib-stat">
            <div class="lib-stat-num">${stats.collections}</div>
            <div class="lib-stat-label">${tt('settings.libCollections')}</div>
          </div>
          <div class="lib-stat">
            <div class="lib-stat-num">${stats.principles}</div>
            <div class="lib-stat-label">${tt('settings.libPrinciples')}</div>
          </div>
          <div class="lib-stat">
            <div class="lib-stat-num">${stats.themes}</div>
            <div class="lib-stat-label">${tt('settings.libThemes')}</div>
          </div>
          <div class="lib-stat">
            <div class="lib-stat-num">${stats.verbatim}%</div>
            <div class="lib-stat-label">${tt('settings.libVerbatim')}</div>
          </div>
        </div>
        <div class="lib-body">
          <p>${tt('settings.libBody')}</p>
          <p>${tt('settings.libEditorial')}</p>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">${tt('settings.preferences')}</div>
      <div class="list-group">
        <div class="settings-row">
          <span class="settings-label">${tt('settings.language')}</span>
          <div class="settings-toggle">
            <button class="${state.lang === 'pl' ? 'active' : ''}" data-setlang="pl">${tt('settings.polish')}</button>
            <button class="${state.lang === 'en' ? 'active' : ''}" data-setlang="en">${tt('settings.english')}</button>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-label">${tt('settings.theme')}</span>
          <div class="settings-toggle">
            <button class="${state.theme === 'auto' ? 'active' : ''}" data-settheme="auto">${tt('settings.themeAuto')}</button>
            <button class="${state.theme === 'light' ? 'active' : ''}" data-settheme="light">${tt('settings.themeLight')}</button>
            <button class="${state.theme === 'dark' ? 'active' : ''}" data-settheme="dark">${tt('settings.themeDark')}</button>
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
          <span class="settings-value">2.0</span>
        </div>
      </div>
      <div class="section-footer">
        ${tt('settings.createdBy')} <a href="https://github.com/JuliaLuksa" target="_blank" rel="noopener">Julia Luksa</a>
      </div>
    </div>

    <div class="section">
      <div class="list-group">
        <button class="reset-row" id="reset-btn">${tt('settings.resetProgress')}</button>
      </div>
    </div>
  `;
  document.querySelectorAll('[data-setlang]').forEach((btn) => btn.addEventListener('click', () => setLang(btn.dataset.setlang)));
  document.querySelectorAll('[data-settheme]').forEach((btn) => btn.addEventListener('click', () => { applyTheme(btn.dataset.settheme); render(); }));
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
  applyTheme(state.theme);
  document.documentElement.lang = state.lang;
  updateThemeToggleIcon();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  // Watch for system theme changes — update icon if user is in auto mode.
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
      if (state.theme === 'auto') applyTheme('auto');
    });
  }
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(state.lang, el.dataset.i18n);
  });

  try {
    const res = await fetch('./data.json', { cache: 'no-store' });
    state.data = await res.json();
  } catch (e) {
    document.getElementById('view').innerHTML = `<p style="padding: 40px; color: var(--label-secondary);">Failed to load principles data.</p>`;
    return;
  }

  window.addEventListener('hashchange', () => {
    const r = currentRoute();
    if (r.name !== 'daily') state.session = null;
    if (r.name !== 'quiz') state.quiz = null;
    render();
  });

  if (!window.location.hash) window.location.hash = '#/home';
  render();

  // Only register service worker on production (HTTPS, not localhost) to avoid dev cache headaches.
  const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname) || location.hostname.startsWith('192.168.') || location.hostname.endsWith('.local');
  if ('serviceWorker' in navigator && !isLocalhost) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
