// Pure flashcard mode. No spaced repetition scheduling — user controls the pace.
// Mastery levels per card:
//   0 = unseen
//   1 = learning (rated "again", will repeat in session)
//   2 = known   (rated "good")
//   3 = mastered (rated "easy")

export function newCard(id) {
  return { id, mastery: 0, timesSeen: 0, lastSeen: null };
}

// rating: 'again' | 'good' | 'easy'
export function markCard(card, rating, now = new Date()) {
  const next = { ...card };
  next.timesSeen += 1;
  next.lastSeen = now.toISOString();
  if (rating === 'again') next.mastery = 1;
  else if (rating === 'good') next.mastery = Math.max(next.mastery, 2);
  else if (rating === 'easy') next.mastery = 3;
  return next;
}

export function isMastered(card) { return card.mastery === 3; }
export function isLearning(card) { return card.mastery === 1; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a flashcard session for a collection (or all collections if collectionId === 'mix').
// Returns: { queue: [{ id, mastery, ... }], total }
export function buildSession(progress, principleIds, opts = {}) {
  const { shuffleOrder = true } = opts;
  const cards = principleIds.map((id) => progress[id] || newCard(id));
  const ordered = shuffleOrder ? shuffle(cards) : cards;
  return { queue: ordered, total: ordered.length };
}

export function stats(progress, scopeIds) {
  const ids = scopeIds || Object.keys(progress);
  const cards = ids.map((id) => progress[id]).filter(Boolean);
  return {
    total: ids.length,
    seen: cards.length,
    learning: cards.filter(isLearning).length,
    known: cards.filter((c) => c.mastery === 2).length,
    mastered: cards.filter(isMastered).length
  };
}
