// Simplified SM-2 inspired spaced repetition.
// Each card state: { id, interval (days), ease, reps, lapses, due (ISO date), state ('new'|'learning'|'review') }

const DAY = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

export function newCard(id) {
  return {
    id,
    interval: 0,
    ease: DEFAULT_EASE,
    reps: 0,
    lapses: 0,
    due: new Date().toISOString(),
    state: 'new'
  };
}

// rating: 'again' | 'good' | 'easy'
export function review(card, rating, now = new Date()) {
  const next = { ...card };
  next.reps += 1;

  if (rating === 'again') {
    next.lapses += 1;
    next.ease = Math.max(MIN_EASE, next.ease - 0.2);
    next.interval = 0;
    next.state = 'learning';
    next.due = new Date(now.getTime() + 60 * 1000).toISOString();
    return next;
  }

  if (next.state === 'new' || next.state === 'learning') {
    if (rating === 'good') {
      next.interval = next.interval === 0 ? 1 : 3;
    } else {
      next.interval = 4;
    }
    next.state = 'review';
  } else {
    // review state — graduate
    if (rating === 'good') {
      next.interval = Math.round(next.interval * next.ease);
    } else {
      next.ease += 0.15;
      next.interval = Math.round(next.interval * next.ease * 1.3);
    }
  }

  next.due = new Date(now.getTime() + next.interval * DAY).toISOString();
  return next;
}

export function isDue(card, now = new Date()) {
  return new Date(card.due) <= now;
}

export function isLearned(card) {
  return card.state === 'review' && card.interval >= 7;
}

// Build today's session: up to N new cards + all due reviews, ordered: reviews first, then new.
export function buildSession(progress, allPrincipleIds, opts = {}) {
  const { maxNew = 1, maxReviews = 20, now = new Date() } = opts;
  const cards = Object.values(progress);
  const reviews = cards.filter((c) => c.state !== 'new' && isDue(c, now)).slice(0, maxReviews);
  const seenIds = new Set(cards.map((c) => c.id));
  const newPool = allPrincipleIds.filter((id) => !seenIds.has(id)).slice(0, maxNew);
  const newCards = newPool.map((id) => newCard(id));
  return { reviews, newCards, total: reviews.length + newCards.length };
}

export function stats(progress) {
  const cards = Object.values(progress);
  return {
    total: cards.length,
    learned: cards.filter(isLearned).length,
    learning: cards.filter((c) => c.state === 'learning' || (c.state === 'review' && c.interval < 7)).length
  };
}
